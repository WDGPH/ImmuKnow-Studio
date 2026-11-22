import { imagePath, relativeImage } from "./branding";
import { sameBytes } from "./compiler-inputs";
import {
  decoder,
  encoder,
  safePath,
  settingsPath,
  validateFiles,
  validateTemplate,
} from "./project";
import {
  inlineSignatureImage,
  inlineSignatureName,
  orderSignatoryName,
  updateInlineSignatureImage,
  updateInlineSignatureName,
  updateOrderSignatoryName,
} from "./signature-source";
import { resetSettingsKeepingTheme } from "./theme-settings";
import type { Bundle, Example, Files } from "./types";

export type ResetScope = "template" | "settings" | "theme";

const scaffoldExtras = new Set([
  ".gitignore",
  "README.md",
  "build.json",
  "examples/README.md",
  "template-source.json",
]);

// Follow existing project files named by simple quoted strings in Typst source.
// This conservative scan can include extra files; it does not rewrite source.
export function referencedFiles(files: Files, entry: string): Set<string> {
  const found = new Set<string>();
  const visit = (path: string) => {
    if (found.has(path) || !files[path]) return;
    found.add(path);
    if (!path.endsWith(".typ")) return;
    for (const match of decoder.decode(files[path]).matchAll(/"([^"\r\n\\]+)"/g)) {
      const parts = match[1].startsWith("/") ? [] : path.split("/").slice(0, -1);
      for (const part of match[1].split("/")) {
        if (part === "..") parts.pop();
        else if (part && part !== ".") parts.push(part);
      }
      visit(parts.join("/"));
    }
  };
  visit(entry);
  return found;
}

