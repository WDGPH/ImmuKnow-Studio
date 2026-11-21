import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { downloadProject, restoredProject, chooseTemplate, confirmProjectChange, saved, restoreAuthoredDraft } from "./helpers";
import type { Bundle } from "../src/types";

async function current(page: Page) {
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready", {
    timeout: 60_000,
  });
}
async function download(page: Page, includeFictionalData?: boolean) {
  const menu = page.locator(".project-actions");
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  const pending = page.waitForEvent("download");
  await downloadProject(page, undefined, includeFictionalData);
  return unzipSync(readFileSync((await (await pending).path()) as string));
}

test("fictional data can be omitted without affecting editing or the saved draft", async ({ page }) => {
  await page.goto("./");
  await current(page);
  await page.locator(".project-actions summary").click();
  await page.locator("#export").click();
  const checkbox = page.getByRole("checkbox", { name: "Include fictional client data", includeHidden: true });
  await expect(checkbox).toBeChecked();
  await page.getByRole("radio", { name: "Authored .typ files only" }).check();
  await expect(checkbox).toBeHidden();
  await expect(checkbox).toBeDisabled();
  await page.getByRole("radio", { name: "Project files only" }).check();
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toBeEnabled();
  await page.locator("#download-cancel").click();
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const included = await download(page, true);
  expect(included["sample.json"]).toBeDefined();
  // Compatible older drafts may already contain the supplied sample.
  const includedDraft = { ...included };
  delete includedDraft["immuknow-project.json"];
  await restoreAuthoredDraft(page, includedDraft, bundle.build, "templates/overdue_diseases.en.typ");
  await current(page);
  const omitted = await download(page, false);
  expect(Object.keys(omitted).filter((path) => path.startsWith("examples/") && /\.(csv|json)$/.test(path))).toEqual([]);
  expect(Object.keys(omitted).filter((path) => path.startsWith("input/sample/"))).toEqual([]);
  expect(omitted["sample.json"]).toBeUndefined();
  for (const path of ["templates/overdue_diseases.en.typ", "templates/settings.typ", "README.md", "immuknow-revision.txt"])
    expect(omitted[path]).toEqual(included[path]);
  const omittedDraft = { ...omitted };
  delete omittedDraft["immuknow-project.json"];
  await restoreAuthoredDraft(page, omittedDraft, bundle.build, "templates/overdue_diseases.en.typ");
  await current(page);
  const restored = await download(page, true);
  expect(restored["input/sample/sample_students.csv"]).toEqual(included["input/sample/sample_students.csv"]);
  expect(restored["sample.json"]).toEqual(included["sample.json"]);
});

for (const scope of ["template", "settings", "theme"]) {
  test(`reset ${scope} has the same scope from Theme and survives reloading`, async ({ page }) => {
    await page.goto("./");
    await current(page);
    const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
    const original = Buffer.from(bundle.files["templates/settings.typ"], "base64").toString("utf8");
    await page.locator("#settings-tab").click();
    await page.locator(".cm-content").press("Control+a");
    await page.keyboard.insertText(
      original.replace('paper-size = "us-letter"', 'paper-size = "a4"'),
    );
    await page.locator("#template-tab").click();
    await page.locator(".cm-content").press("Control+End");
    await page.keyboard.insertText("\n// Remove this template edit");
    await page.locator("#theme-tab").click();
    await page.locator("#health-unit-preset").selectOption("cedar-ridge");
    await expect(page.locator("#health-unit-undo")).toBeVisible();
    await page.locator("#extra-upload").setInputFiles({
      name: "extra.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
      ),
    });
    await expect(page.locator("#extra-preview")).toBeVisible();
    await current(page);
    await page.locator(".project-actions summary").click();
    await page.locator("#reset").click();
    await expect(page.locator("#project-change-dialog")).toBeVisible();
    await expect(page.locator("#project-change-cancel")).toBeFocused();
    await confirmProjectChange(page, scope);
    await current(page);
    await expect(page.locator("#body-font-picker")).toHaveValue(
      scope === "theme" ? "FreeSans" : "FreeSerif",
    );
    await expect(page.locator("#extra-preview")).toBeVisible({ visible: scope !== "theme" });
    await expect(page.locator("#health-unit-undo")).not.toBeVisible();
    await saved(page);
    await page.reload();
    await restoredProject(page);
    await current(page);
    const files = await download(page);
    const settings = new TextDecoder().decode(files["templates/settings.typ"]);
    expect(settings).toContain(`#let paper-size = "${scope === "template" ? "a4" : "us-letter"}"`);
    expect(new TextDecoder().decode(files["templates/overdue_diseases.en.typ"])).not.toContain(
      "Remove this template edit",
    );
    if (scope === "theme") {
      expect(settings).toBe(original);
      expect(Buffer.from(files["templates/assets/logo.png"]).toString("base64")).toBe(
        bundle.files["templates/assets/logo.png"],
      );
      expect(files["templates/assets/studio-extra.svg"]).toBeUndefined();
    } else {
      expect(settings).toContain('module-shape: "rounded"');
      expect(files["templates/assets/studio-extra.svg"]).toBeDefined();
    }
  });
}

