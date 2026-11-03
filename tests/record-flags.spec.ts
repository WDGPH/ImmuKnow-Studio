import { expect, test } from "@playwright/test";
import type { Bundle } from "../src/types";
import { chooseExample, chooseTemplate } from "./helpers";

test("record flags follow the selected fictional client", async ({ page }, info) => {
  await page.goto("./");
  const bundle = await (await page.request.get("./generated/project.json")).json() as Bundle;
  const select = async (id: string) => {
    const index = bundle.examples.findIndex((item) => item.id === id);
    expect(index).toBeGreaterThanOrEqual(0);
    await chooseExample(page, index);
  };
  await page.locator("#theme-tab").click();
  await select("no-records");
  for (const language of ["en", "fr"]) {
    await chooseTemplate(page, `templates/overdue_diseases_v1.${language}.typ`);
    await expect(page.locator(".preview-text-run").filter({ hasText: language === "en"
      ? "We have no immunization records" : "Aucune vaccination" }).first()).toBeAttached();
    await page.screenshot({ path: info.outputPath(`no-records-${language}.png`) });
  }
  await chooseTemplate(page, "templates/affirmative_schedule_v1.en.typ");
  await expect(page.locator("#diagnostics")).toContainText("affirmative notice requires no overdue diseases");
  await select("affirmative");
  await expect(page.locator(".preview-text-run").filter({ hasText: "up-to-date" }).first()).toBeAttached();
});
