import { describe, it, expect } from "vitest";
import {
  normalizeInput,
  normalizeLastName,
  normalizeOrderNumber,
} from "../../src/domain/normalize.js";

describe("normalizeOrderNumber (FR-8, A-3, AC-4)", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeOrderNumber("  ORD1234567  ")).toBe("ORD1234567");
    expect(normalizeOrderNumber("\tORD1234567\n")).toBe("ORD1234567");
  });

  it("uppercases lowercase and mixed case", () => {
    expect(normalizeOrderNumber("ord1234567")).toBe("ORD1234567");
    expect(normalizeOrderNumber("oRd1234567")).toBe("ORD1234567");
  });

  it("removes one hyphen separator", () => {
    expect(normalizeOrderNumber("ORD-1234567")).toBe("ORD1234567");
    expect(normalizeOrderNumber("  ord-1234567 ")).toBe("ORD1234567");
  });

  it("removes one space separator", () => {
    expect(normalizeOrderNumber("ORD 1234567")).toBe("ORD1234567");
    expect(normalizeOrderNumber(" Ord 1234567 ")).toBe("ORD1234567");
  });

  it("does not collapse double separators", () => {
    expect(normalizeOrderNumber("ORD--1234567")).toBe("ORD-1234567");
    expect(normalizeOrderNumber("ORD  1234567")).toBe("ORD 1234567");
    expect(normalizeOrderNumber("ORD- 1234567")).toBe("ORD 1234567");
    expect(normalizeOrderNumber("ORD--1234567")).not.toMatch(/^ORD[0-9]{7}$/);
    expect(normalizeOrderNumber("ORD  1234567")).not.toMatch(/^ORD[0-9]{7}$/);
  });

  it("does not remove separators elsewhere", () => {
    expect(normalizeOrderNumber("ORD123-4567")).toBe("ORD123-4567");
  });

  it("returns empty string for empty, whitespace-only, null, undefined", () => {
    expect(normalizeOrderNumber("")).toBe("");
    expect(normalizeOrderNumber("   ")).toBe("");
    expect(normalizeOrderNumber(null)).toBe("");
    expect(normalizeOrderNumber(undefined)).toBe("");
  });
});

describe("normalizeLastName (FR-8, FR-3)", () => {
  it("lowercases and trims", () => {
    expect(normalizeLastName("  SmItH  ")).toBe("smith");
  });

  it("treats whitespace-only as omitted", () => {
    expect(normalizeLastName("   ")).toBeUndefined();
    expect(normalizeLastName("")).toBeUndefined();
    expect(normalizeLastName(null)).toBeUndefined();
    expect(normalizeLastName(undefined)).toBeUndefined();
  });
});

describe("normalizeInput", () => {
  it("normalizes both fields together", () => {
    expect(normalizeInput({ orderNumber: " ord-1234567 ", lastName: " Doe " })).toEqual({
      orderNumber: "ORD1234567",
      lastName: "doe",
    });
  });

  it("omits whitespace-only last name", () => {
    expect(normalizeInput({ orderNumber: "ORD1234567", lastName: "  " }).lastName).toBeUndefined();
  });

  it("is pure and does not mutate input", () => {
    const input = { orderNumber: " ord 1234567", lastName: " X " };
    const copy = { ...input };
    normalizeInput(input);
    expect(input).toEqual(copy);
  });
});
