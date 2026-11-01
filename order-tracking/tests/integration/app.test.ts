import request from "supertest";
import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { createApp } from "../../src/web/app.js";
import { createLogger } from "../../src/web/logger.js";

const repository = new MockOrderRepository();

describe("app shell", () => {
  it("GET /healthz returns 200 with no order data", async () => {
    const res = await request(createApp({ repository })).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.text).not.toMatch(/ORD\d{7}/);
  });

  it("sets helmet headers including CSP, HSTS and Referrer-Policy no-referrer", async () => {
    const res = await request(createApp({ repository })).get("/healthz");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects an oversized body with a generic page", async () => {
    const res = await request(createApp({ repository }))
      .post("/anything")
      .type("form")
      .send(`orderNumber=${"A".repeat(10_000)}`);
    expect(res.status).toBe(413);
    expect(res.text).not.toMatch(/PayloadTooLarge|request entity too large|at .*\.js/i);
  });

  it("returns a generic error page with no stack trace on internal error", async () => {
    const lines: string[] = [];
    const app = createApp({
      repository,
      logger: createLogger((l) => lines.push(l)),
      registerRoutes: (a) => {
        a.get("/boom", () => {
          throw new Error("secret-internal-detail ORD1234567");
        });
      },
    });
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.text).toContain("Something went wrong");
    expect(res.text).not.toContain("secret-internal-detail");
    expect(res.text).not.toContain("ORD1234567");
    expect(res.text).not.toMatch(/\bat\s.+\(.+:\d+:\d+\)/);
    expect(lines).toHaveLength(1);
    expect(lines.join("\n")).not.toContain("secret-internal-detail");
  });

  it("returns a generic 404 page", async () => {
    const res = await request(createApp({ repository })).get("/nope");
    expect(res.status).toBe(404);
    expect(res.text).toContain("Something went wrong");
  });

  it("redirects HTTP to HTTPS only when behind a proxy, exempting /healthz", async () => {
    const plain = await request(createApp({ repository })).get("/nope");
    expect(plain.status).toBe(404);

    const proxied = createApp({ repository, behindProxy: true });
    const redirected = await request(proxied).get("/nope").set("X-Forwarded-Proto", "http");
    expect(redirected.status).toBe(308);
    expect(redirected.headers.location).toMatch(/^https:\/\//);
    const secure = await request(proxied).get("/nope").set("X-Forwarded-Proto", "https");
    expect(secure.status).toBe(404);
    const health = await request(proxied).get("/healthz").set("X-Forwarded-Proto", "http");
    expect(health.status).toBe(200);
  });

  it("generates a distinct server-side request ID per request", async () => {
    const ids: string[] = [];
    const app = createApp({
      repository,
      registerRoutes: (a) => {
        a.get("/id", (_req, res) => {
          ids.push(String(res.locals.requestId));
          res.end();
        });
      },
    });
    await request(app).get("/id").set("X-Request-Id", "client-supplied");
    await request(app).get("/id");
    expect(ids[0]).not.toBe("client-supplied");
    expect(ids[0]).not.toBe(ids[1]);
  });
});
