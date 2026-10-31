import { expect, type Page } from "@playwright/test";

export async function saved(page: Page) {
  // Once persistence finishes, leaving no longer needs the unsaved-edits guard.
  await expect
    .poll(() =>
      page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true }))),
    )
    .toBe(true);
}

export async function chooseTemplate(page: Page, template: string, scope = "template") {
  const previous = await page.locator("#template").inputValue();
  await page.locator("#template").selectOption(template);
  if (previous === template) return;
  await confirmProjectChange(page, scope);
}

export async function confirmProjectChange(page: Page, scope = "template") {
  await expect(page.locator("#project-change-dialog")).toBeVisible();
  await page.locator(`input[name="reset-scope"][value="${scope}"]`).check();
  await page.locator("#project-change-confirm").click();
  await expect(page.locator("#project-change-dialog")).not.toBeVisible();
}
