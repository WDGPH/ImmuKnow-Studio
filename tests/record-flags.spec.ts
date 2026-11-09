import { expect, test } from "@playwright/test";
import type { Bundle } from "../src/types";
import { chooseExample, chooseTemplate } from "./helpers";

test("reader and overdue flags follow the selected fictional client", async ({ page }, info) => {
  await page.goto("./");
  const bundle = await (await page.request.get("./generated/project.json")).json() as Bundle;
  const select = async (id: string) => {
    const index = bundle.examples.findIndex((item) => item.id === id);
    expect(index).toBeGreaterThanOrEqual(0);
    await chooseExample(page, index);
  };
  await page.locator("#theme-tab").click();
  await select("guardian-directed");
  for (const language of ["en", "fr"]) {
    await chooseTemplate(page, `templates/overdue_diseases.${language}.typ`);
    await expect(page.locator(".preview-text-run").filter({ hasText: language === "en"
      ? "your child has" : "votre enfant" }).first()).toBeAttached();
    await page.screenshot({ path: info.outputPath(`guardian-directed-${language}.png`) });
  }
  await chooseTemplate(page, "templates/affirmative_schedule.en.typ");
  await expect(page.locator("#diagnostics")).toContainText("affirmative notice requires no overdue diseases");
  await select("up-to-date");
  await expect(page.locator(".preview-text-run").filter({ hasText: "up-to-date" }).first()).toBeAttached();
});

test("repeated overdue agents remain in source facts but appear once in the notice", async ({ page }) => {
  await page.goto("./");
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const filename = "overdue_agents.en.typ";
  const index = bundle.examples.findIndex((item) => item.id === "missing-mmr");
  expect(index).toBeGreaterThanOrEqual(0);
  const client = bundle.examples[index];
  const agents = client.payloads[filename].overdue_agents as string[];
  expect(agents.filter((agent) => agent === "MMR")).toHaveLength(3);
  const warning = client.preparationChecks[filename].find(
    (check) => check.code === "data.duplicate_overdue_agents",
  );
  expect(warning?.status).toBe("warn");
  const source = warning?.measurements?.source_value;
  expect(typeof source).toBe("string");
  expect((source as string).split(";").map((value) => value.trim()).filter((value) => value === "MMR"))
    .toHaveLength(3);

  await page.locator("#theme-tab").click();
  await chooseExample(page, index);
  await chooseTemplate(page, `templates/${filename}`);
  await expect.poll(() => page.locator("#preview-state").evaluate((element) => {
    const state = (element as HTMLElement).dataset;
    return Number(state.displayedRevision) > 0 &&
      state.displayedRevision === state.requestedRevision &&
      state.displayedContext === state.context;
  }), { timeout: 60_000 }).toBe(true);
  await page.locator("#notice-warnings summary").click();
  await expect(page.locator("#warnings-list")).toContainText("data.duplicate_overdue_agents");
  const firstPage = page.locator(".preview-page").first();
  await expect.poll(async () => (await firstPage.locator(".preview-text-run").allTextContents())
    .join(" ").match(/\bMMR\b/g)?.length ?? 0)
    .toBe(1);
});
