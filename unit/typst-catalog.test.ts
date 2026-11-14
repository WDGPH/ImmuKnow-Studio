import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { functionCatalog } from "../src/typst-catalog";

// Keep authoring help aligned with the same installed ImmuKnow used for Studio's assets.
const library = execFileSync(
  "uv",
  [
    "run",
    "--locked",
    "python",
    "-c",
    "from scripts.immuknow import typst_library_root; print(typst_library_root())",
  ],
  { encoding: "utf8" },
).trim();
const components = readdirSync(join(library, "src"))
  .filter((name) => name.endsWith(".typ"))
  .map((name) => readFileSync(join(library, "src", name), "utf8"))
  .join("\n");

function namedOptions(source: string, name: string) {
  const signature = new RegExp(`#let ${name}\\(([\\s\\S]*?)\\) =`).exec(source)?.[1];
  expect(signature, `Definition of ${name}`).toBeDefined();
  return [...(signature ?? "").matchAll(/(?:^|,)\s*([\w-]+)\s*:/g)].map((match) => match[1]);
}

describe("authoring help follows installed ImmuKnow", () => {
  it("covers exported functions available through the starter setup", () => {
    const exports = readFileSync(join(library, "lib.typ"), "utf8");
    for (const match of exports.matchAll(/^#import "[^"]+": (.+)$/gm)) {
      for (const name of match[1].split(", ")) {
        if (name === "envelope-preset") continue; // A dictionary, not a function.
        if (name === "intended-reader") continue; // Starter setup exposes the reader flags instead.
        expect(functionCatalog, name).toHaveProperty(`immuknow.${name}`);
      }
    }
  });

  it("suggests only supported named options for shared functions", () => {
    for (const [name, help] of Object.entries(functionCatalog)) {
      if (!name.startsWith("immuknow.")) continue;
      const component =
        name === "immuknow.notice-page" ? "notice-section" : name.slice("immuknow.".length);
      const actual = namedOptions(components, component);
      for (const option of help.namedParameters ?? [])
        expect(actual, `${name}: ${option}`).toContain(option);
    }
  });
});
