import { expect, type Page } from "@playwright/test";
import type { BuildInfo, Bundle, Files } from "../src/types";

export async function restoredProject(page: Page) {
  await expect(page.locator("#template-tab")).toBeEnabled();
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

export async function chooseExample(page: Page, index: number) {
  const position = page.locator("#example");
  await expect(position).toHaveText(/^Example client \d+$/);
  let current = Number((await position.innerText()).split(" ").at(-1)) - 1;
  while (current !== index) {
    const direction = current < index ? 1 : -1;
    await page.getByRole("button", { name: direction > 0 ? "Next example" : "Previous example" }).click();
    current += direction;
    await expect(position).toHaveText(`Example client ${String(current + 1).padStart(2, "0")}`);
  }
}

export async function downloadProject(page: Page, includeFonts?: boolean, includeFictionalData?: boolean) {
  await page.locator("#export").click();
  await expect(page.getByRole("dialog", { name: "Download project", exact: true })).toBeVisible();
  await page.locator('input[name="download-kind"][value="project"]').check();
  if (includeFonts !== undefined) await page.locator("#include-fonts").setChecked(includeFonts);
  if (includeFictionalData !== undefined)
    await page.locator("#include-fictional-data").setChecked(includeFictionalData);
  await page.locator("#download-confirm").click();
}

// Seed compatible authored work through draft recovery; project ZIP upload is not a UI feature.
export async function restoreAuthoredDraft(
  page: Page,
  files: Files,
  build: BuildInfo,
  template: string,
  example = "",
) {
  await restoredProject(page);
  await saved(page);
  await page.evaluate(async ({ files, build, template, example }) => {
    const bytes = Object.fromEntries(files.map(([path, values]) => [path, new Uint8Array(values)]));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("immuknow-studio-drafts-v2", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("drafts", "readwrite");
        transaction.objectStore("drafts").put({
          schemaVersion: 2, revision: 1, build, files: bytes, baseline: bytes, template, example,
        }, "current");
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }, { files: Object.entries(files).map(([path, bytes]) => [path, Array.from(bytes)] as [string, number[]]),
    build, template, example });
  await page.reload();
  await restoredProject(page);
}
