import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const source = `#import "setup.typ": *
#show: immuknow.letter
#immuknow.qr-code(url: n => "https://example.test/record?id=" + n.client_id + "&initials=" + n.client_data.first_initial + n.client_data.last_initial)

#immuknow.link("https://example.test/text#details")[Open the record]

#rotate(15deg, reflow: true)[#link("https://example.test/rotated")[Rotated link]]

#link("mailto:records@example.test")[Email records]
#link("tel:+15555550100")[Call records]
#link("javascript:alert(1)")[Unsupported destination]

#link(<details>)[Go to details]
#pagebreak()
= Details <details>
#box(width: 90pt)[#link("https://example.test/wrapped")[A longer link label that wraps onto several lines]]
`;

async function compile(page: Page) {
  await page.goto("proof.html");
  await page.waitForFunction(() => Boolean(window.proof?.compiler.compilerVersion));
  const revision = await page.evaluate((source) => {
    const job = window.proof.job;
    return window.proof.submit([
      {
        ...job,
        files: { ...job.files, [`/${job.template}`]: new TextEncoder().encode(source) },
      },
    ]);
  }, source);
  await page.waitForFunction(
    (revision) => window.proof.results.some((result) => result.revision === revision),
    revision,
  );
  const diagnostics = await page.evaluate(
    (revision) => window.proof.results.find((result) => result.revision === revision)?.diagnostics,
    revision,
  );
  expect(diagnostics?.filter((item) => item.severity === "error")).toEqual([]);
  await page.waitForFunction(
    (revision) =>
      Boolean(
        window.proof.results.find((result) => result.revision === revision)?.timing?.committed,
      ),
    revision,
  );
  return revision;
}

test("preview link destinations and rectangles match PDF annotations, including QR codes, wrapping and transforms", async ({
  page,
}, info) => {
  const revision = await compile(page);
  const pages = await page.evaluate(
    (revision) =>
      window.proof.results.find((result) => result.revision === revision)?.preview?.pages,
    revision,
  );
  if (!pages) throw new Error("Missing preview");
  const pdf = info.outputPath("links.pdf");
  writeFileSync(
    pdf,
    Buffer.from(
      await page.evaluate(
        async (revision) => Array.from(await window.proof.exportPdf(revision)),
        revision,
      ),
    ),
  );
  const annotations = JSON.parse(
    execFileSync(
      "uv",
      [
        "run",
        "--locked",
        "--group",
        "browser",
        "python",
        "-c",
        `
import json,sys
from pypdf import PdfReader
links=[]
for index,page in enumerate(PdfReader(sys.argv[1]).pages):
    for reference in page.annotations or []:
        annotation=reference.get_object()
        action=annotation.get('/A', {})
        if action.get('/S') != '/URI': continue
        x0,y0,x1,y1=map(float, annotation['/Rect'])
        links.append(dict(page=index, url=str(action['/URI']), x=x0,
            y=float(page.mediabox.height)-y1, width=x1-x0, height=y1-y0))
print(json.dumps(links))
`,
        pdf,
      ],
      { encoding: "utf8" },
    ),
  ) as { page: number; url: string; x: number; y: number; width: number; height: number }[];
  const links = pages.flatMap((page, index) =>
    (page.links ?? []).filter((link) => "url" in link).map((link) => ({ ...link, page: index })),
  );
  expect(links).toHaveLength(annotations.length);
  const initials = await page.evaluate(() => {
    const client = window.proof.job.notice.client_data;
    return `${client.first_initial}${client.last_initial}`;
  });
  expect(links.some((link) => "url" in link && new URL(link.url).searchParams.get("initials") === initials)).toBe(true);
  for (const annotation of annotations) {
    expect(
      links.some(
        (link) =>
          "url" in link &&
          link.url === annotation.url &&
          link.page === annotation.page &&
          (["x", "y", "width", "height"] as const).every(
            (key) => Math.abs(link[key] - annotation[key]) < 0.02,
          ),
      ),
    ).toBe(true);
  }
  expect(
    links.filter((link) => "url" in link && link.url.endsWith("/wrapped")).length,
  ).toBeGreaterThan(1);
  const anchors = page.locator(".preview-link");
  // Unsafe schemes remain printable, without becoming executable browser links.
  await expect(page.locator('a.preview-link[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('a.preview-link[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator('a.preview-link[href^="tel:"]')).toHaveCount(1);
  await expect(anchors).toHaveCount(annotations.length); // One unsafe URL omitted; one internal link added.
  const internal = await page.getByRole("link", { name: "Go to notice page 2" }).boundingBox();
  if (!internal) throw new Error("Missing internal link");
  await page.mouse.click(internal.x + internal.width / 2, internal.y + internal.height / 2);
  await expect.poll(() => page.evaluate(() => window.proof.viewer.page)).toBe(2);
});

test("QR and text links open their destinations at every zoom while linked text remains selectable", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.route("https://example.test/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Example record" }),
  );
  await compile(page);
  for (const factor of [1, 1.2, 1 / 1.2]) {
    await page.evaluate((factor) => window.proof.viewer.zoomBy(factor), factor);
    for (const kind of ["qr", "text"]) {
      const target =
        kind === "qr"
          ? page.locator('a.preview-link[href^="https://example.test/record?"]')
          : page.locator(".preview-text-run").filter({ hasText: "Open the record" });
      const popupPromise = page.waitForEvent("popup");
      await target.click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      expect(popup.url()).toContain(kind === "qr" ? "/record?id=" : "/text#details");
      expect(await popup.evaluate(() => window.opener)).toBeNull();
      expect(await popup.evaluate(() => document.referrer)).toBe("");
      await popup.close();
    }
  }
  const label = page.locator(".preview-text-run").filter({ hasText: "Open the record" });
  await expect(label).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  await label.scrollIntoViewIfNeeded();
  const bounds = await label.boundingBox();
  if (!bounds) throw new Error("Missing linked label");
  let popups = 0;
  page.on("popup", () => popups++);
  await page.mouse.move(bounds.x + 1, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 1, bounds.y + bounds.height / 2, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Open the record");
  await page.waitForTimeout(400);
  expect(popups).toBe(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const anchor = page.locator('a.preview-link[href="https://example.test/text#details"]');
  await anchor.focus();
  const popupPromise = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("https://example.test/text#details");
  await popup.close();
  const middleClickPopup = page.waitForEvent("popup", { timeout: 5_000 });
  await label.click({ button: "middle" });
  const middle = await middleClickPopup;
  await middle.waitForLoadState();
  expect(middle.url()).toBe("https://example.test/text#details");
  await middle.close();
});
