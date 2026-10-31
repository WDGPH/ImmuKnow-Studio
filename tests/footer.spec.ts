import { expect, test } from "@playwright/test";
import { studioBuild } from "../studio-build";

test("footer shows only the Studio version on desktop and mobile", async ({ page }, info) => {
  const { revision, tag } = studioBuild(process.cwd());
  await page.goto("./");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toHaveText(`ImmuKnow Studio ${tag ?? revision.slice(0, 7)}`);
  await expect(footer.locator("#studio-version")).toHaveAttribute("title", revision);
  await expect(footer.getByRole("link")).toHaveCount(1);
  await expect(footer.getByRole("link")).toHaveAttribute(
    "href", `https://github.com/WDGPH/ImmuKnow-Studio/commit/${revision}`,
  );
  await expect(footer.getByRole("link")).toHaveAttribute("target", "_blank");
  await expect(footer).toBeInViewport();
  await page.screenshot({ path: info.outputPath("footer-desktop.png") });
  await page.setViewportSize({ width: 375, height: 812 });
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator("#studio-version")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.screenshot({ path: info.outputPath("footer-mobile.png") });
});
