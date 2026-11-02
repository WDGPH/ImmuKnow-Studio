import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { functionCatalog } from "../src/typst-catalog";

// Keep authoring help aligned with the same installed Core used for Studio's assets.
const library = execFileSync(
  "uv",
  [
    "run",
    "--locked",
    "python",
    "-c",
    "from immuknow.resources import typst_library_root; print(typst_library_root())",
  ],
  { encoding: "utf8" },
).trim();
const templates = "assets/project-template/templates";
const components = readdirSync(join(library, "src"))
  .filter((name) => name.endsWith(".typ"))
  .map((name) => readFileSync(join(library, "src", name), "utf8"))
  .join("\n");

function namedOptions(source: string, name: string) {
  const signature = new RegExp(`#let ${name}\\(([\\s\\S]*?)\\) =`).exec(source)?.[1];
  expect(signature, `Definition of ${name}`).toBeDefined();
  return [...(signature ?? "").matchAll(/(?:^|,)\s*([\w-]+)\s*:/g)].map((match) => match[1]);
}

describe("authoring help follows installed Core", () => {
  it("covers every directly exported Core function", () => {
    const exports = readFileSync(join(library, "lib.typ"), "utf8");
    for (const match of exports.matchAll(/^#import "[^"]+": (.+)$/gm)) {
      for (const name of match[1].split(", ")) {
        if (name === "envelope-preset") continue; // A dictionary, not a function.
        expect(functionCatalog, name).toHaveProperty(`immuknow.${name}`);
      }
    }
  });

  it("suggests only supported named options for shared functions", () => {
    for (const [name, help] of Object.entries(functionCatalog)) {
      if (!name.startsWith("immuknow.")) continue;
      const actual = namedOptions(components, name.slice("immuknow.".length));
      for (const option of help.namedParameters ?? [])
        expect(actual, `${name}: ${option}`).toContain(option);
    }
  });

  it("describes project defaults and suggests supported forwarded options", () => {
    const settings = readFileSync(join(templates, "settings.typ"), "utf8");
    expect(functionCatalog["notice-style"].namedParameters).toEqual(
      namedOptions(settings, "notice-style"),
    );
    for (const [helper, component] of [
      ["notice-page", "notice-section"],
      ["immunization-history", "immunization-history"],
    ]) {
      const actual = namedOptions(components, component);
      for (const option of functionCatalog[helper].namedParameters ?? [])
        expect(actual, `${helper}: ${option}`).toContain(option);
    }
  });
});
