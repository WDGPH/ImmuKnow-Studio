import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import type { Bundle } from "../src/types";
import { chooseExample, chooseTemplate, editExampleData } from "./helpers";

test("reader and overdue flags follow the selected fictional client", async ({ page }, info) => {
  await page.goto("./");
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const select = async (id: string) => {
    const index = bundle.examples.findIndex((item) => item.id === id);
    expect(index).toBeGreaterThanOrEqual(0);
    await chooseExample(page, index);
  };
  await page.locator("#theme-tab").click();
  await select("multiple-overdue");
  for (const language of ["en", "fr"]) {
    await chooseTemplate(page, `templates/overdue_diseases.${language}.typ`);
    await expect(
      page
        .locator(".preview-text-run")
        .filter({ hasText: language === "en" ? "your child has" : "votre enfant" })
        .first(),
    ).toBeAttached();
    await page.screenshot({ path: info.outputPath(`guardian-directed-${language}.png`) });
  }
  await chooseTemplate(page, "templates/affirmative_schedule.en.typ");
  await expect(page.locator("#diagnostics")).toContainText("notice.eligibility");
  await expect(
    page.locator(".preview-text-run").filter({ hasText: "up-to-date" }).first(),
  ).toBeAttached();
  await select("up-to-date");
  await expect(
    page.locator(".preview-text-run").filter({ hasText: "up-to-date" }).first(),
  ).toBeAttached();
});

test("repeated overdue agents remain in source facts but appear once in the notice", async ({
  page,
}) => {
  // Deliberate duplicate data stays in a fixture; the shared clients remain unchanged.
  const prepared = JSON.parse(
    execFileSync(
      "uv",
      [
        "run",
        "--locked",
        "python",
        "-c",
        `
import json
import shutil
import tempfile
from pathlib import Path
from scripts.native_core import prepare, typst_library_root
from scripts.project_template import PROJECT_TEMPLATE
with tempfile.TemporaryDirectory(prefix="studio-duplicate-fixture-") as scratch:
    templates = Path(scratch) / "templates"
    shutil.copytree(PROJECT_TEMPLATE / "templates", templates)
    shutil.copytree(typst_library_root(), templates / "lib/immuknow")
    print(json.dumps(prepare(str(Path("tests/fixtures/repeated-overdue.csv").resolve()),
        "--config", str(PROJECT_TEMPLATE / "config"),
        "--template", str(templates / "overdue_agents.en.typ"))["entries"][0]))
`,
      ],
      { encoding: "utf8" },
    ),
  );
  const filename = "overdue_agents.en.typ";
  await editExampleData(page, (bundle) => {
    const client = bundle.examples.find((item) => item.id === "missing-meningococcal")!;
    client.payloads[filename] = prepared.notice;
    client.preparationChecks[filename] = prepared.checks;
    client.deferredChecks = { ...client.deferredChecks, [filename]: prepared.deferred_checks };
    client.blockedChecks = { ...client.blockedChecks, [filename]: prepared.blocked_checks };
  });
  await page.goto("./");
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const index = bundle.examples.findIndex((item) => item.id === "missing-meningococcal");
  expect(index).toBeGreaterThanOrEqual(0);
  const agents = prepared.notice.overdue_agents as string[];
  expect(agents.filter((agent) => agent === "MMR")).toHaveLength(3);
  const warning = prepared.checks.find(
    (check: { code: string }) => check.code === "data.duplicate_overdue_agents",
  );
  expect(warning?.status).toBe("warn");
  const source = warning?.measurements?.source_value;
  expect(typeof source).toBe("string");
  expect(
    (source as string)
      .split(";")
      .map((value) => value.trim())
      .filter((value) => value === "MMR"),
  ).toHaveLength(3);

  await page.locator("#theme-tab").click();
  await chooseExample(page, index);
  await chooseTemplate(page, `templates/${filename}`);
  await expect
    .poll(
      () =>
        page.locator("#preview-state").evaluate((element) => {
          const state = (element as HTMLElement).dataset;
          return (
            Number(state.displayedRevision) > 0 &&
            state.displayedRevision === state.requestedRevision &&
            state.displayedContext === state.context
          );
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
  await page.locator("#notice-warnings summary").click();
  await expect(page.locator("#warnings-list")).toContainText("data.duplicate_overdue_agents");
  const firstPage = page.locator(".preview-page").first();
  await expect
    .poll(
      async () =>
        (await firstPage.locator(".preview-text-run").allTextContents()).join(" ").match(/\bMMR\b/g)
          ?.length ?? 0,
    )
    .toBe(1);
});
