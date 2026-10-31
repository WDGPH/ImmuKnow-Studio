import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const required = [
  "vendor/compiler/typst_ts_web_compiler.js",
  "vendor/compiler/typst_ts_web_compiler_bg.wasm",
  "vendor/renderer/typst_ts_renderer.js",
  "vendor/renderer/typst_ts_renderer_bg.wasm",
];
const missing = required.filter((path) => !existsSync(new URL(path, root)));
if (missing.length) {
  console.error(
    `Studio needs a prepared browser compiler and renderer before Vite can start. Missing:\n${missing.join("\n")}\n\n` +
      "From the repository root, install the build prerequisites in\n" +
      "README.md, then run:\n" +
      "  uv run python -m scripts.build-site\n\n" +
      "npm run dev generates example data automatically, but does not build the compiler or renderer.",
  );
  process.exitCode = 1;
}
