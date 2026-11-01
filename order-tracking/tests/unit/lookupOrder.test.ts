import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Order, OrderRepository } from "../../src/data/OrderRepository.js";
import { mockOrders } from "../../src/data/mockOrders.js";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { lookupOrder } from "../../src/domain/lookupOrder.js";
import type {
  FormatError,
  LookupResult,
  MissingInput,
  NotFoundOrNotValidated,
} from "../../src/domain/types.js";

function spyRepo() {
  const inner = new MockOrderRepository(mockOrders);
  const findByOrderId = vi.fn((id: string) => inner.findByOrderId(id));
  const repo: OrderRepository = { findByOrderId };
  return { repo, findByOrderId };
}

const SMITH_ORDER = "ORD1000001";

describe("lookupOrder", () => {
  it("succeeds with matching last name", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: "Smith" });
    expect(r.kind).toBe("Success");
    if (r.kind === "Success") expect(r.view.orderId).toBe(SMITH_ORDER);
  });

  it("succeeds without last name (order-number-only, A-1)", async () => {
    const { repo } = spyRepo();
    expect((await lookupOrder(repo, { orderNumber: SMITH_ORDER })).kind).toBe("Success");
    expect((await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: null })).kind).toBe(
      "Success",
    );
  });

  it("treats whitespace-only last name as omitted", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: "   " });
    expect(r.kind).toBe("Success");
  });

  it("returns NotFoundOrNotValidated on last-name mismatch", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: "Jones" });
    expect(r).toEqual({ kind: "NotFoundOrNotValidated" });
  });

  it("returns the same result for unknown order and mismatch", async () => {
    const { repo } = spyRepo();
    const unknown = await lookupOrder(repo, { orderNumber: "ORD9999999", lastName: "Smith" });
    const mismatch = await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: "Jones" });
    expect(unknown).toEqual({ kind: "NotFoundOrNotValidated" });
    expect(unknown).toEqual(mismatch);
    const unknownNoName = await lookupOrder(repo, { orderNumber: "ORD9999999" });
    expect(unknownNoName).toEqual({ kind: "NotFoundOrNotValidated" });
  });

  it("returns MissingInput for empty and whitespace-only order number", async () => {
    const { repo } = spyRepo();
    for (const orderNumber of ["", "   ", null, undefined]) {
      const r = await lookupOrder(repo, { orderNumber, lastName: "Smith" });
      expect(r).toEqual({ kind: "MissingInput", field: "orderNumber" });
    }
  });

  it("returns FormatError for malformed order numbers", async () => {
    const { repo } = spyRepo();
    for (const orderNumber of ["ORD123", "ORD12345678", "XYZ1234567", "ORD12A4567", "ORD--1000001", "ORD  1000001"]) {
      const r = await lookupOrder(repo, { orderNumber });
      expect(r).toEqual({ kind: "FormatError" });
    }
  });

  it("FR-10: makes zero repository calls for MissingInput and FormatError", async () => {
    const { repo, findByOrderId } = spyRepo();
    await lookupOrder(repo, { orderNumber: "" });
    await lookupOrder(repo, { orderNumber: "   " });
    await lookupOrder(repo, { orderNumber: "bad" });
    await lookupOrder(repo, { orderNumber: "ORD--1000001" });
    expect(findByOrderId).not.toHaveBeenCalled();
    await lookupOrder(repo, { orderNumber: SMITH_ORDER });
    expect(findByOrderId).toHaveBeenCalledTimes(1);
    expect(findByOrderId).toHaveBeenCalledWith(SMITH_ORDER);
  });

  it("AC-4: normalization variants succeed", async () => {
    const { repo } = spyRepo();
    for (const orderNumber of ["ord1000001", "ord-1000001", " ORD 1000001 ", "ORD-1000001"]) {
      const r = await lookupOrder(repo, { orderNumber, lastName: "  SMITH " });
      expect(r.kind).toBe("Success");
    }
  });

  it("matches a mixed-case stored last name case-insensitively", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: "ORD1000003", lastName: "mcdonald-RIVERA" });
    expect(r.kind).toBe("Success");
  });

  it("does not let a shared last name cross orders", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: "ORD1000002", lastName: "Smith" });
    expect(r.kind).toBe("NotFoundOrNotValidated");
  });

  it("success view contains no last name", async () => {
    const { repo } = spyRepo();
    const r = await lookupOrder(repo, { orderNumber: SMITH_ORDER, lastName: "Smith" });
    expect(JSON.stringify(r).toLowerCase()).not.toContain("smith");
  });

  it("failure results carry no keys beyond their discriminant (and field for MissingInput)", async () => {
    const { repo } = spyRepo();
    const cases: Array<[Parameters<typeof lookupOrder>[1], string[]]> = [
      [{ orderNumber: "" }, ["field", "kind"]],
      [{ orderNumber: "bad", lastName: "Smith" }, ["kind"]],
      [{ orderNumber: "ORD9999999", lastName: "Smith" }, ["kind"]],
      [{ orderNumber: SMITH_ORDER, lastName: "Jones" }, ["kind"]],
    ];
    for (const [input, keys] of cases) {
      const r = await lookupOrder(repo, input);
      expect(Object.keys(r).sort()).toEqual(keys);
      const json = JSON.stringify(r).toLowerCase();
      expect(json).not.toContain("smith");
      expect(json).not.toContain("jones");
      expect(json).not.toContain("bad");
    }
  });

  it("type-level: failure variants carry no order-derived fields", () => {
    expectTypeOf<FormatError>().toEqualTypeOf<{ kind: "FormatError" }>();
    expectTypeOf<NotFoundOrNotValidated>().toEqualTypeOf<{ kind: "NotFoundOrNotValidated" }>();
    expectTypeOf<MissingInput>().toEqualTypeOf<{ kind: "MissingInput"; field: "orderNumber" }>();
    expectTypeOf<Extract<LookupResult, { kind: "Success" }>>().toHaveProperty("view");
    expectTypeOf<Order>().toHaveProperty("customerLastName");
  });
});
