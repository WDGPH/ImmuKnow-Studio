import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// The full Chromium browser includes its ordinary PDF viewer; headless shell does not.
test.use({ channel: "chromium", locale: "en-US" });

for (const [language, password] of [
  ["en", "Example-2026"],
  ["fr", "Été-2026-Чтение"],
]) {
  test(`encrypted ${language} notice opens in the PDF viewer only with its password`, async ({
    page,
    browser,
  }, info) => {
    const directory = info.outputPath("notice");
    execFileSync(
      "uv",
      [
        "run",
        "python",
        "-c",
        `
import base64, json, shutil, sys
from pathlib import Path
import yaml
from immuknow.orchestrator import run_pipeline
bundle = json.loads(Path("public/generated/project.json").read_text())
directory = Path(sys.argv[1])
for name, value in bundle["files"].items():
    target = directory / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(base64.b64decode(value))
parameters = directory / "config/parameters.yaml"
config = yaml.safe_load(parameters.read_text())
config["encryption"] = {"enabled": True, "password": {"template": sys.argv[3]}}
parameters.write_text(yaml.safe_dump(config))
record_path = run_pipeline(
    directory / f"examples/clients/short.{sys.argv[2]}.csv",
    directory / "runs",
    notice_template=directory / f"templates/overdue_diseases_v1.{sys.argv[2]}.typ",
    config_dir=directory / "config",
)
record = json.loads(record_path.read_text())
assert record["entries"][0]["encryption"]["status"] == "completed", record
shutil.copyfile(record_path.parent / record["entries"][0]["encryption"]["path"], directory / "encrypted.pdf")
`,
        directory,
        language,
        password,
      ],
      { cwd: resolve("."), timeout: 60_000 },
    );
    const pdf = readFileSync(resolve(directory, "encrypted.pdf"));
    await page.route("**/encrypted-notice.pdf", (route) =>
      route.fulfill({ contentType: "application/pdf", body: pdf }),
    );
    await page.goto("encrypted-notice.pdf");
    await expect
      .poll(() =>
        page
          .frames()
          .find((frame) => frame.url().startsWith("chrome-extension://"))
          ?.url(),
      )
      .toBeTruthy();
    const viewer = page.frames().find((frame) => frame.url().startsWith("chrome-extension://"));
    expect(viewer).toBeDefined();
    if (!viewer) throw new Error("Chromium PDF viewer did not open");
    const input = viewer.locator('input[type="password"]');
    const submit = viewer.getByRole("button", { name: "Submit", exact: true });
    await expect(input).toBeVisible();
    await expect(viewer.locator("#pageSelector")).toBeHidden();
    await input.fill("wrong-password");
    await submit.click();
    await expect(viewer.locator("cr-input")).toHaveJSProperty("invalid", true);
    await expect(input).toBeVisible();
    await input.fill(password);
    await submit.click();
    await expect(input).toBeHidden();
    await expect(viewer.locator("pdf-viewer")).toHaveJSProperty("loadProgress_", 100);
    await expect(viewer.locator("#pageSelector")).toHaveValue("1");
    await page.screenshot({ path: info.outputPath("opened.png") });
    writeFileSync(
      info.outputPath("reader.json"),
      JSON.stringify(
        {
          reader: "Chromium PDF viewer",
          version: browser.version(),
          language,
          emptyPassword: "password required on opening",
          wrongPassword: "refused",
          correctPassword: "opened",
        },
        null,
        2,
      ),
    );
  });
}
