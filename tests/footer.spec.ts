import { expect, test } from "@playwright/test";
import type { Bundle } from "../src/types";
import { studioBuild } from "../studio-build";

test("footer identifies the running Studio build and its pinned Core on desktop and mobile", async ({ page }) => {
  const { revision, tag } = studioBuild(process.cwd());
  await page.goto("./");
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const core = bundle.build.core_source_revision;
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Built by Wellington-Dufferin-Guelph Public Health");
  await expect(footer.getByRole("link", { name: "MIT License" })).toHaveAttribute(
    "href", "https://github.com/WDGPH/ImmuKnow-Studio/blob/main/LICENSE",
  );
  await expect(footer.locator("#studio-version")).toHaveText(
    `${tag ? `${tag} · ` : ""}${revision.slice(0, 7)}`,
  );
  await expect(footer.locator("#studio-version")).toHaveAttribute("title", revision);
  await expect(footer.locator("#studio-sha")).toHaveAttribute(
    "href", `https://github.com/WDGPH/ImmuKnow-Studio/commit/${revision}`,
  );
  await expect(footer.locator("#studio-sha")).toHaveAttribute("target", "_blank");
  await expect(footer.locator("#core-version")).toHaveText(
    `Engine: ImmuKnow ${core?.slice(0, 7) || bundle.build.application_version}`,
  );
  await expect(footer.locator("#core-version")).toHaveAttribute(
    "title", core || bundle.build.application_version,
  );
  if (core) {
    await expect(footer.locator("#core-sha")).toHaveAttribute(
      "href", `https://github.com/WDGPH/ImmuKnow/commit/${core}`,
    );
    await expect(footer.locator("#core-sha")).toHaveAttribute("target", "_blank");
  } else {
    await expect(footer.locator("#core-version").getByRole("link")).toHaveCount(0);
  }
  await expect(footer).toBeInViewport();
  await page.setViewportSize({ width: 375, height: 812 });
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator("#studio-version")).toBeInViewport();
  await expect(footer.locator("#core-version")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
