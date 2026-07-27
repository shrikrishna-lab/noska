import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function getBodyPointerEvents(page: Page) {
  return page.evaluate(() => document.body.style.pointerEvents);
}

async function login(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const loginForm = page.getByPlaceholder("admin@noska.dev");
  if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
      "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars to test authenticated pages"
    );
    await loginForm.fill(process.env.TEST_ADMIN_EMAIL!);
    await page.getByPlaceholder("Enter your password").fill(process.env.TEST_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/control", { timeout: 10000 });
  }
  await page.waitForLoadState("networkidle");
}

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/admin-accounts");
  await page.waitForLoadState("networkidle");
  await page.getByRole("combobox").first().waitFor({ state: "visible", timeout: 15000 });
});

test("open select → click outside → dropdown closes and body pointerEvents resets", async ({ page }) => {
  const select = page.getByRole("combobox").first();
  await select.click();

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible({ timeout: 3000 });
  const peOpen = await getBodyPointerEvents(page);
  expect(peOpen).toBe("none");

  await page.mouse.click(10, 10);
  await expect(listbox).not.toBeVisible({ timeout: 3000 });
  const peClosed = await getBodyPointerEvents(page);
  expect(peClosed).toBe("");
});

test("open select → choose option → dropdown closes and body pointerEvents resets", async ({ page }) => {
  const select = page.getByRole("combobox").first();
  await select.click();
  await page.waitForTimeout(200);

  const option = page.getByRole("option").first();
  await expect(option).toBeVisible({ timeout: 3000 });
  await option.click();

  await expect(page.getByRole("listbox")).not.toBeVisible({ timeout: 3000 });
  const pe = await getBodyPointerEvents(page);
  expect(pe).toBe("");
});

test("open select → Escape → dropdown closes and body pointerEvents resets", async ({ page }) => {
  const select = page.getByRole("combobox").first();
  await select.click();
  await expect(page.getByRole("listbox")).toBeVisible({ timeout: 3000 });

  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).not.toBeVisible({ timeout: 3000 });
  const pe = await getBodyPointerEvents(page);
  expect(pe).toBe("");
});

test("body pointerEvents resets cleanly after repeated open/close cycles", async ({ page }) => {
  const select = page.getByRole("combobox").first();

  for (let i = 0; i < 5; i++) {
    await select.click();
    await page.waitForTimeout(200);
    const peOpen = await getBodyPointerEvents(page);
    expect(peOpen, `cycle ${i}: pointerEvents during open`).toBe("none");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const peClosed = await getBodyPointerEvents(page);
    expect(peClosed, `cycle ${i}: pointerEvents after close`).toBe("");
  }
});
