import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import type { Bundle } from "../src/types";
import { downloadProject, chooseExample, chooseTemplate, restoredProject, saved } from "./helpers";

async function current(page: Page) {
  await expect.poll(() => page.locator("#preview-state").evaluate((element) => {
    const state = (element as HTMLElement).dataset;
    return Number(state.displayedRevision) > 0 &&
      state.displayedRevision === state.requestedRevision &&
      state.displayedContext === state.context;
  }), { timeout: 60_000 }).toBe(true);
}

test("one client stays selected across notices, languages, a reload and download", async ({ page }, info) => {
  await page.goto("./");
  await current(page);
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const client = bundle.examples.find((item) => item.id === "missing-meningococcal");
  if (!client) throw new Error("Missing client for a notice applicability warning");
  const name = page.locator("#example");
  await expect(page.locator("select#example")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous example" })).toBeDisabled();
  await page.locator("#settings-tab").click();
  await page.locator(".cm-content").press("Control+End");
  await page.keyboard.insertText("\n// Keep these settings while comparing examples");
  await current(page);
  await chooseExample(page, bundle.examples.indexOf(client));
  await expect(page.getByRole("button", { name: "Previous example" })).toBeDisabled();
  await page.getByRole("button", { name: "Next example" }).click();
  await expect(name).toHaveText(`Example client ${String(bundle.examples.indexOf(client) + 2).padStart(2, "0")}`);
  await page.getByRole("button", { name: "Previous example" }).click();
  await current(page);
  await expect(page.locator("#project-change-dialog")).not.toBeVisible();
  await page.locator(".cm-content").press("Control+End");
  await expect(page.locator(".cm-content")).toContainText("Keep these settings");
  await page.locator("#theme-tab").click();
  const filenames = Object.keys(client.payloads);
  for (const filename of filenames) {
    await chooseTemplate(page, `templates/${filename}`);
    if (filename.startsWith("affirmative")) {
      await expect(page.locator("#diagnostics")).toContainText("affirmative notice requires no overdue diseases");
    } else {
      await current(page);
    }
    await expect(name).toHaveText(`Example client ${String(bundle.examples.indexOf(client) + 1).padStart(2, "0")}`);
    const firstName = String(client.payloads[filename].client_data.first_name).split(" ")[0];
    if (!filename.startsWith("affirmative")) {
      await expect(page.locator(".preview-text-run").filter({ hasText: firstName }).first()).toBeAttached();
    }
    if (filename.startsWith("affirmative")) {
      await expect(page.locator("#diagnostics")).toContainText("assignment.eligibility_conflict");
    }
  }
  await page.locator("#settings-tab").click();
  await page.locator(".cm-content").press("Control+End");
  await expect(page.locator(".cm-content")).toContainText("Keep these settings");
  await saved(page);
  await page.reload();
  await restoredProject(page);
  await current(page);
  await expect(name).toHaveText(`Example client ${String(bundle.examples.indexOf(client) + 1).padStart(2, "0")}`);
  await page.screenshot({ path: info.outputPath("shared-clients-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(name).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("shared-clients-mobile.png"), fullPage: true });
  const filename = filenames.at(-1) as string;
  await page.locator(".project-actions summary").click();
  const pending = page.waitForEvent("download");
  await downloadProject(page);
  const files = unzipSync(readFileSync((await (await pending).path()) as string));
  expect(Buffer.from(files["input/sample/sample_students.csv"])).toEqual(
    Buffer.from(bundle.files[client.inputs[filename].csv], "base64"),
  );
  expect(Buffer.from(files["input/sample/sample_assignments.json"])).toEqual(
    Buffer.from(bundle.files[client.inputs[filename].assignments], "base64"),
  );
  expect(files[client.inputs[filename].csv]).toBeUndefined();
  expect(new TextDecoder().decode(files["templates/settings.typ"])).toContain("Keep these settings");
});
