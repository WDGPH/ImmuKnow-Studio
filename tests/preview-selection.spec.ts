import { expect, test, type Page } from "@playwright/test";
import { exportProject } from "../src/archive-core";
import type { Bundle, Files } from "../src/types";

async function current(page: Page) {
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready", {
    timeout: 60_000,
  });
}

test("dragging preview text copies plain wording without changing source or opening an editor", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await current(page);
  const revision = await page.locator("#preview-state").getAttribute("data-requested-revision");
  const span = page
    .locator(".preview-text-run")
    .filter({ hasText: "If there is an outbreak" })
    .first();
  await span.scrollIntoViewIfNeeded();
  const box = await span.boundingBox();
  if (!box) throw new Error("Missing preview text");
  await page.mouse.move(box.x + 1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "If there is an outbreak",
  );
  expect(
    await page.evaluate(async () =>
      (await navigator.clipboard.read()).flatMap((item) => item.types),
    ),
  ).toEqual(["text/plain"]);
  await expect(page.locator("#editor .source-target")).toHaveCount(0);
  expect(await page.locator("#preview-state").getAttribute("data-requested-revision")).toBe(
    revision,
  );
  await expect(page.locator("#visual-editor, #visual-mode, #visual-outline")).toHaveCount(0);
});

test("double-clicking a repeated French phrase highlights its exact CRLF source occurrence", async ({
  page,
}) => {
  await page.goto("./");
  await current(page);
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const files: Files = Object.fromEntries(
    Object.entries(bundle.files).map(([path, bytes]) => [
      path,
      new Uint8Array(Buffer.from(bytes, "base64")),
    ]),
  );
  const template = "templates/overdue_diseases_v1.fr.typ";
  const phrase = "Même phrase répétée.";
  const source = `// Émoji 😀 et caractères accentués\r\n${new TextDecoder().decode(files[template]).replaceAll("\n", "\r\n")}\r\n${phrase}\r\n\r\n${phrase}\r\n`;
  files[template] = new TextEncoder().encode(source);
  const oldBuild = {
    ...bundle.build,
    compiler_build_sha256: "6aecf70c6e831c1d6b538064aec1620eb57c44e59c840323a51b1ebc690bbdca",
  };
  await page.locator("#archive").setInputFiles({
    name: "main-project.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(await exportProject(files, template, oldBuild)),
  });
  await expect(page.locator("#archive")).toHaveValue("");
  await current(page);
  const before = await page.locator("#preview-state").getAttribute("data-requested-revision");
  const spans = page.locator(".preview-text-run").filter({ hasText: phrase });
  await expect(spans).toHaveCount(2);
  for (const index of [0, 1]) {
    await spans.nth(index).dblclick();
    await expect(page.locator("#editor .source-target")).toHaveText(phrase);
    const preceding = await page.locator("#editor .cm-content").evaluate((el) => {
      const marked = el.querySelector(".source-target");
      if (!marked) throw new Error("Missing source highlight");
      const range = document.createRange();
      range.selectNodeContents(el);
      range.setEndBefore(marked);
      return range.toString();
    });
    // Only the second occurrence has another copy immediately before it.
    if (index === 0) expect(preceding).not.toContain(phrase);
    else expect(preceding).toContain(phrase);
  }
  const target = page.locator(".preview-source-target");
  await expect(target).toHaveCSS("position", "absolute");
  const bounds = await target.boundingBox();
  const paper = await target.locator("..").boundingBox();
  if (!bounds || !paper) throw new Error("Missing preview source target");
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(paper.y + paper.height);
  expect(await page.locator("#preview-state").getAttribute("data-requested-revision")).toBe(before);
  await page.locator("#editor .cm-content").press("Control+End");
  await page.keyboard.insertText('\n#panic("Selection must wait for a current preview")');
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "stale");
  await spans.nth(1).dblclick();
  await expect(page.locator("#editor .source-target")).toHaveCount(0);
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "stale");
});
