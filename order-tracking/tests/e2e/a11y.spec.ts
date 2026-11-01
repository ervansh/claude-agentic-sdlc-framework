import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
let __wd: NodeJS.Timeout | undefined;
test.beforeEach(async ({ page }, ti) => {
  await new Promise((r) => setTimeout(r, 60)); // CONTROL: delay only, no rAF
  __wd = setTimeout(async () => {
    const r1 = await Promise.race([page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r("raf-ok")))), new Promise((r) => setTimeout(() => r("TIMEOUT"), 3000))]);
    console.log(`WATCHDOG ${ti.project.name} w=${ti.workerIndex} ${ti.title} raf=${r1}`);
  }, 12000);
});
test.afterEach(() => clearTimeout(__wd));

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

async function submit(page: Page, value: string) {
  await page.goto("/");
  await page.getByLabel("Order number").fill(value);
  await page.getByRole("button", { name: "Track order" }).click();
}

test.describe("axe scans (zero serious or critical)", () => {
  test("form", async ({ page }) => {
    await page.goto("/");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("missing field error state", async ({ page }) => {
    await submit(page, "");
    await expect(page.locator("#error-summary")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("format error state", async ({ page }) => {
    await submit(page, "abc");
    await expect(page.locator("#error-summary")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("not found error state", async ({ page }) => {
    await submit(page, "ORD9999999");
    await expect(page.locator("#error-summary")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("result page", async ({ page }) => {
    await submit(page, "ORD1000001");
    await expect(page.getByRole("table")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe("layout checks", () => {
  test("320px reflow without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const value of [null, "ORD1000001", "abc"]) {
      if (value === null) await page.goto("/");
      else await submit(page, value);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("touch targets at least 44px", async ({ page }) => {
    await page.goto("/");
    for (const loc of [
      page.locator("#orderNumber"),
      page.locator("#lastName"),
      page.getByRole("button", { name: "Track order" }),
    ]) {
      const box = await loc.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test("focus indicator is visible on form controls", async ({ page }) => {
    await page.goto("/");
    for (const loc of [page.locator("#orderNumber"), page.getByRole("button", { name: "Track order" })]) {
      await loc.focus();
      const outline = await loc.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(outline.style).not.toBe("none");
      expect(outline.width).toBeGreaterThanOrEqual(2);
    }
  });
});
