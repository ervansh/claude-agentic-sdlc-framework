import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { mockOrders } from "../../src/data/mockOrders.js";

describe("MockOrderRepository (Q-004, FR-5, FR-3)", () => {
  const repo = new MockOrderRepository();

  it("Q-004: known id returns the order", async () => {
    const order = await repo.findByOrderId("ORD1000001");
    expect(order?.orderId).toBe("ORD1000001");
    expect(order?.customerLastName).toBe("Smith");
  });

  it("Q-004: unknown id returns undefined", async () => {
    expect(await repo.findByOrderId("ORD9999999")).toBeUndefined();
  });

  it("Q-004: fixture has at least 5 orders", () => {
    expect(mockOrders.length).toBeGreaterThanOrEqual(5);
  });

  it("FR-5: fixture covers every status", () => {
    const statuses = new Set(mockOrders.map((o) => o.status));
    for (const s of ["PLACED", "PROCESSING", "SHIPPED", "DELIVERED"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
  });

  it("FR-3: fixture has a shared last name across orders", () => {
    const names = mockOrders.map((o) => o.customerLastName.toLowerCase());
    expect(new Set(names).size).toBeLessThan(names.length);
  });

  it("FR-3: fixture has a mixed-case last name", () => {
    expect(
      mockOrders.some((o) => o.customerLastName !== o.customerLastName.toLowerCase()),
    ).toBe(true);
  });

  it("FR-5: fixture exercises optional dates", () => {
    expect(mockOrders.some((o) => o.dates.estimatedDelivery === undefined)).toBe(true);
    expect(mockOrders.some((o) => o.dates.delivered !== undefined)).toBe(true);
  });

  it("Q-004: all ids match ORD####### and are unique", () => {
    for (const o of mockOrders) expect(o.orderId).toMatch(/^ORD[0-9]{7}$/);
    expect(new Set(mockOrders.map((o) => o.orderId)).size).toBe(mockOrders.length);
  });
});
