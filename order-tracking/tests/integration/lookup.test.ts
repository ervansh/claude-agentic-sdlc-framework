import request from "supertest";
import { describe, expect, it } from "vitest";
import { mockOrders } from "../../src/data/mockOrders.js";
import { FORMAT_ERROR_MESSAGE, MISSING_ORDER_NUMBER_MESSAGE } from "../../src/domain/messages.js";
import { NOT_FOUND_MESSAGE } from "../../src/web/routes.js";
import { createTestApp } from "./helpers.js";

const smith = mockOrders[0]!; // ORD1000001, Smith, PLACED
const shipped = mockOrders[2]!; // ORD1000003, McDonald-Rivera, two items
const delivered = mockOrders[3]!; // ORD1000004, Nguyen, all dates

const submit = (app: ReturnType<typeof createTestApp>["app"], orderNumber?: string, lastName?: string) => {
  const body: Record<string, string> = {};
  if (orderNumber !== undefined) body.orderNumber = orderNumber;
  if (lastName !== undefined) body.lastName = lastName;
  return request(app).post("/track").type("form").send(body);
};

describe("AC-1 / FR-2 / FR-3 / FR-4 / FR-5 successful lookup", () => {
  it("AC-1 returns the tracking view with a last name: id, status, items, dates, 200, no-store, no redirect", async () => {
    const { app, repository } = createTestApp();
    const res = await submit(app, delivered.orderId, delivered.customerLastName).redirects(0);
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.text).toContain(delivered.orderId);
    expect(res.text).toContain("DELIVERED");
    expect(res.text).toContain("Test Notebook");
    expect(res.text).toContain("2026-09-10");
    expect(res.text).toContain("2026-09-17");
    expect(res.text).toContain("2026-09-16");
    expect(repository.calls).toEqual([delivered.orderId]);
  });

  it("AC-1 / A-1 returns the tracking view without a last name, listing every item", async () => {
    const { app } = createTestApp();
    const res = await submit(app, shipped.orderId).redirects(0);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.text).toContain(shipped.orderId);
    expect(res.text).toContain("SHIPPED");
    expect(res.text).toContain("Demo Lamp");
    expect(res.text).toContain("Demo Cable");
  });

  it("AC-1 / FR-5 tracking view does not echo the last name or its details", async () => {
    const { app } = createTestApp();
    const res = await submit(app, shipped.orderId, shipped.customerLastName);
    expect(res.text.toLowerCase()).not.toContain(shipped.customerLastName.toLowerCase());
  });
});

describe("AC-2 / FR-6 unknown order", () => {
  it("AC-2 shows the generic could-not-find-or-validate message with 200 and no order details", async () => {
    const { app, repository } = createTestApp();
    const res = await submit(app, "ORD0000000");
    expect(res.status).toBe(200);
    expect(res.text).toContain(NOT_FOUND_MESSAGE);
    expect(res.text).toMatch(/could not find or validate/i);
    expect(res.text).toContain('role="alert"');
    expect(res.text).not.toContain("<dl>");
    expect(res.text).not.toContain("Items in this order");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(repository.calls).toEqual(["ORD0000000"]);
  });
});

describe("AC-3 / FR-7 missing order number", () => {
  it("AC-3 empty order number names the order number and performs no lookup", async () => {
    const { app, repository } = createTestApp();
    const res = await submit(app, "", smith.customerLastName);
    expect(res.status).toBe(200);
    expect(res.text).toContain(MISSING_ORDER_NUMBER_MESSAGE);
    expect(res.text.toLowerCase()).toContain("order number");
    expect(repository.calls).toHaveLength(0);
  });

  it("AC-3 whitespace-only and absent order numbers perform no lookup", async () => {
    const { app, repository } = createTestApp();
    const blank = await submit(app, "   ");
    const absent = await submit(app);
    expect(blank.text).toContain(MISSING_ORDER_NUMBER_MESSAGE);
    expect(absent.text).toContain(MISSING_ORDER_NUMBER_MESSAGE);
    expect(repository.calls).toHaveLength(0);
  });
});

describe("AC-4 / FR-8 / A-3 normalization in one submission", () => {
  const variants: Array<[string, string, string | undefined]> = [
    ["lowercase order number", "ord1000001", undefined],
    ["ORD- separator", "ORD-1000001", undefined],
    ["ORD space separator", "ORD 1000001", undefined],
    ["padded whitespace", "   ORD1000001  ", undefined],
    ["last name case", "ORD1000001", "sMiTh"],
    ["last name padded whitespace", "ORD1000001", "   Smith   "],
    ["combined variants", " ord-1000001 ", "  SMITH "],
  ];

  for (const [label, orderNumber, lastName] of variants) {
    it(`AC-4 / A-3 succeeds on first submission: ${label}`, async () => {
      const { app, repository } = createTestApp();
      const res = await submit(app, orderNumber, lastName);
      expect(res.status).toBe(200);
      expect(res.text).toContain(smith.orderId);
      expect(res.text).toContain("Example Widget");
      expect(res.text).not.toContain(NOT_FOUND_MESSAGE);
      expect(repository.calls).toEqual([smith.orderId]);
    });
  }

  it("AC-4 hyphenated last name matches regardless of case", async () => {
    const { app } = createTestApp();
    const res = await submit(app, shipped.orderId, "mcdonald-rivera");
    expect(res.text).toContain("Demo Lamp");
  });
});

