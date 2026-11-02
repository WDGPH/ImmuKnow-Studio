import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { chooseTemplate, confirmProjectChange, downloadProject, editExampleData } from "./helpers";

test("Theme edits explicit signature paths and names without changing the authored width", async ({
  page,
}) => {
  await editExampleData(page, (bundle) => {
    const path = "templates/overdue_diseases_v1.en.typ";
    const source = Buffer.from(bundle.files[path], "base64")
      .toString("utf8")
      .replace("width: 4.5cm", "width: 3cm");
    bundle.files[path] = Buffer.from(source).toString("base64");
  });
  await page.goto("./");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#theme-tab").click();
  const image = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><path d="M0 25L200 25" stroke="black"/></svg>',
  );
  await page
    .locator("#signature-upload")
    .setInputFiles({ name: "signature.svg", mimeType: "image/svg+xml", buffer: image });
  await page.locator("#signature-name-picker").fill("Dr. Example, MD, MPH");
  await page.locator("#signature-name-picker").press("Tab");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#reset").click();
  await confirmProjectChange(page, "template");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#theme-tab").click();
  await expect(page.locator("#signature-name-picker")).toHaveValue("Dr. Example, MD, MPH");
  await expect(page.locator("#signature-preview")).toBeVisible();
  const pending = page.waitForEvent("download");
  await downloadProject(page);
  const path = await (await pending).path();
  const files = unzipSync(readFileSync(path as string));
  const source = new TextDecoder().decode(files["templates/overdue_diseases_v1.en.typ"]);
  expect(source).toContain('signature: image("assets/studio-signature.svg", width: 3cm)');
  expect(source).toContain('name: "Dr. Example, MD, MPH"');
  expect(Buffer.from(files["templates/assets/studio-signature.svg"])).toEqual(image);
});

test("printed credentials stay separate from the suspension order name", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#theme-tab").click();
  await chooseTemplate(page, "templates/suspension_order_v1.en.typ");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#health-unit-preset").selectOption("trillium-valley");
  await expect(page.locator("#signature-name-picker")).toHaveValue("Dr. Phil Better");
  await page.locator("#signature-name-picker").fill("Dr. Phil Better, MD, MPH");
  await page.locator("#signature-name-picker").press("Tab");
  await expect(page.locator("#preview-state")).toHaveAttribute("data-state", "ready");
  await page.locator("#template-tab").click();
  await expect(page.locator(".cm-content")).toContainText(
    '#let order-signatory-name = "Dr. Phil Better"',
  );
  await expect(page.locator(".cm-content")).toContainText('name: "Dr. Phil Better, MD, MPH"');
});
