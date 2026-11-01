import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { mockOrders } from "../../src/data/mockOrders.js";
import { createTestApp } from "./helpers.js";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const fixtureStrings = mockOrders.flatMap((o) => [
  o.orderId,
  o.customerLastName,
  ...o.items.map((i) => i.name),
  ...Object.values(o.dates).filter((d): d is string => typeof d === "string"),
]);

describe("fixture exposure (AC-5 / FR-9)", () => {
  const webRoot = path.join(process.cwd(), "src", "web");

  it("AC-5 / FR-9: no file under src/web references the fixture module or contains fixture values", () => {
    const files = walk(webRoot);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/mockOrders/);
      for (const value of fixtureStrings) {
        expect(text.includes(value), `${path.basename(file)} contains ${value}`).toBe(false);
      }
    }
  });

  it("AC-5 / FR-9: static files under src/web/public contain no fixture data", () => {
    const publicDir = path.join(webRoot, "public");
    for (const file of walk(publicDir)) {
      const text = readFileSync(file, "utf8");
      for (const value of fixtureStrings) {
        expect(text.includes(value), `${path.basename(file)} contains ${value}`).toBe(false);
      }
    }
  });

  it("AC-5 / FR-9: known fixture and source paths are not served by any route", async () => {
    const { app } = createTestApp();
    const paths = [
      "/data/mockOrders.ts",
      "/data/mockOrders.js",
      "/mockOrders.ts",
      "/mockOrders.js",
      "/mockOrders.json",
      "/src/data/mockOrders.ts",
      "/src/data/mockOrderRepository.ts",
      "/orders",
      "/orders.json",
      "/api/orders",
      "/api/orders/ORD1000001",
      "/track/ORD1000001",
      "/public/",
      "/../data/mockOrders.ts",
      "/%2e%2e/data/mockOrders.ts",
    ];
    for (const p of paths) {
      const res = await request(app).get(p);
      expect(res.status, p).toBe(404);
      for (const value of fixtureStrings) {
        expect(res.text.includes(value), `${p} leaked ${value}`).toBe(false);
      }
    }
  });

  it("AC-5 / FR-9: the static directory listing is not exposed", async () => {
    const { app } = createTestApp();
    for (const p of ["/", "/enhance.js"]) {
      const res = await request(app).get(p);
      for (const value of fixtureStrings) {
        expect(res.text.includes(value), `${p} leaked ${value}`).toBe(false);
      }
    }
  });
});
