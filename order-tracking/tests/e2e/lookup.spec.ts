import { test, expect } from "@playwright/test";
let __wd: NodeJS.Timeout | undefined;
test.beforeEach(async ({ page }, ti) => {
  await new Promise((r) => setTimeout(r, 60)); // CONTROL: delay only, no rAF
  __wd = setTimeout(async () => {
    const r1 = await Promise.race([page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r("raf-ok")))), new Promise((r) => setTimeout(() => r("TIMEOUT"), 3000))]);
    console.log(`WATCHDOG ${ti.project.name} w=${ti.workerIndex} ${ti.title} raf=${r1}`);
  }, 12000);
});
test.afterEach(() => clearTimeout(__wd));

const MISSING = "Order number is required.";
const FORMAT =
  "Order number must be ORD followed by exactly seven digits (for example, ORD1234567).";
const NOT_FOUND =
  "We could not find or validate that order. Check your details and try again.";

test.describe("order lookup flows", () => {
  test("happy path shows tracking view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Track your order" })).toBeVisible();
    await page.getByLabel("Order number").fill("ORD1000001");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ORD1000001");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("not found shows generic message in error summary", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Order number").fill("ORD9999999");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.locator("#error-summary")).toContainText(NOT_FOUND);
  });

  test("missing order number shows required message", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.locator("#error-summary")).toContainText(MISSING);
    await expect(page.locator("#orderNumber")).toHaveAttribute("aria-invalid", "true");
  });

  test("format error shows format message", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Order number").fill("abc");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.locator("#error-summary")).toContainText(FORMAT);
  });

  test("focus moves to error summary on re-render", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Order number").fill("abc");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.locator("#error-summary")).toBeFocused();
  });

  test("keyboard-only operation", async ({ page, browserName }, testInfo) => {
    test.skip(
      testInfo.project.use.hasTouch === true || browserName === "webkit",
      "Tab key traversal is not representative on touch emulation or WebKit default Tab settings; covered by manual checklist.",
    );
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator("#orderNumber")).toBeFocused();
    await page.keyboard.type("ORD1000001");
    await page.keyboard.press("Tab");
    await expect(page.locator("#lastName")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Track order" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ORD1000001");
  });
});
