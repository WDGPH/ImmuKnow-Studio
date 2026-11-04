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

// A source-only handoff for an existing repository, retaining authored paths and
// bytes while leaving its supplied library, fonts and assets in place.
export function authoredTypstFiles(files: Files, template: string): Files {
  validateFiles(files);
  validateTemplate(files, template);
  const required = referencedFiles(files, template);
  const settings = settingsPath(files, template);
  if (settings) for (const path of referencedFiles(files, settings)) required.add(path);
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
  _example?: Example,
  starters: Files = {},
  includeFictionalData = true,
): Files {
  const required = referencedFiles(files, template);
  const sharedCsv = "examples/sample/clients.csv";
  const sharedAssignments = "examples/sample/assignments.json";
  if (!includeFictionalData) {
    files = { ...files };
    const inputs = examples.flatMap((item) => Object.values(item.inputs));
    const matches = (path: string, original: string) =>
      !!starters[original] && !!files[path] && sameBytes(files[path], starters[original]);
    // Remove an unchanged Studio sample on re-export too. Custom or unfinished
    // imported samples keep their files and dependencies.
    if (files["sample.json"]) {
      try {
        const sample = JSON.parse(decoder.decode(files["sample.json"])) as Record<string, unknown>;
        const { csv, assignments } = sample;
        if (
          typeof csv === "string" &&
          typeof assignments === "string" &&
          !required.has("sample.json") &&
          !required.has(csv) &&
          !required.has(assignments) &&
          ((matches(csv, sharedCsv) && matches(assignments, sharedAssignments)) ||
            inputs.some(
              (input) => matches(csv, input.csv) && matches(assignments, input.assignments),
            ))
        ) {
          delete files["sample.json"];
          delete files[csv];
          delete files[assignments];
        }
      } catch {
        // The existing sample-preservation path below retains unfinished work.
      }
    }
  }
  // An imported sample is authored project configuration. Keep both its bytes
  // and dependencies even when the preview moves to another fictional client.
  if (files["sample.json"]) {
    try {
      const sample = JSON.parse(decoder.decode(files["sample.json"])) as Record<string, unknown>;
      for (const key of ["csv", "assignments"] as const) {
        const path = sample[key];
        if (typeof path !== "string") throw new Error("Incomplete sample selection");
        required.add(safePath(path));
      }
      const assignments = files[sample.assignments as string];
      if (!assignments) throw new Error("Missing sample assignments");
      const rows: unknown = JSON.parse(decoder.decode(assignments));
      if (!Array.isArray(rows)) throw new Error("Incomplete sample assignments");
      for (const row of rows) {
        if (!row || typeof row.template !== "string")
          throw new Error("Incomplete sample assignment");
        const path = safePath(`templates/${row.template}`);
        for (const dependency of referencedFiles(files, path)) required.add(dependency);
      }
    } catch {
      // An unfinished project must remain downloadable. If its sample cannot
      // describe dependencies yet, retain all candidates without rewriting it.
      for (const path of Object.keys(files)) required.add(path);
    }
  }
  // A fresh project uses Template's complete fictional cohort and its notice
  // choices. Retain the assigned starters and their dependencies for the run.
  if (includeFictionalData && !files["sample.json"] && starters[sharedAssignments]) {
    const rows: unknown = JSON.parse(decoder.decode(starters[sharedAssignments]));
    if (!Array.isArray(rows)) throw new Error("Invalid fictional sample assignments");
    files = { ...files };
    const available = { ...starters, ...files };
    for (const row of rows) {
      if (!row || typeof row.template !== "string")
        throw new Error("Invalid fictional sample assignment");
      const path = safePath(`templates/${row.template}`);
      if (!available[path]) throw new Error(`Missing fictional sample notice: ${path}`);
      for (const dependency of referencedFiles(available, path)) {
        required.add(dependency);
        if (!files[dependency]) files[dependency] = available[dependency];
      }
    }
  }
  const otherInputs = new Set(
    examples.flatMap((item) => Object.values(item.inputs).flatMap(Object.values)),
  );
  const result = Object.fromEntries(
    Object.entries(files).filter(([path]) => {
      if (path === sharedCsv || path === sharedAssignments)
        return required.has(path) || !starters[path] || !sameBytes(files[path], starters[path]);
      if (required.has(path)) return true;
      if (/^templates\/.+\.(en|fr)\.typ$/.test(path)) return false;
      if (otherInputs.has(path)) return !starters[path] || !sameBytes(files[path], starters[path]);
      return true;
    }),
  );
  if (
    !result["sample.json"] &&
    includeFictionalData &&
    starters[sharedCsv] &&
    starters[sharedAssignments]
  ) {
    const availablePath = (preferred: string, bytes: Uint8Array): string => {
      if (!result[preferred] || sameBytes(result[preferred], bytes)) return preferred;
      const dot = preferred.lastIndexOf(".");
      for (let index = 1; ; index++) {
        const candidate = `${preferred.slice(0, dot)}-fictional-${index}${preferred.slice(dot)}`;
        if (!result[candidate] || sameBytes(result[candidate], bytes)) return candidate;
      }
    };
    const sample = {
      csv: availablePath("input/sample/sample_students.csv", starters[sharedCsv]),
      assignments: availablePath(
        "input/sample/sample_assignments.json",
        starters[sharedAssignments],
      ),
    };
    result[sample.csv] = starters[sharedCsv];
    result[sample.assignments] = starters[sharedAssignments];
    result["sample.json"] = encoder.encode(`${JSON.stringify(sample, null, 2)}\n`);
  }
  // Fill missing Template setup files from this build's pinned snapshot.
  // Keep any files already present in the project.
  const templateSourceBytes = starters["template-source.json"];
  if (templateSourceBytes) {
    const templateSource = JSON.parse(decoder.decode(templateSourceBytes)) as {
      files: Record<string, string>;
    };
    for (const path of [...Object.keys(templateSource.files), "template-source.json"]) {
      safePath(path);
      if (path.startsWith("templates/") || path.startsWith("config/")) continue;
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
