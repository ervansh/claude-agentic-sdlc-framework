import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/web/logger.js";

describe("logger", () => {
  it("emits only the outcome category and request ID", () => {
    const lines: string[] = [];
    const logger = createLogger((l) => lines.push(l));
    logger.logOutcome("not-found", "req-123");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["category", "requestId"]);
    expect(parsed).toEqual({ category: "not-found", requestId: "req-123" });
  });

  it("exposes no way to pass order or customer data", () => {
    // Runtime guard: extra arguments are ignored and never serialized.
    const lines: string[] = [];
    const logger = createLogger((l) => lines.push(l));
    (logger.logOutcome as (...a: unknown[]) => void)("success", "r1", "ORD1234567", "smith");
    expect(lines[0]).not.toContain("ORD1234567");
    expect(lines[0]).not.toContain("smith");
  });
});
