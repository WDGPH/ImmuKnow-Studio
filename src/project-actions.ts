import { decoder, settingsPath, validateFiles, validateTemplate } from "./project";
import { resetSettingsKeepingTheme } from "./theme-settings";
import type { Bundle, Example, Files } from "./types";

export type ResetScope = "template" | "settings" | "theme";

// Follow literal project paths conservatively, including paths used by authored
// helper functions. Never rewrite source or discard an imported companion file.
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

export function currentProject(
  files: Files,
  template: string,
  examples: Bundle["examples"],
  example?: Example,
  starters: Files = {},
): Files {
  const required = referencedFiles(files, template);
  const inputs = example?.inputs[template.split("/").at(-1) ?? ""];
  const otherInputs = new Set(
    examples.flatMap((item) => Object.values(item.inputs).flatMap(Object.values)),
  );
  const selected = new Set(inputs ? Object.values(inputs) : []);
  const result = Object.fromEntries(
    Object.entries(files).filter(([path]) => {
      if (required.has(path) || selected.has(path)) return true;
      if (/^templates\/.+\.(en|fr)\.typ$/.test(path)) return false;
      return !otherInputs.has(path);
    }),
  );
  // A scoped import may carry another example's inputs. Changing the preview
  // client must still produce a runnable download, without replacing authored inputs.
  for (const path of selected) if (!result[path] && starters[path]) result[path] = starters[path];
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
