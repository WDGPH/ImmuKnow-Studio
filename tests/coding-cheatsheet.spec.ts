import { expect, test } from "@playwright/test";

test("the coding cheat sheet works offline and preserves the source and selected tab", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(page.locator("#settings-tab")).toBeEnabled();
  await page.locator("#settings-tab").click();
  const before = await page.locator(".cm-content").textContent();
  await context.setOffline(true);
  const trigger = page.getByRole("button", { name: "Coding cheat sheet", exact: true });
  const dialog = page.getByRole("dialog", { name: "Typst and ImmuKnow coding cheat sheet" });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveCount(6);
  await expect(dialog).toContainText("notice.client_data.over_16");
  await expect(dialog).toContainText("#immunization-history()");
  await expect(dialog).toContainText("immuknow.query-url");
  await expect(dialog.getByRole("button", { name: "Close cheat sheet" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("#settings-tab")).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".cm-content").textContent()).toBe(before);
  await trigger.click();
  await dialog.getByRole("button", { name: "Close cheat sheet" }).click();
  await expect(dialog).not.toBeVisible();
});

test("the coding cheat sheet fits a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  await page.getByRole("button", { name: "Coding cheat sheet", exact: true }).click();
  const dialog = page.locator("#coding-cheatsheet-dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await dialog.getByRole("heading", { name: "Find help while editing" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("heading", { name: "Find help while editing" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Coding cheat sheet", exact: true })).toBeFocused();
});
