import request from "supertest";
import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { createApp } from "../../src/web/app.js";
import { registerRoutes } from "../../src/web/routes.js";
import {
  DEFAULT_THROTTLE_MAX,
  DEFAULT_THROTTLE_WINDOW_MS,
  getThrottleOptions,
  withThrottle,
} from "../../src/web/throttle.js";

function appWith(max: number, now?: () => number) {
  return createApp({
    repository: new MockOrderRepository(),
    registerRoutes: withThrottle(registerRoutes, { max, windowMs: 1000, now }),
  });
}

const body = { orderNumber: "ORD0000000", lastName: "Nobody" };

describe("per-IP throttling", () => {
  it("throttles requests above the limit with a generic response", async () => {
    const app = appWith(2);
    expect((await request(app).post("/track").type("form").send(body)).status).toBe(200);
    expect((await request(app).post("/track").type("form").send(body)).status).toBe(200);
    const res = await request(app).post("/track").type("form").send(body);
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("throttled response has no order data and is identical regardless of input", async () => {
    const app = appWith(0 + 1);
    await request(app).post("/track").type("form").send(body);
    const a = await request(app).post("/track").type("form").send(body);
    const b = await request(app).post("/track").type("form").send({ orderNumber: "x", lastName: "y" });
    expect(a.status).toBe(429);
    expect(a.text).toBe(b.text);
    expect(a.text).not.toMatch(/ORD\d{7}|Nobody|not found|status/i);
  });

  it("resets after the window", async () => {
    let t = 0;
    const app = appWith(1, () => t);
    await request(app).post("/track").type("form").send(body);
    expect((await request(app).post("/track").type("form").send(body)).status).toBe(429);
    t = 1001;
    expect((await request(app).post("/track").type("form").send(body)).status).toBe(200);
  });

  it("does not throttle GET /track or /healthz", async () => {
    const app = appWith(1);
    for (let i = 0; i < 5; i++) {
      expect((await request(app).get("/track")).status).toBe(200);
      expect((await request(app).get("/healthz")).status).toBe(200);
    }
  });

  it("does not alter non-throttled lookup output", async () => {
    const plain = createApp({ repository: new MockOrderRepository(), registerRoutes });
    const throttled = appWith(100);
    const a = await request(plain).post("/track").type("form").send(body);
    const b = await request(throttled).post("/track").type("form").send(body);
    expect(b.status).toBe(a.status);
    expect(b.text).toBe(a.text);
  });

  it("uses safe defaults and ignores invalid env values", () => {
    expect(getThrottleOptions({})).toEqual({ max: DEFAULT_THROTTLE_MAX, windowMs: DEFAULT_THROTTLE_WINDOW_MS });
    expect(getThrottleOptions({ THROTTLE_MAX: "abc", THROTTLE_WINDOW_MS: "-5" })).toEqual({
      max: DEFAULT_THROTTLE_MAX,
      windowMs: DEFAULT_THROTTLE_WINDOW_MS,
    });
    expect(getThrottleOptions({ THROTTLE_MAX: "5", THROTTLE_WINDOW_MS: "2000" })).toEqual({ max: 5, windowMs: 2000 });
  });
});