describe("A-1 optional last name", () => {
  it("A-1 omitted last name succeeds", async () => {
    const { app } = createTestApp();
    const res = await submit(app, smith.orderId);
    expect(res.text).toContain("Example Widget");
  });

  it("A-1 whitespace-only last name is treated as omitted and succeeds", async () => {
    const { app } = createTestApp();
    const res = await submit(app, smith.orderId, "   ");
    expect(res.text).toContain("Example Widget");
  });

  it("A-1 / FR-6 supplied wrong last name fails with the generic message and no details", async () => {
    const { app } = createTestApp();
    const res = await submit(app, smith.orderId, "Wrong");
    expect(res.status).toBe(200);
    expect(res.text).toContain(NOT_FOUND_MESSAGE);
    expect(res.text).not.toContain("Example Widget");
    expect(res.text).not.toContain("PLACED");
  });

  it("A-1 / FR-6 wrong last name and unknown order produce identical failure messages", async () => {
    const { app } = createTestApp();
    const mismatch = await submit(app, smith.orderId, "Wrong");
    const unknown = await submit(app, "ORD0000000", "Wrong");
    const summary = (t: string) => /<div id="error-summary"[\s\S]*?<\/div>/.exec(t)?.[0];
    expect(summary(mismatch.text)).toBeDefined();
    expect(summary(mismatch.text)).toBe(summary(unknown.text));
  });
});

describe("A-4 / FR-10 malformed order number", () => {
  it("A-4 shows the format error, not the generic message, with zero repository calls", async () => {
    const { app, repository } = createTestApp();
    const res = await submit(app, "ORD12345");
    expect(res.status).toBe(200);
    expect(res.text).toContain(FORMAT_ERROR_MESSAGE);
    expect(res.text).not.toContain(NOT_FOUND_MESSAGE);
    expect(repository.calls).toHaveLength(0);
  });

  it("A-4 rejects non-conforming shapes without any lookup", async () => {
    const { app, repository } = createTestApp();
    for (const bad of ["1000001", "ORD10000012", "ORD--1000001", "ORD  1000001", "ORDABCDEFG", "XYZ1000001"]) {
      const res = await submit(app, bad);
      expect(res.text).toContain(FORMAT_ERROR_MESSAGE);
    }
    expect(repository.calls).toHaveLength(0);
  });

  it("A-4 format-error body does not contain the submitted value", async () => {
    const { app } = createTestApp();
    const submitted = "BADVALUE<script>9";
    const res = await submit(app, submitted);
    expect(res.text).toContain(FORMAT_ERROR_MESSAGE);
    expect(res.text).not.toContain(submitted);
    expect(res.text).not.toContain("BADVALUE");
    expect(res.text).not.toContain("<script>9");
  });
});

describe("FR-1 / FR-4 identifiers only via POST body", () => {
  it("FR-1 GET /track with query-string identifiers performs no lookup and shows the form", async () => {
    const { app, repository } = createTestApp();
    const res = await request(app).get(`/track?orderNumber=${smith.orderId}&lastName=Smith`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('<form method="post" action="/track"');
    expect(res.text).not.toContain("Example Widget");
    expect(repository.calls).toHaveLength(0);
  });

  it("FR-1 POST with identifiers only in the query string performs no lookup", async () => {
    const { app, repository } = createTestApp();
    const res = await request(app).post(`/track?orderNumber=${smith.orderId}`).type("form").send({});
    expect(res.text).toContain(MISSING_ORDER_NUMBER_MESSAGE);
    expect(repository.calls).toHaveLength(0);
  });
});

describe("NFR-3 markup assertions", () => {
  it("NFR-3 form has labels bound to inputs and marks last name optional", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/");
    expect(res.text).toMatch(/<label for="orderNumber">Order number<\/label>/);
    expect(res.text).toMatch(/<input[^>]*id="orderNumber"[^>]*name="orderNumber"/);
    expect(res.text).toMatch(/<label for="lastName">Last name \(optional\)<\/label>/);
    expect(res.text).toMatch(/<input[^>]*id="lastName"[^>]*name="lastName"/);
    expect(res.text).toMatch(/<html[^>]*\blang="/);
    expect(res.text).toMatch(/<title>[^<]+<\/title>/);
    expect(res.text).not.toContain('role="alert"');
  });

  it("NFR-3 / FR-7 error re-render has role=alert, error summary, inline error and aria-describedby", async () => {
    const { app } = createTestApp();
    const res = await submit(app, "");
    expect(res.text).toMatch(/<div id="error-summary" role="alert" tabindex="-1"/);
    expect(res.text).toContain("There is a problem");
    expect(res.text).toContain('id="orderNumber-error"');
    expect(res.text).toMatch(/aria-describedby="[^"]*orderNumber-error[^"]*"/);
    expect(res.text).toContain('aria-invalid="true"');
    expect(res.text).toMatch(/<title>Error: /);
  });

  it("NFR-3 / FR-5 tracking view uses semantic headings, definition list and table headers", async () => {
    const { app } = createTestApp();
    const res = await submit(app, delivered.orderId);
    expect(res.text).toMatch(/<h1>Order ORD1000004<\/h1>/);
    expect(res.text).toContain("<dl>");
    expect(res.text).toContain('<th scope="col">Item</th>');
    expect(res.text).toContain('<th scope="col">Quantity</th>');
    expect(res.text).toContain('<a href="/">Look up another order</a>');
  });
});
