import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, type Page, test, type TestInfo } from "@playwright/test";
import { unzipSync } from "fflate";
import type { NativeRuntime } from "../src/native-runtime";

const pins: { version: string; revision: string; platforms: NativeRuntime[] } = JSON.parse(
  readFileSync(resolve("native-runtimes.json"), "utf8"),
);

const runtime = pins.platforms.find((item) => item.id === "linux-x86_64");
if (!runtime) throw new Error("The reviewed Linux runtime is missing");
const linux = runtime;
const runtimeRoute = `**/generated/runtimes/${linux.filename}`;
const stagedArchive = resolve("public/generated/runtimes", linux.filename);
const decoder = new TextDecoder();

test.use({ actionTimeout: 15_000 });

async function currentPreview(page: Page) {
  await expect
    .poll(
      () =>
        page.locator("#preview-state").evaluate((element) => {
          const state = (element as HTMLElement).dataset;
          return (
            Number(state.displayedRevision) > 0 &&
            state.displayedRevision === state.requestedRevision &&
            state.displayedContext === state.context
          );
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
}

async function openDownload(page: Page, kind?: string) {
  const menu = page.locator(".project-actions");
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  await page.locator("#export").click();
  await expect(page.locator("#download-dialog")).toBeVisible();
  if (kind) await page.locator(`input[name="download-kind"][value="${kind}"]`).check();
}

async function downloadFiles(page: Page) {
  const pending = page.waitForEvent("download");
  await page.locator("#download-confirm").click();
  const download = await pending;
  const path = await download.path();
  if (!path) throw new Error("No downloaded project was saved");
  return { download, files: unzipSync(readFileSync(path)), path };
}

function watchRuntimes(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/generated/runtimes/")) requests.push(request.url());
  });
  return requests;
}

function runBundledProject(archive: string, info: TestInfo) {
  const temporary = mkdtempSync(join(tmpdir(), "ImmuKnow runtime "));
  const project = join(temporary, "Extracted project with spaces");
  const utilities = join(temporary, "system utilities");
  const log = info.outputPath("bundled-native.log");
  try {
    const unzip = spawnSync("unzip", ["-q", archive, "-d", project], { encoding: "utf8" });
    expect(unzip.status, unzip.stderr).toBe(0);
    mkdirSync(utilities);
    // Permit extraction utilities only: no global ImmuKnow, Python, uv or Typst.
    for (const name of ["sh", "dirname", "mkdir", "tar", "gzip", "chmod", "sha256sum"]) {
      const source = [join("/usr/bin", name), join("/bin", name)].find(existsSync);
      if (!source) throw new Error(`Missing operating-system utility: ${name}`);
      symlinkSync(source, join(utilities, name));
    }
    const env = {
      PATH: utilities,
      LANG: "C.UTF-8",
      TYPST_IGNORE_SYSTEM_FONTS: "true",
      TYPST_IGNORE_EMBEDDED_FONTS: "true",
    };
    const launch = (...args: string[]) => {
      const result = spawnSync(join(project, "immuknow"), args, {
        cwd: temporary,
        env,
        encoding: "utf8",
        timeout: 90_000,
      });
      appendFileSync(log, `${JSON.stringify(args)}\n${result.stdout}\n${result.stderr}\n`);
      expect(result.error).toBeUndefined();
      return result;
    };
    expect(statSync(join(project, "immuknow")).mode & 0o111).not.toBe(0);
    const version = launch("--version");
    expect(version.status, version.stderr).toBe(0);
    expect(version.stdout).toContain(pins.version);
    const extracted = readdirSync(join(project, "runtime"), { withFileTypes: true }).filter(
      (entry) => entry.isDirectory(),
    );
    expect(extracted).toHaveLength(1);
    expect(existsSync(join(project, "runtime", extracted[0].name, "LICENSE"))).toBe(true);
    expect(existsSync(join(project, "runtime", extracted[0].name, ".complete"))).toBe(true);

    const sample = launch("run", "--sample");
    const output = `${sample.stdout}\n${sample.stderr}`;
    expect(sample.status, output).toBe(0);
    expect(output).toContain("Severity (1 source records):");
    expect(output).toContain("records.csv");
    expect(output).toContain("findings.csv");
    expect(output).not.toMatch(/unknown font family|failed to load font/i);
    const runs = readdirSync(join(project, "runs"), { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );
    expect(runs).toHaveLength(1);
    const runDirectory = join(project, "runs", runs[0].name);
    const run = JSON.parse(readFileSync(join(runDirectory, "run.json"), "utf8"));
    expect(["completed", "completed_with_warnings"]).toContain(run.status);
    expect(run.entries).toHaveLength(1);
    expect(run.entries[0].original.status).toBe("completed");
    expect(run.entries[0].original.pages).toBeGreaterThan(0);
    const pdf = readFileSync(join(runDirectory, run.entries[0].original.path));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1_000);

    const invalid = launch("--not-an-immuknow-option");
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain("unexpected argument");
    expect(readdirSync(join(project, "runs"))).toHaveLength(1);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

test("runtime archives are fetched only for an explicitly selected ready-to-run download", async ({
  page,
}, info) => {
  const requests = watchRuntimes(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", { value: undefined });
  });
  await page.goto("./");
  await currentPreview(page);
  expect(requests).toEqual([]);
  await openDownload(page);
  await expect(page.locator('input[name="download-kind"][value="runtime"]')).toBeChecked();
  await expect(page.locator("#runtime-platform")).toHaveValue("");
  await page.locator("#download-confirm").click();
  await expect(page.locator("#download-dialog")).toBeVisible();
  expect(requests).toEqual([]);
  await page.screenshot({ path: info.outputPath("runtime-options-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("runtime-options-mobile.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('input[name="download-kind"][value="project"]').check();
  const project = await downloadFiles(page);
  expect(project.files["sample.json"]).toBeDefined();
  await openDownload(page, "typst");
  const source = await downloadFiles(page);
  expect(Object.keys(source.files).every((path) => path.endsWith(".typ"))).toBe(true);
  expect(requests).toEqual([]);
});

test("a manual workstation choice takes precedence over delayed browser hints", async ({ page }) => {
  await page.addInitScript(() => {
    const hints = new Promise((resolve) => {
      window.addEventListener("release-platform-hints", () => {
        resolve({ architecture: "x86", bitness: "64" });
      }, { once: true });
    });
    Object.defineProperty(navigator, "userAgentData", {
      value: { platform: "Windows", getHighEntropyValues: () => hints },
    });
  });
  await page.goto("./");
  await currentPreview(page);
  await openDownload(page, "runtime");
  const platform = page.locator("#runtime-platform");
  await platform.selectOption("macos-aarch64");
  await page.evaluate(async () => {
    window.dispatchEvent(new Event("release-platform-hints"));
    await new Promise(requestAnimationFrame);
  });
  await expect(platform).toHaveValue("macos-aarch64");
  await page.locator("#download-cancel").click();
  await openDownload(page, "runtime");
  await expect(platform).toHaveValue("macos-aarch64");
});

test("the detected Windows download uses the notebook proxy session", async ({ page }) => {
  const windows = pins.platforms.find((item) => item.id === "windows-x86_64");
  if (!windows) throw new Error("The reviewed Windows runtime is missing");
  const requests = watchRuntimes(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", {
      value: {
        platform: "Windows",
        getHighEntropyValues: async () => ({ architecture: "x86", bitness: "64" }),
      },
    });
  });
  await page.goto("./");
  await page.context().addCookies([
    { name: "studio-proxy-session", value: "test", url: page.url(), httpOnly: true },
  ]);
  await page.route(`**/generated/runtimes/${windows.filename}`, async (route) => {
    const cookie = await route.request().headerValue("cookie");
    if (cookie?.split("; ").includes("studio-proxy-session=test")) {
      await route.continue();
    } else {
      await route.fulfill({ contentType: "text/html", body: "<title>Sign in</title>" });
    }
  });

  await currentPreview(page);
  await openDownload(page, "runtime");
  await expect(page.locator("#runtime-platform")).toHaveValue(windows.id);
  expect(requests).toEqual([]);
  const { download, files } = await downloadFiles(page);
  expect(download.suggestedFilename()).toBe(`immuknow-project-${windows.id}.zip`);
  expect(decoder.decode(files["START-HERE.txt"])).toContain("Open run-sample.cmd");
  expect(createHash("sha256").update(files[`runtime/${windows.filename}`]).digest("hex")).toBe(
    windows.sha256,
  );
});

test("the Linux ready-to-run project preserves authored files and runs its bundled sample", async ({
  page,
}, info) => {
  test.skip(
    process.platform !== "linux" || process.arch !== "x64",
    "Native smoke uses the Linux x64 runtime.",
  );
  test.skip(!existsSync(stagedArchive), "Prepare the reviewed native runtime archives first.");
  const requests = watchRuntimes(page);
  await page.goto("./");
  await currentPreview(page);
  await page.locator(".cm-content").press("Control+End");
  await page.keyboard.insertText("\n// Preserve this authored runtime download marker");
  await currentPreview(page);
  const template = await page.locator("#template").inputValue();
  await openDownload(page, "project");
  const project = await downloadFiles(page);
  expect(requests).toEqual([]);
  await openDownload(page, "runtime");
  await page.locator("#runtime-platform").selectOption(linux.id);
  const bundled = await downloadFiles(page);
  expect(bundled.download.suggestedFilename()).toBe(`immuknow-project-${linux.id}.zip`);
  await expect(page.locator("#download-dialog")).not.toBeVisible();
  await expect(page.locator("#export")).toBeEnabled();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain(`/generated/runtimes/${linux.filename}`);
  const archive = bundled.files[`runtime/${linux.filename}`];
  expect(createHash("sha256").update(archive).digest("hex")).toBe(linux.sha256);
  for (const [path, bytes] of Object.entries(project.files))
    expect(Buffer.from(bundled.files[path]).equals(bytes), path).toBe(true);
  for (const name of ["immuknow", "run-sample.sh", "START-HERE.txt"])
    expect(bundled.files[name], name).toBeDefined();
  expect(Object.keys(bundled.files).filter((path) => path.startsWith("runtime/"))).toEqual([
    `runtime/${linux.filename}`,
  ]);
  expect(bundled.files["immuknow-project.json"]).toBeUndefined();
  expect(decoder.decode(bundled.files[template])).toContain(
    "authored runtime download marker",
  );
  await bundled.download.saveAs(info.outputPath("ready-to-run-linux.zip"));
  runBundledProject(info.outputPath("ready-to-run-linux.zip"), info);
});

for (const failure of ["missing", "corrupt"]) {
  test(`a ${failure} runtime archive keeps the project available for a files-only download`, async ({
    page,
  }) => {
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await page.route(runtimeRoute, (route) =>
      route.fulfill(
        failure === "missing"
          ? { status: 404, body: "Not available" }
          : {
              status: 200,
              contentType: "application/octet-stream",
              body: Buffer.alloc(linux.size),
            },
      ),
    );
    await page.goto("./");
    await currentPreview(page);
    const revision = await page.locator("#preview-state").getAttribute("data-displayed-revision");
    await openDownload(page, "runtime");
    await page.locator("#runtime-platform").selectOption(linux.id);
    await page.locator("#download-confirm").click();
    await expect(page.locator("#download-error")).toContainText(
      failure === "missing" ? "could not be downloaded" : "integrity check",
    );
    await expect(page.locator("#download-error")).toContainText("Project files only");
    await expect(page.locator("#download-confirm")).toBeEnabled();
    expect(downloads).toEqual([]);
    await expect(page.locator("#preview-state")).toHaveAttribute(
      "data-displayed-revision",
      revision ?? "",
    );
    await page.locator('input[name="download-kind"][value="project"]').check();
    const project = await downloadFiles(page);
    expect(project.files["sample.json"]).toBeDefined();
    expect(Object.keys(project.files).some((path) => path.startsWith("runtime/"))).toBe(false);
    expect(downloads).toEqual(["immuknow-project.zip"]);
  });
}

for (const [resource, routePattern] of [
  ["runtime", runtimeRoute],
  ["font", "**/generated/fonts/LICENSE"],
]) {
  test(`cancelling a delayed ${resource} fetch restores controls and produces no partial download`, async ({
    page,
  }) => {
    let release = () => {};
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested = false;
    let completed = false;
    const downloads: string[] = [];
    const runtimeRequests = watchRuntimes(page);
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await page.goto("./");
    await currentPreview(page);
    // Delay export resources only, after the initial preview has loaded its fonts.
    await page.route(routePattern, async (route) => {
      requested = true;
      await delayed;
      await route.abort().catch(() => {});
      completed = true;
    });
    await openDownload(page, "runtime");
    await page.locator("#runtime-platform").selectOption(linux.id);
    await page.locator("#download-confirm").click();
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator("#download-confirm")).toBeDisabled();
    await expect(page.locator("#runtime-platform")).toBeDisabled();
    await page.locator("#download-cancel").click();
    await expect(page.locator("#download-dialog")).not.toBeVisible();
    await expect(page.locator("#export")).toBeEnabled();
    release();
    await expect.poll(() => completed).toBe(true);
    await page.unroute(routePattern);
    expect(downloads).toEqual([]);
    if (resource === "font") expect(runtimeRequests).toEqual([]);
    await openDownload(page, "project");
    await expect(page.locator("#download-error")).not.toBeVisible();
    await expect(page.locator("#download-confirm")).toBeEnabled();
    await downloadFiles(page);
    expect(downloads).toEqual(["immuknow-project.zip"]);
  });
}
