import { createHash, timingSafeEqual } from "node:crypto";
import type { Order, OrderRepository } from "../data/OrderRepository.js";
import { normalizeInput } from "./normalize.js";
import { toTrackingView } from "./toTrackingView.js";
import type { LookupResult, RawLookupInput } from "./types.js";
import { validateInput } from "./validate.js";

const DUMMY_LAST_NAME = "dummy-last-name-placeholder";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Single match step. Order-number-only lookups are accepted here (FR-3 / A-1):
 * an omitted last name matches. The same code path runs whether or not the
 * order exists, comparing against a dummy value when absent. This is a
 * best-effort timing equalization only, not a guarantee.
 */
function matches(order: Order | undefined, lastName: string | undefined): boolean {
  const stored = (order?.customerLastName ?? DUMMY_LAST_NAME).trim().toLowerCase();
  const supplied = lastName ?? stored;
  const equal = timingSafeEqual(digest(stored), digest(supplied));
  return order !== undefined && equal;
}

export async function lookupOrder(
  repository: OrderRepository,
  raw: RawLookupInput,
): Promise<LookupResult> {
  const input = normalizeInput(raw);
  const validation = validateInput(input);
  if (!validation.ok) {
    return validation.error; // FR-10: no data access before validation passes
  }
  const order = await repository.findByOrderId(input.orderNumber);
  if (!matches(order, input.lastName) || order === undefined) {
    return { kind: "NotFoundOrNotValidated" };
  }
  return { kind: "Success", view: toTrackingView(order) };
}
