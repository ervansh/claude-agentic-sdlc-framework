import request from "supertest";
import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { mockOrders } from "../../src/data/mockOrders.js";
import { createApp } from "../../src/web/app.js";
import { NOT_FOUND_MESSAGE, registerRoutes } from "../../src/web/routes.js";

const app = () => createApp({ repository: new MockOrderRepository(), registerRoutes });
const known = mockOrders[0]!;

// Smoke checks only; full suites are IMP-009, IMP-010 and IMP-012.
describe("routes smoke", () => {
  it("GET / renders the form", async () => {
    const res = await request(app()).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain('<form method="post" action="/track"');
    expect(res.text).toContain("Last name (optional)");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("POST valid order returns the tracking view without the last name", async () => {
    const res = await request(app())
      .post("/track")
      .type("form")
      .send({ orderNumber: known.orderId, lastName: known.customerLastName });
    expect(res.status).toBe(200);
    expect(res.text).toContain(known.orderId);
    expect(res.text.toLowerCase()).not.toContain(known.customerLastName.toLowerCase());
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("POST unknown order returns the generic message with status 200", async () => {
    const res = await request(app()).post("/track").type("form").send({ orderNumber: "ORD0000000" });
    expect(res.status).toBe(200);
    expect(res.text).toContain(NOT_FOUND_MESSAGE);
    expect(res.text).toContain('role="alert"');
  });

  it("POST missing and malformed order numbers show static messages", async () => {
    const missing = await request(app()).post("/track").type("form").send({ orderNumber: "  " });
    expect(missing.status).toBe(200);
    expect(missing.text).toContain("Order number is required.");
    const bad = await request(app()).post("/track").type("form").send({ orderNumber: "<b>x</b>" });
    expect(bad.status).toBe(200);
    expect(bad.text).toContain("exactly seven digits");
    expect(bad.text).not.toContain("<b>x</b>");
  });

  it("ignores identifiers in the query string", async () => {
    const res = await request(app()).get(`/track?orderNumber=${known.orderId}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain(`value="${known.orderId}"`);
  });
});
