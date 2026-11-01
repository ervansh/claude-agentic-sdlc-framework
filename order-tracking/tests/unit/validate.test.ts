import { describe, expect, it } from "vitest";
import { normalizeInput } from "../../src/domain/normalize.js";
import { FORMAT_ERROR_MESSAGE, MISSING_ORDER_NUMBER_MESSAGE } from "../../src/domain/messages.js";
import { validateInput } from "../../src/domain/validate.js";

const check = (orderNumber: string) =>
  validateInput(normalizeInput({ orderNumber, lastName: undefined }));

describe("validateInput", () => {
  it.each(["", "   ", "\t"])("empty/whitespace %j -> MissingInput", (v) => {
    expect(check(v)).toEqual({ ok: false, error: { kind: "MissingInput", field: "orderNumber" } });
  });

  it.each([
    "ORD123456", // too short
    "ORD12345678", // too long
    "ABC1234567", // wrong prefix
    "1234567",
    "ORD12A4567", // non-digit
    "ORDABCDEFG",
    "ORD--1234567", // double separators
    "ORD  1234567",
    "ORD",
  ])("%j -> FormatError", (v) => {
    expect(check(v)).toEqual({ ok: false, error: { kind: "FormatError" } });
  });

  it.each(["ORD1234567", "ord1234567", " ORD-1234567 ", "ORD 1234567"])("%j passes", (v) => {
    expect(check(v)).toEqual({ ok: true });
  });

  it("format error result carries no submitted value", () => {
    const r = check("ORD99SECRET");
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });

  it("message constants are static and never echo input (A-4)", () => {
    for (const m of [FORMAT_ERROR_MESSAGE, MISSING_ORDER_NUMBER_MESSAGE]) {
      expect(typeof m).toBe("string");
      expect(m).not.toMatch(/\$\{|%s|\{\{/);
    }
    expect(FORMAT_ERROR_MESSAGE).toContain("seven digits");
    expect(MISSING_ORDER_NUMBER_MESSAGE.toLowerCase()).toContain("order number");
  });
});
