import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockOrders } from "../../src/data/mockOrders.js";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import { createApp } from "../../src/web/app.js";
import { createLogger } from "../../src/web/logger.js";
import { NOT_FOUND_MESSAGE, registerRoutes } from "../../src/web/routes.js";
import { createTestApp } from "./helpers.js";

const PLACEHOLDER = "__ECHOED_ORDER_NUMBER__";

/** Replaces ONLY the order-number input value attribute. Reports whether it did. */
function maskEcho(body: string, echoed: string): { masked: string; substituted: boolean } {
  const needle = `id="orderNumber" name="orderNumber" value="${echoed}"`;
  const replacement = `id="orderNumber" name="orderNumber" value="${PLACEHOLDER}"`;
  const substituted = body.includes(needle);
  return { masked: body.split(needle).join(replacement), substituted };
}

async function post(app: Parameters<typeof request>[0], fields: Record<string, string>) {
  return request(app).post("/track").type("form").send(fields);
}

type Failure = { name: string; fields: Record<string, string>; echo?: string };

const failures: Failure[] = [
  { name: "wrong last name", fields: { orderNumber: "ORD1000001", lastName: "Zzyzx" }, echo: "ORD1000001" },
  { name: "unknown order", fields: { orderNumber: "ORD9999999", lastName: "Zzyzx" }, echo: "ORD9999999" },
  { name: "missing order number", fields: { orderNumber: "", lastName: "Zzyzx" } },
  { name: "format error", fields: { orderNumber: "not-an-order", lastName: "Zzyzx" } },
];

