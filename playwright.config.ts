import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

// Browser/native parity uses the same verified font bytes on every runner.
// This affects test subprocesses only; production ImmuKnow still uses system fonts.
process.env.IMMUKNOW_BIN ??= resolve(".immuknow/bin/immuknow");
process.env.TYPST_FONT_PATHS ??= resolve("assets/fonts");
process.env.TYPST_IGNORE_SYSTEM_FONTS ??= "true";
process.env.TYPST_IGNORE_EMBEDDED_FONTS ??= "true";

const external = process.env.IMMUKNOW_BASE_URL;
const baseURL = external ?? "http://127.0.0.1:4173/";

export default defineConfig({
  testDir: "./tests",
  timeout: 150_000,
  workers: 1,
  use: { baseURL, screenshot: "only-on-failure" },
  webServer: external
    ? undefined
    : {
        command: "npm run preview -- --host 0.0.0.0 --port 4173",
        url: `${baseURL}proof.html`,
        reuseExistingServer: false,
      },
});
