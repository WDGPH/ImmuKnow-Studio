import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync, zipSync } from "fflate";
import { continueProject, chooseTemplate, confirmProjectChange, saved } from "./helpers";
import type { Bundle } from "../src/types";

async function current(page: Page) {
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready", {
    timeout: 60_000,
  });
}
async function download(page: Page) {
  const menu = page.locator(".project-actions");
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  const pending = page.waitForEvent("download");
  await page.locator("#export").click();
  return unzipSync(readFileSync((await (await pending).path()) as string));
}

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
    await continueProject(page);
    await current(page);
    const files = await download(page);
    const settings = new TextDecoder().decode(files["templates/settings.typ"]);
    expect(settings).toContain(`#let paper-size = "${scope === "template" ? "a4" : "us-letter"}"`);
    expect(new TextDecoder().decode(files["templates/overdue_diseases_v1.en.typ"])).not.toContain(
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
  await page.locator("#template").selectOption("templates/overdue_diseases_v1.fr.typ");
  await expect(page.locator("#project-change-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#template")).toHaveValue("templates/overdue_diseases_v1.en.typ");
  expect(await page.locator("#preview-state").getAttribute("data-requested-revision")).toBe(before);
  await chooseTemplate(page, "templates/overdue_diseases_v1.fr.typ");
  await current(page);
  await saved(page);
  await page.reload();
  await continueProject(page);
  await current(page);
  await page.locator("#theme-tab").click();
  await chooseTemplate(page, "templates/overdue_diseases_v1.en.typ");
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
  expect(Object.keys(files).filter((path) => /^templates\/.+\.(en|fr)\.typ$/.test(path))).toEqual([
    "templates/overdue_diseases_v1.en.typ",
  ]);
  expect(
    Object.keys(files)
      .filter((path) => path.startsWith("examples/") && /\.(csv|json)$/.test(path))
      .sort(),
  ).toEqual([
    "examples/assignments/long-history.overdue_diseases_v1.en.json",
    "examples/clients/long-history.overdue_diseases_v1.en.csv",
  ]);
  // The scoped download remains a valid project that can be imported.
  await page.locator("#previous").click();
  await current(page);
  await page.locator("#archive").setInputFiles({
    name: "current.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync(files)),
  });
  await expect(page.locator("#archive")).toHaveValue("");
  await current(page);
  await expect(page.locator("#template option")).toHaveCount(1);
  await expect(page.locator("#position")).toHaveText("2 of 3");
  await expect(page.locator(".cm-content")).toContainText("Example client keeps my edits");
  await page.locator("#next").click();
  await current(page);
  const alternate = await download(page);
  expect(
    Object.keys(alternate)
      .filter((path) => path.startsWith("examples/") && /\.(csv|json)$/.test(path))
      .sort(),
  ).toEqual([
    "examples/assignments/source-warnings.overdue_diseases_v1.en.json",
    "examples/clients/source-warnings.overdue_diseases_v1.en.csv",
  ]);
});
