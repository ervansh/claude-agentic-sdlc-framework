import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { lookupOrder } from "../../src/domain/lookupOrder.js";
import { NOT_FOUND_MESSAGE } from "../../src/web/routes.js";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("failure result shape (AC-5 / FR-9)", () => {
  const repo = new MockOrderRepository();

  it("AC-5 / FR-9: wrong last name yields a payload-free NotFoundOrNotValidated result", async () => {
    const result = await lookupOrder(repo, { orderNumber: "ORD1000001", lastName: "Wrong" });
    expect(result).toEqual({ kind: "NotFoundOrNotValidated" });
    expect(Object.keys(result)).toEqual(["kind"]);
  });

  it("AC-5 / FR-9: unknown order yields a result identical to the wrong-last-name result", async () => {
    const wrong = await lookupOrder(repo, { orderNumber: "ORD1000001", lastName: "Wrong" });
    const unknown = await lookupOrder(repo, { orderNumber: "ORD9999999", lastName: "Wrong" });
    expect(unknown).toEqual(wrong);
    expect(JSON.stringify(unknown)).toBe(JSON.stringify(wrong));
  });

  it("AC-5 / FR-9: format error result carries no submitted value", async () => {
    const result = await lookupOrder(repo, { orderNumber: "abc-secret", lastName: "Smith" });
    expect(result).toEqual({ kind: "FormatError" });
    expect(JSON.stringify(result)).not.toMatch(/secret|Smith/);
  });

  it("AC-5 / FR-9: the generic failure message is a single shared constant defined once in src", () => {
    const srcRoot = path.join(process.cwd(), "src");
    const files = walk(srcRoot).filter((f) => /\.(ts|njk|js)$/.test(f));
    const hits = files.filter((f) => readFileSync(f, "utf8").includes(NOT_FOUND_MESSAGE));
    expect(hits.map((f) => path.basename(f))).toEqual(["routes.ts"]);
    const occurrences = readFileSync(hits[0]!, "utf8").split(NOT_FOUND_MESSAGE).length - 1;
    expect(occurrences).toBe(1);
  });
});
