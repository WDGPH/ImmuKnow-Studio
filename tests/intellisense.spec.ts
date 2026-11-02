import { expect, test, type Page } from "@playwright/test";

async function replaceSource(page: Page, text: string) {
  const source = page.getByRole("textbox", { name: "Source editor" });
  await source.click();
  await source.press("Control+a");
  await page.keyboard.insertText(text);
  return source;
}

test("complete a shared component and its arguments, then undo the insertion", async ({ page }) => {
  await page.goto("./");
  await page.locator("#template-tab").click();
  const source = await replaceSource(page, "#immuknow.immunization-hist");
  await source.press("Control+Space");
  const option = page.getByRole("option").filter({ hasText: "immunization-history" });
  await expect(option).toBeVisible();
  // CodeMirror ignores acceptance keys for 75 ms after showing a new menu.
  await page.waitForTimeout(100);
  await source.press("Enter");
  await expect(source).toHaveText("#immuknow.immunization-history");
  await source.press("Control+z");
  await expect(source).toHaveText("#immuknow.immunization-hist");

  await replaceSource(page, "#immuknow.immunization-history(show-val");
  await source.press("Control+Space");
  await expect(page.getByRole("option").filter({ hasText: "show-validity" })).toBeVisible();
  await page.waitForTimeout(100);
  await source.press("Enter");
  await expect(source).toContainText("show-validity:");
});

test("complete local history and page options", async ({ page }) => {
  await page.goto("./");
  await page.locator("#template-tab").click();
  for (const [text, name] of [
    ["#immuknow.immunization-history(show-a", "show-age"],
    ['#immuknow.notice-page("History", title-s', "title-size"],
  ]) {
    const source = await replaceSource(page, text);
    await source.press("Control+Space");
    await expect(page.getByRole("option").filter({ hasText: name })).toBeVisible();
    await page.waitForTimeout(100);
    await source.press("Enter");
    await expect(source).toContainText(`${name}:`);
  }
});

test("completion stays out of prose, comments, strings and raw examples", async ({ page }) => {
  await page.goto("./");
  await page.locator("#template-tab").click();
  for (const text of [
    "Please send your immunization-hist",
    "// #immuknow.immunization-hist",
    "/* outer /* nested */ #immuknow.immunization-hist",
    '#let words = "#immuknow.immunization-hist',
    "`#immuknow.immunization-hist",
  ]) {
    const source = await replaceSource(page, text);
    await source.press("Control+Space");
    await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0);
  }
});

test("expanded hover help explains shared notice components", async ({ page }) => {
  await page.goto("./");
  await page.locator("#template-tab").click();
  await replaceSource(page, "#immuknow.immunization-history()");
  await page.locator(".cm-line").getByText("immunization-history", { exact: true }).hover();
  await expect(page.locator(".function-help")).toContainText("show-validity");
});

test("typing code in Settings opens suggestions and Escape dismisses them", async ({ page }) => {
  await page.goto("./");
  await page.locator("#settings-tab").click();
  const source = await replaceSource(page, "");
  await source.pressSequentially("#te", { delay: 80 });
  await expect(page.getByRole("option").filter({ hasText: /^text/ })).toBeVisible();
  await source.press("Escape");
  await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0);
  await expect(source).toHaveText("#te");
});
