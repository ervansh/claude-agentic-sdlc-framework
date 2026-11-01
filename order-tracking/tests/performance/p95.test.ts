import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mockOrders } from "../../src/data/mockOrders.js";
import { createTestApp } from "../integration/helpers.js";

// NFR-1 / A-2: smoke check of p95 latency against mock data on the local machine.
// This is NOT a load test and NOT a mobile-network measurement.
const REQUEST_COUNT = 250; // plan minimum is 200
const WARMUP_COUNT = 10;
const P95_LIMIT_MS = 2000;

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index]!;
}

describe("NFR-1 / A-2 performance smoke: POST /track p95 under 2 s", () => {
  let server: Server;

  beforeAll(async () => {
    const { app } = createTestApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it(`NFR-1 p95 of ${REQUEST_COUNT} sequential POST /track (success and failure mix) is under ${P95_LIMIT_MS} ms`, async () => {
    const known = mockOrders[0]!;
    const noName = mockOrders[2]!;
    // Rotating mix: success with last name, success without, wrong last name, unknown order, format error, missing.
    const mix: Record<string, string>[] = [
      { orderNumber: known.orderId, lastName: known.customerLastName },
      { orderNumber: noName.orderId },
      { orderNumber: known.orderId, lastName: "NotTheName" },
      { orderNumber: "ORD9999999", lastName: "Anyone" },
      { orderNumber: "!!bad!!" },
      { lastName: "OnlyName" },
    ];
    const send = (i: number) => request(server).post("/track").type("form").send(mix[i % mix.length]!);

    for (let i = 0; i < WARMUP_COUNT; i++) await send(i);

    const latencies: number[] = [];
    const statuses = new Map<number, number>();
    for (let i = 0; i < REQUEST_COUNT; i++) {
      const start = performance.now();
      const res = await send(i);
      latencies.push(performance.now() - start);
      statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const max = sorted[sorted.length - 1]!;
    // eslint-disable-next-line no-console
    console.log(
      `PERF-SMOKE n=${REQUEST_COUNT} p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${max.toFixed(2)}ms limit=${P95_LIMIT_MS}ms statuses=${JSON.stringify(Object.fromEntries(statuses))}`,
    );

    // Guard: the mix must really exercise success and failure paths and not be throttled.
    expect(statuses.get(200) ?? 0).toBeGreaterThan(0);
    expect(statuses.has(429)).toBe(false);
    expect(statuses.size).toBeGreaterThan(0);
    expect(p95).toBeLessThan(P95_LIMIT_MS);
  });
});
