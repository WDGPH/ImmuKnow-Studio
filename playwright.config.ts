import { defineConfig } from "@playwright/test";

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
