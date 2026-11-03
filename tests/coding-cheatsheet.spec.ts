import { expect, test } from "@playwright/test";

test("the Typst Reference works offline and preserves the source and selected tab", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(page.locator("#settings-tab")).toBeEnabled();
  await page.locator("#settings-tab").click();
  const before = await page.locator(".cm-content").textContent();
  await context.setOffline(true);
  const trigger = page
    .locator("header")
    .getByRole("button", { name: "Typst Reference", exact: true });
  const dialog = page.getByRole("dialog", { name: "Typst Reference" });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveCount(9);
  await expect(
    dialog.getByRole("heading", { name: "Client information", exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText("#if to_student");
  await expect(dialog).toContainText("#if no_records");
  await expect(dialog).toContainText("missing-oiid: auto");
  await expect(dialog).toContainText("ispa_up_to_date");
  await expect(dialog).toContainText("#immuknow.immunization-history()");
  await expect(dialog).toContainText("immuknow.query-url");
  await expect(dialog).toContainText('image("assets/signature.png", width: 4.5cm)');
  await expect(dialog.getByRole("button", { name: "Close reference" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("#settings-tab")).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".cm-content").textContent()).toBe(before);
  await trigger.click();
  await dialog.getByRole("button", { name: "Close reference" }).click();
  await expect(dialog).not.toBeVisible();
});

test("the Typst Reference fits a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  await page.getByRole("button", { name: "Typst Reference", exact: true }).click();
  const dialog = page.locator("#coding-cheatsheet-dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await dialog.getByRole("heading", { name: "Editor shortcuts" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("heading", { name: "Editor shortcuts" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Typst Reference", exact: true })).toBeFocused();
});
