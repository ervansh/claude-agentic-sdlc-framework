import { describe, expect, it } from "vitest";
import { mockOrders } from "../../src/data/mockOrders.js";
import { toTrackingView } from "../../src/domain/toTrackingView.js";

describe("toTrackingView", () => {
  it("returns exactly orderId, status, items, dates", () => {
    for (const order of mockOrders) {
      const view = toTrackingView(order);
      expect(Object.keys(view).sort()).toEqual(["dates", "items", "orderId", "status"]);
    }
  });

  it("does not leak the customer last name anywhere in the serialized view", () => {
    for (const order of mockOrders) {
      const json = JSON.stringify(toTrackingView(order)).toLowerCase();
      expect(json).not.toContain(order.customerLastName.toLowerCase());
      expect(json).not.toContain("customerlastname");
    }
  });

  it("maps values and preserves optional dates", () => {
    const delivered = mockOrders.find((o) => o.status === "DELIVERED")!;
    const view = toTrackingView(delivered);
    expect(view.orderId).toBe(delivered.orderId);
    expect(view.status).toBe("DELIVERED");
    expect(view.dates).toEqual(delivered.dates);
    expect(view.items).toEqual(delivered.items);
    const placed = mockOrders.find((o) => o.status === "PLACED")!;
    expect(toTrackingView(placed).dates.delivered).toBeUndefined();
  });

  it("does not alias the source order's items or dates", () => {
    const order = mockOrders[0]!;
    const view = toTrackingView(order);
    expect(view.items).not.toBe(order.items);
    expect(view.items[0]).not.toBe(order.items[0]);
    expect(view.dates).not.toBe(order.dates);
  });
});
