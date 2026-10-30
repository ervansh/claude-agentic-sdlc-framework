import type { NormalizedInput, RawLookupInput } from "./types.js";

/**
 * FR-8 / A-3: trim, uppercase, and remove exactly one optional single space or
 * hyphen directly after "ORD". Double separators are not collapsed.
 */
export function normalizeOrderNumber(raw: string | null | undefined): string {
  const upper = (raw ?? "").trim().toUpperCase();
  if (upper.length > 3 && upper.startsWith("ORD") && (upper[3] === " " || upper[3] === "-")) {
    return upper.slice(0, 3) + upper.slice(4);
  }
  return upper;
}

/** Lowercase and trim; whitespace-only or missing input is treated as omitted. */
export function normalizeLastName(raw: string | null | undefined): string | undefined {
  const value = (raw ?? "").trim().toLowerCase();
  return value === "" ? undefined : value;
}

export function normalizeInput(input: RawLookupInput): NormalizedInput {
  return {
    orderNumber: normalizeOrderNumber(input.orderNumber),
    lastName: normalizeLastName(input.lastName),
  };
}