describe("data protection (AC-5 / FR-9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-5 / FR-9 / DR-001: wrong last name and unknown order are indistinguishable once the echoed order number is masked", async () => {
    const { app } = createTestApp();
    const a = await post(app, { orderNumber: "ORD1000001", lastName: "Zzyzx" });
    const b = await post(app, { orderNumber: "ORD9999999", lastName: "Zzyzx" });

    expect(a.status).toBe(b.status);
    expect(a.text).toContain(NOT_FOUND_MESSAGE);
    expect(b.text).toContain(NOT_FOUND_MESSAGE);

    // Headers identical apart from per-response validators/timestamps.
    const strip = (h: Record<string, unknown>) => {
      const copy = { ...h };
      delete copy["date"];
      delete copy["etag"];
      return copy;
    };
    expect(strip(a.headers)).toEqual(strip(b.headers));

    const ma = maskEcho(a.text, "ORD1000001");
    const mb = maskEcho(b.text, "ORD9999999");
    // The masking must actually have replaced the echoed value (guards against vacuous equality).
    expect(ma.substituted).toBe(true);
    expect(mb.substituted).toBe(true);
    expect(ma.masked).toContain(PLACEHOLDER);
    // Only the echoed value was masked: the raw bodies differ only there.
    expect(a.text).not.toBe(b.text);
    expect(ma.masked).toBe(mb.masked);
    expect(Buffer.from(ma.masked).equals(Buffer.from(mb.masked))).toBe(true);
  });

  it("AC-5 / FR-9: no failure response contains any fixture value, and the submitted last name is never echoed", async () => {
    const { app } = createTestApp();
    for (const f of failures) {
      const res = await post(app, f.fields);
      expect(res.status, f.name).toBe(200);
      const allowedEcho = f.echo;
      const forbidden = mockOrders.flatMap((o) => [
        ...(o.orderId === allowedEcho ? [] : [o.orderId]),
        o.customerLastName,
        ...o.items.map((i) => i.name),
        ...Object.values(o.dates).filter((d): d is string => typeof d === "string"),
      ]);
      for (const value of forbidden) {
        expect(res.text.includes(value), `${f.name} leaked ${value}`).toBe(false);
      }
      // A permitted echo is the order number only, never anything else of the order.
      expect(res.text, f.name).not.toContain("Zzyzx");
      expect(res.text, f.name).not.toMatch(/PLACED|PROCESSING|SHIPPED|DELIVERED/);
    }
  });

  it("AC-5 / FR-9: every lookup response carries Cache-Control: no-store", async () => {
    const { app } = createTestApp();
    for (const f of failures) {
      const res = await post(app, f.fields);
      expect(res.headers["cache-control"], f.name).toBe("no-store");
    }
    const ok = await post(app, { orderNumber: "ORD1000001", lastName: "Smith" });
    expect(ok.headers["cache-control"]).toBe("no-store");
  });

  it("AC-5 / FR-9: logs contain only category and request ID for failures and success", async () => {
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const app = createApp({ repository: new MockOrderRepository(), logger, registerRoutes });

    for (const f of failures) {
      await post(app, f.fields);
    }
    await post(app, { orderNumber: "ORD1000003", lastName: "McDonald-Rivera" });
    await post(app, { orderNumber: "ORD1000002", lastName: "" });

    expect(lines).toHaveLength(failures.length + 2);
    const categories = lines.map((l) => (JSON.parse(l) as { category: string }).category);
    expect(categories).toEqual(["not-found", "not-found", "missing", "format", "success", "success"]);
    for (const line of lines) {
      const entry = JSON.parse(line) as Record<string, unknown>;
      expect(Object.keys(entry).sort()).toEqual(["category", "requestId"]);
    }

    // Nothing else was written to the console, and no sensitive text appears anywhere.
    const consoleOutput = consoleSpies.flatMap((s) => s.mock.calls.map((c) => c.join(" ")));
    expect(consoleOutput).toEqual([]);
    const all = lines.join("\n");
    const sensitive = [
      "Zzyzx",
      "Smith",
      "McDonald",
      "ORD1000",
      "ORD9999",
      "1000003",
      "9999999",
      "not-an-order",
      "Demo Lamp",
      "2026-",
    ];
    for (const s of sensitive) {
      expect(all.includes(s), `log contained ${s}`).toBe(false);
    }
  });

  it("AC-5 / FR-9: Referrer-Policy and CSP headers are present on lookup responses", async () => {
    const { app } = createTestApp();
    for (const f of failures) {
      const res = await post(app, f.fields);
      expect(res.headers["referrer-policy"], f.name).toBe("no-referrer");
      expect(res.headers["content-security-policy"], f.name).toBeTruthy();
    }
  });

  it("AC-5 / FR-9: identifiers are not accepted from the query string", async () => {
    const { app, repository } = createTestApp();
    const get = await request(app).get("/track?orderNumber=ORD1000001&lastName=Smith");
    expect(get.status).toBe(200);
    expect(get.text).not.toContain("Example Widget");
    expect(get.text).not.toContain("Smith");
    const postQuery = await request(app).post("/track?orderNumber=ORD1000001&lastName=Smith").type("form").send({});
    expect(postQuery.text).not.toContain("Example Widget");
    expect(repository.calls).toEqual([]);
  });

  it("AC-5 / FR-9: the global error handler response contains no stack trace or data", async () => {
    const secret = "SECRET-ORD1000001-Smith";
    const lines: string[] = [];
    const logger = createLogger((l) => lines.push(l));
    const app = createApp({
      repository: new MockOrderRepository(),
      logger,
      registerRoutes: (a) => {
        a.get("/boom", () => {
          throw new Error(secret);
        });
      },
    });
    const res = await request(app).get("/boom?orderNumber=ORD1000001");
    expect(res.status).toBe(500);
    expect(res.text).not.toContain(secret);
    expect(res.text).not.toMatch(/Error:|\bat\s.+\(|\.ts:\d+|node_modules|ORD1000001|Smith/);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(lines).toHaveLength(1);
    expect(Object.keys(JSON.parse(lines[0]!) as object).sort()).toEqual(["category", "requestId"]);
    expect(lines[0]).not.toContain(secret);

    const oversized = await request(app).post("/track").type("form").send({ orderNumber: "x".repeat(10000) });
    expect(oversized.status).toBe(413);
    expect(oversized.text).not.toMatch(/PayloadTooLarge|stack|\.js:\d+/i);
  });

  it("AC-5 / FR-9 / A-1: scope of the existence oracle is limited to attempts that supply a last name", async () => {
    const { app } = createTestApp();
    // With a last name supplied, the two failure cases are indistinguishable (see DR-001 test above).
    const wrong = await post(app, { orderNumber: "ORD1000001", lastName: "Zzyzx" });
    const unknown = await post(app, { orderNumber: "ORD9999999", lastName: "Zzyzx" });
    expect(maskEcho(wrong.text, "ORD1000001").masked).toBe(maskEcho(unknown.text, "ORD9999999").masked);
    // Order-number-only attempts are intentionally NOT asserted indistinguishable (inherent in A-1):
    // a known order succeeds without a last name, an unknown one fails.
    const knownOnly = await post(app, { orderNumber: "ORD1000001" });
    const unknownOnly = await post(app, { orderNumber: "ORD9999999" });
    expect(knownOnly.text).toContain("Example Widget");
    expect(unknownOnly.text).toContain(NOT_FOUND_MESSAGE);
  });
});
