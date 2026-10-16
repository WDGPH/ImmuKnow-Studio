import { expect, type Page } from "@playwright/test";

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