test("switch confirmation cancels cleanly, and accepting starts the target template over", async ({
  page,
}) => {
  await page.goto("./");
  await current(page);
  await page.locator(".cm-content").press("Control+End");
  await page.keyboard.insertText("\n// Current wording to preserve until reset");
  await current(page);
  const before = await page.locator("#preview-state").getAttribute("data-requested-revision");
  await page.locator("#theme-tab").click();
  await page.locator("#template").selectOption("templates/overdue_diseases.fr.typ");
  await expect(page.locator("#project-change-dialog")).toBeVisible();
  await expect(page.locator('input[value="workspace"]')).not.toBeVisible();
  await expect(page.locator('input[value="clear"]')).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#template")).toHaveValue("templates/overdue_diseases.en.typ");
  expect(await page.locator("#preview-state").getAttribute("data-requested-revision")).toBe(before);
  await chooseTemplate(page, "templates/overdue_diseases.fr.typ");
  await current(page);
  await saved(page);
  await page.reload();
  await restoredProject(page);
  await current(page);
  await page.locator("#theme-tab").click();
  await chooseTemplate(page, "templates/overdue_diseases.en.typ");
  await current(page);
  await page.locator("#template-tab").click();
  await expect(page.locator(".cm-content")).not.toContainText(
    "Current wording to preserve until reset",
  );
  await page.locator(".cm-content").press("Control+End");
  await page.keyboard.insertText("\n// Example client keeps my edits");
  await page.locator("#next").click();
  await current(page);
  await expect(page.locator("#project-change-dialog")).not.toBeVisible();
  await expect(page.locator(".cm-content")).toContainText("Example client keeps my edits");
  const files = await download(page);
  const sample = JSON.parse(new TextDecoder().decode(files["sample.json"]));
  expect(sample.template).toBe("templates/overdue_diseases.en.typ");
  expect(files[sample.template]).toBeDefined();
  expect(Object.keys(files).filter((path) => path.startsWith("examples/") && /\.(csv|json)$/.test(path))).toEqual([]);
  // Existing drafts with a scoped file set still preserve authored work.
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const scopedDraft = { ...files };
  delete scopedDraft["immuknow-project.json"];
  await restoreAuthoredDraft(page, scopedDraft, bundle.build, sample.template);
  await current(page);
  await expect(page.locator("#template option")).toHaveCount(
    1,
  );
  await expect(page.locator("#example")).toHaveText("Example client 01");
  await expect(page.locator(".cm-content")).toContainText("Example client keeps my edits");
  await page.locator("#next").click();
  await current(page);
  const alternate = await download(page);
  expect(Object.keys(alternate).filter((path) => path.startsWith("examples/") && /\.(csv|json)$/.test(path))).toEqual([]);
  expect(alternate["input/sample/sample_students.csv"]).toEqual(files["input/sample/sample_students.csv"]);

});
