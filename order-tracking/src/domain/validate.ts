import { ORDER_NUMBER_PATTERN } from "./messages.js";
import type { FormatError, MissingInput, NormalizedInput } from "./types.js";

export type ValidationResult = { ok: true } | { ok: false; error: MissingInput | FormatError };

/** FR-2 / FR-7: runs on normalized input, before any data access. Pure. */
export function validateInput(input: NormalizedInput): ValidationResult {
  if (input.orderNumber.trim() === "") {
    return { ok: false, error: { kind: "MissingInput", field: "orderNumber" } };
  }
  if (!ORDER_NUMBER_PATTERN.test(input.orderNumber)) {
    return { ok: false, error: { kind: "FormatError" } };
  }
  return { ok: true };
}
