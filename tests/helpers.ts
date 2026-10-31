import { expect, type Page } from "@playwright/test";
import type { Bundle } from "../src/types";

export async function continueProject(page: Page) {
  await expect(page.getByRole("dialog", { name: "Continue your browser project?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue project", exact: true }).click();
  await expect(page.locator("#recovery-dialog")).not.toBeVisible();
}

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

// Tests create their own incomplete records so public examples can change independently.
export async function editExampleData(page: Page, edit: (bundle: Bundle) => void) {
  await page.route("**/generated/project.json", async (route) => {
    const response = await route.fetch();
    const bundle = (await response.json()) as Bundle;
    edit(bundle);
    await route.fulfill({ response, json: bundle });
  });
}