// Dynamic local imports and asset paths cannot be resolved by the literal scan.
// Retain the existing project when an authored source uses one.
function hasComputedPath(source: string): boolean {
  const aliases = new Set<string>();
  for (const match of source.matchAll(
    /(?:#|(?:^|[;{}\n])\s*)(import|include)\s+([^\r\n]+)/g,
  )) {
    const [, operation, operand] = match;
    const literal = operand.match(/^"[^"\r\n]*"\s*(?::|as\s+([\w-]+)\b|$|;|\/\/)/);
    if (literal) {
      if (operation === "import" && literal[1]) aliases.add(literal[1]);
      continue;
    }
    const module = operation === "import" && operand.match(/^([\w-]+)\s*:/);
    if (!module || !aliases.has(module[1]) ||
        new RegExp(`\\blet\\s+${module[1]}\\b`).test(source)) return true;
  }
  for (const match of source.matchAll(
    /\b(image|read|json|csv|yaml|xml|toml|cbor)\s*\(\s*([^\r\n]+)/g,
  )) {
    const [, loader, operand] = match;
    if (/^"[^"\r\n]*"\s*[,)]/.test(operand)) continue;
    // This special native input contains prepared client data, not a project path.
    if (loader === "json" && /^sys\.inputs\.(?:at\(\s*"data"\s*\)|data)\s*[,)]/.test(operand))
      continue;
    return true;
  }
  return false;
}

// A source-only handoff for an existing repository, retaining authored paths and
// bytes while leaving its supplied library, fonts and assets in place.
export function authoredTypstFiles(files: Files, template: string): Files {
  validateFiles(files);
  validateTemplate(files, template);
  const required = referencedFiles(files, template);
  const settings = settingsPath(files, template);
  if (settings) for (const path of referencedFiles(files, settings)) required.add(path);
  if ([...required].some((path) =>
    path.endsWith(".typ") &&
    !path.startsWith("templates/lib/immuknow/") &&
    !path.startsWith("templates/fonts/") &&
    hasComputedPath(decoder.decode(files[path])),
  )) {
    for (const path of Object.keys(files)) required.add(path);
  }
  return Object.fromEntries(
    Object.entries(files).filter(
      ([path]) =>
        required.has(path) &&
        path.endsWith(".typ") &&
        !path.startsWith("templates/lib/immuknow/") &&
        !path.startsWith("templates/fonts/"),
    ),
  );
}

// Select files for a download and fill missing setup files. ZIP validation and
// integrity checks are handled separately by the archive code.
export function currentProject(
  files: Files,
  template: string,
  examples: Bundle["examples"],
  example?: Example,
  starters: Files = {},
  includeFictionalData = true,
): Files {
  const required = referencedFiles(files, template);
  const settings = settingsPath(files, template);
  if (settings) for (const path of referencedFiles(files, settings)) required.add(path);
  // Retained authored sources can bring their own unchanged starter helpers and
  // assets. Follow those sources as well as the active entry point.
  const authored = Object.entries(files).filter(
    ([path, bytes]) =>
      path.endsWith(".typ") &&
      !path.startsWith("templates/lib/immuknow/") &&
      !path.startsWith("templates/fonts/") &&
      (!starters[path] || !sameBytes(bytes, starters[path])),
  );
  for (const [path] of authored) {
    const dependencies = referencedFiles(files, path);
    for (const dependency of dependencies) required.add(dependency);
    if ([...dependencies].some((dependency) =>
      dependency.endsWith(".typ") &&
      !dependency.startsWith("templates/lib/immuknow/") &&
      hasComputedPath(decoder.decode(files[dependency])),
    )) {
      for (const candidate of Object.keys(files)) required.add(candidate);
    }
  }
  const sharedCsv = "examples/sample/clients.csv";
  const fictionalCsv = example && starters[example.csv];
  // Parse once. Malformed, incomplete and custom selections retain all candidates.
  let sample: { csv: string; template: string } | undefined;
  let invalidSample = false;
  if (files["sample.json"]) {
    try {
      const value: unknown = JSON.parse(decoder.decode(files["sample.json"]));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid sample");
      const record = value as Record<string, unknown>;
      if (Object.keys(record).length !== 2 || typeof record.csv !== "string" || typeof record.template !== "string") throw new Error("Incomplete sample");
      const csv = safePath(record.csv);
      const selected = safePath(record.template);
      if (!files[csv]) throw new Error("Missing sample CSV");
      validateTemplate(files, selected);
      sample = { csv, template: selected };
    } catch {
      invalidSample = true;
    }
  }
  // Only Studio's exact generated descriptor and selected fictional CSV can be
  // identified as unchanged. Other selections may contain authored work.
  const generatedSample = !!sample && !!fictionalCsv && !!starters[template] &&
    sample.template === template &&
    /^input\/sample\/sample_students(?:-fictional-[1-9][0-9]*)?\.csv$/.test(sample.csv) &&
    sameBytes(files[sample.csv], fictionalCsv) &&
    decoder.decode(files["sample.json"]) === `${JSON.stringify(sample, null, 2)}\n`;
  if (sample && generatedSample && !includeFictionalData && !required.has("sample.json") &&
      !required.has(sample.csv)) {
    files = { ...files };
    delete files["sample.json"];
    delete files[sample.csv];
    sample = undefined;
  }
  if (invalidSample || (sample && !generatedSample)) {
    for (const path of Object.keys(files)) required.add(path);
  } else if (sample) {
    required.add(sample.csv);
    const dependencies = referencedFiles(files, sample.template);
    for (const dependency of dependencies) required.add(dependency);
    if ([...dependencies].some((path) =>
      path.endsWith(".typ") && !path.startsWith("templates/lib/immuknow/") &&
      hasComputedPath(decoder.decode(files[path])),
    )) for (const path of Object.keys(files)) required.add(path);
  }
  const otherInputs = new Set(examples.map((item) => item.csv));
  const result = Object.fromEntries(
    Object.entries(files).filter(([path, bytes]) => {
      if (required.has(path)) return true;
      const omitIfUnchanged = path === sharedCsv || otherInputs.has(path) || scaffoldExtras.has(path) ||
        (path.startsWith("templates/") && !path.startsWith("templates/lib/immuknow/") &&
          !path.startsWith("templates/fonts/"));
      return !omitIfUnchanged || !sameBytes(starters[path], bytes);
    }),
  );
  if (!result["sample.json"] && includeFictionalData && fictionalCsv) {
    const availablePath = (preferred: string, bytes: Uint8Array): string => {
      if (!result[preferred] || sameBytes(result[preferred], bytes)) return preferred;
      const dot = preferred.lastIndexOf(".");
      for (let index = 1; ; index++) {
        const candidate = `${preferred.slice(0, dot)}-fictional-${index}${preferred.slice(dot)}`;
        if (!result[candidate] || sameBytes(result[candidate], bytes)) return candidate;
      }
    };
    const csv = availablePath("input/sample/sample_students.csv", fictionalCsv);
    result[csv] = fictionalCsv;
    result["sample.json"] = encoder.encode(`${JSON.stringify({ csv, template }, null, 2)}\n`);
  }
  // Fill missing Template setup files from this build's pinned snapshot.
  // Keep any files already present in the project.
  const templateSourceBytes = starters["template-source.json"];
  if (templateSourceBytes) {
    const templateSource = JSON.parse(decoder.decode(templateSourceBytes)) as {
      files: Record<string, string>;
    };
    for (const path of Object.keys(templateSource.files)) {
      safePath(path);
      if (scaffoldExtras.has(path)) continue;
      if (path.startsWith("templates/") || path.startsWith("config/") || path === "sample.json" || path.startsWith("input/sample/")) continue;
      if (!result[path] && starters[path]) result[path] = starters[path];
    }
  }
  return result;
}

export function resetProject(
  files: Files,
  baseline: Files,
  template: string,
  scope: ResetScope,
  previousTemplate = template,
): Files {
  validateTemplate(baseline, template);
  const next = { ...files, [template]: baseline[template] };
  if (scope !== "theme" && inlineSignatureImage(baseline[template])) {
    const current = inlineSignatureImage(files[previousTemplate]);
    const asset = current && imagePath(previousTemplate, current.relative);
    if (asset)
      next[template] = updateInlineSignatureImage(next[template], relativeImage(template, asset));
  }
  if (scope !== "theme") {
    const name = inlineSignatureName(files[previousTemplate]);
    if (name && inlineSignatureName(next[template]))
      next[template] = updateInlineSignatureName(next[template], name.value);
    const orderName = orderSignatoryName(files[previousTemplate]);
    if (orderName && orderSignatoryName(next[template]))
      next[template] = updateOrderSignatoryName(next[template], orderName.value);
  }
  if (scope !== "template") {
    const path = settingsPath(baseline, template);
    if (!path) throw new Error("This template has no starting Settings file to restore.");
    const currentPath = settingsPath(files, previousTemplate);
    next[path] =
      scope === "theme"
        ? baseline[path]
        : resetSettingsKeepingTheme(
            baseline[path],
            currentPath ? files[currentPath] : baseline[path],
          );
  }
  if (scope === "theme") {
    // Reset every image in the project's asset directory, including overwritten
    // preset images and uploads no longer referenced by Settings.
    const themeImage = (path: string) =>
      path.startsWith("templates/") &&
      !path.startsWith("templates/lib/") &&
      /\.(png|jpe?g|webp|svg)$/i.test(path);
    for (const path of Object.keys(next)) if (themeImage(path)) delete next[path];
    for (const [path, bytes] of Object.entries(baseline)) {
      if (themeImage(path)) next[path] = bytes;
    }
  }
  validateFiles(next);
  return next;
}
