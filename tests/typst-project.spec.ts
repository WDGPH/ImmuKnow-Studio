import { downloadProject, chooseExample, chooseTemplate } from "./helpers";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { exportProject } from "../src/archive-core";
import type { Bundle, Files } from "../src/types";

test.use({ actionTimeout: 15_000 });
const fontCount = Object.keys(
  JSON.parse(readFileSync(resolve("assets/fonts/manifest.json"), "utf8")),
).length;

// Exercise download-specific boundaries rather than every Core notice family.
// The customized English project covers both selectors; French cases cover
// long output and saved-run review. Core tests the full native notice catalog.
const cases = [
  ["short", "overdue_diseases_v1.en.typ"],
  ["long-history", "overdue_diseases_v1.fr.typ"],
  ["source-warnings", "overdue_agents_v1.fr.typ"],
];

for (const [scenario, filename] of cases) {
  test(`downloaded Typst project matches the preview: ${scenario} / ${filename}`, async ({
    page,
  }, info) => {
    test.setTimeout(240_000);
    await page.goto("./");
    const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
    const expectedFiles = { ...bundle.files };
    const examples = bundle.examples.filter((example) => example.payloads[filename]);
    const index = examples.findIndex((example) => example.id === scenario);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.locator("#theme-tab").click();
    await chooseTemplate(page, `templates/${filename}`);
    await chooseExample(page, index);
    if (scenario === "short" && filename.startsWith("overdue_diseases_v1.")) {
      // Check a custom ID label, Unicode QR destination and font control after download.
      const imported: Files = Object.fromEntries(
        Object.entries(bundle.files).map(([path, bytes]) => [
          path,
          new Uint8Array(Buffer.from(bytes, "base64")),
        ]),
      );
      const path = "templates/settings.typ";
      let authored =
        '\ufeff/*\r\n#let body-font = "FreeSerif"\r\n/* nested example */\r\n*/\r\n' +
        new TextDecoder()
          .decode(imported[path])
          .replace("https://example.org/update", "https://exämple.org/élève")
          .replaceAll("\n", "\r\n");
      if (filename.endsWith(".fr.typ")) {
        authored = authored.replace(/^#let envelope-window = .*$/m, "#let envelope-window = none");
      }
      imported[path] = new TextEncoder().encode(authored);
      const templatePath = `templates/${filename}`;
      const labelled = new TextDecoder()
        .decode(imported[templatePath])
        .replace("  notice,", '  notice, id-label: "Record number",');
      imported[templatePath] = new TextEncoder().encode(labelled);
      expectedFiles[templatePath] = Buffer.from(labelled).toString("base64");
      const zip = await exportProject(imported, `templates/${filename}`, bundle.build);
      await page.locator("#archive").setInputFiles({
        name: "commented-settings.zip",
        mimeType: "application/zip",
        buffer: Buffer.from(zip),
      });
      await expect(page.locator("#archive")).toHaveValue("");
      await expect(page.locator("#body-font-picker")).toHaveValue("FreeSans");
      await page.locator("#body-font-picker").selectOption("FreeSerif");
      expectedFiles[path] = Buffer.from(
        authored.replace('#let body-font = "FreeSans"', '#let body-font = "FreeSerif"'),
      ).toString("base64");
    }
    await expect(page.locator("#example")).toHaveText(
      `Example client ${String(index + 1).padStart(2, "0")}`,
    );
    await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
    await expect
      .poll(
        () =>
          page.locator("#preview-state").evaluate((element) => {
            const state = (element as HTMLElement).dataset;
            return (
              state.displayedRevision === state.requestedRevision &&
              state.displayedContext === state.context &&
              Number(state.displayedRevision) > 0
            );
          }),
        { timeout: 60_000 },
      )
      .toBe(true);
    const findings = await page.locator("#diagnostics li").evaluateAll((items) =>
      items.map((item) => {
        const code = item.textContent?.match(/\(([^()]+)\)$/)?.[1];
        if (!code) throw new Error(`Unexpected browser diagnostic: ${item.textContent}`);
        return `${code}:${item.classList.contains("error") ? "fail" : "warn"}`;
      }),
    );
    const preview = await page.locator(".preview-page").evaluateAll((papers) =>
      papers.map((paper) => {
        const canvas = paper.querySelector("canvas");
        if (!canvas) throw new Error("Preview page has no canvas");
        return {
          width: canvas.width,
          height: canvas.height,
          plainText: paper.querySelector(".visually-hidden")?.textContent ?? "",
          png: canvas.toDataURL("image/png").split(",")[1],
        };
      }),
    );
    expect(preview.length).toBeGreaterThan(0);
    writeFileSync(
      info.outputPath("preview-pages.json"),
      JSON.stringify(
        preview.map(({ png: _png, ...page }) => page),
        null,
        2,
      ),
    );
    for (const [index, page] of preview.entries()) {
      writeFileSync(
        info.outputPath(`preview-page-${index + 1}.png`),
        Buffer.from(page.png, "base64"),
      );
    }
    await page.screenshot({ path: info.outputPath("preview.png"), fullPage: true });
    await page.locator(".project-actions summary").click();
    const projectDownload = page.waitForEvent("download", { timeout: 30_000 });
    await downloadProject(page, scenario !== "short");
    await (await projectDownload).saveAs(info.outputPath("typst-project.zip"));
    const files = unzipSync(readFileSync(info.outputPath("typst-project.zip")));
    delete files["immuknow-project.json"];
    for (const [path, bytes] of Object.entries(files)) {
      if (
        path.startsWith("templates/fonts/") ||
        path.startsWith("input/sample/") ||
        path === "sample.json"
      )
        continue;
      expect(Buffer.from(bytes).toString("base64"), path).toBe(expectedFiles[path]);
    }
    expect(Object.keys(files).filter((path) => /^templates\/.+\.(en|fr)\.typ$/.test(path))).toEqual(
      [`templates/${filename}`],
    );
    expect(
      Object.keys(files)
        .filter((path) => path.startsWith("examples/") && !path.endsWith("README.md"))
        .sort(),
    ).toEqual(Object.values(examples[index].inputs[filename]).sort());
    expect(files["scripts/run.py"]).toBeDefined();
    expect(Object.keys(files).some((path) => path.startsWith("tests/"))).toBe(false);
    expect(files["uv.lock"]).toBeDefined();
    expect(files["pyproject.toml"]).toBeDefined();
    expect(JSON.parse(new TextDecoder().decode(files["sample.json"]))).toEqual({
      csv: "input/sample/sample_students.csv",
      assignments: "input/sample/sample_assignments.json",
    });
    expect(files["input/sample/sample_students.csv"]).toEqual(
      files[examples[index].inputs[filename].csv],
    );
    expect(files["input/sample/sample_assignments.json"]).toEqual(
      files[examples[index].inputs[filename].assignments],
    );
    const source = JSON.parse(new TextDecoder().decode(files["template-source.json"]));
    expect(source.repository).toBe("https://github.com/WDGPH/ImmuKnow-Template");
    expect(source.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(files).filter((path) => /\.(ttf|otf)$/.test(path))).toHaveLength(
      scenario === "short" ? 0 : fontCount,
    );
    if (scenario !== "short") expect(files["templates/fonts/LICENSE"]).toBeDefined();
    writeFileSync(
      info.outputPath("selected-example.json"),
      JSON.stringify({
        template: `templates/${filename}`,
        example: scenario,
        input: examples[index].inputs[filename],
      }),
    );

    // The proof page exercises PDF output internally; Studio offers only the project ZIP.
    const proof = await page.context().newPage();
    await proof.goto("./proof.html");
    await proof.waitForFunction(() => window.proof);
    const revision = await proof.evaluate(
      ({ files, template, notice, creationTimestamp }) => {
        return window.proof.submit([
          {
            template,
            notice,
            creationTimestamp,
            example: "export-comparison",
            files: Object.fromEntries(
              Object.entries(files).map(([path, bytes]) => [
                `/${path}`,
                Uint8Array.from(atob(bytes), (character) => character.charCodeAt(0)),
              ]),
            ),
          },
        ]);
      },
      {
        files: Object.fromEntries(
          Object.entries(files).map(([path, bytes]) => [
            path,
            Buffer.from(bytes).toString("base64"),
          ]),
        ),
        template: `templates/${filename}`,
        notice: examples[index].payloads[filename],
        creationTimestamp: bundle.creationTimestamp,
      },
    );
    await proof.waitForFunction(
      (revision) => window.proof.results.some((result) => result.revision === revision),
      revision,
    );
    const pdf = await proof.evaluate(async (revision) => {
      const bytes = await window.proof.exportPdf(revision);
      let text = "";
      for (let start = 0; start < bytes.length; start += 8192)
        text += String.fromCharCode(...bytes.subarray(start, start + 8192));
      return btoa(text);
    }, revision);
    writeFileSync(info.outputPath("browser.pdf"), Buffer.from(pdf, "base64"));
    await proof.close();
    execFileSync("uv", ["run", "python", "tests/check_typst_project.py", info.outputDir], {
      cwd: resolve("."),
      timeout: 180_000,
      stdio: "pipe",
    });
    const native = JSON.parse(readFileSync(info.outputPath("comparison.json"), "utf8"));
    expect(native.template).toBe(`templates/${filename}`);
    expect(native.example).toBe(scenario);
    for (const result of native.selectors) {
      expect(Math.min(...result.textCoverage)).toBeGreaterThanOrEqual(0.95);
      expect(result.qrUrls).toEqual(native.browser.qrUrls);
      expect(result.findings).toEqual([...new Set(findings)].sort());
    }
    expect(native.selectors).toHaveLength(scenario === "short" ? 2 : 1);
    if (scenario === "short")
      expect(native.selectors[0].summary).toEqual(native.selectors[1].summary);
    if (scenario === "long-history") expect(native.browser.text.length).toBeGreaterThan(2);
    if (scenario === "source-warnings") expect(native.rebundled).toBe(true);
  });
}
