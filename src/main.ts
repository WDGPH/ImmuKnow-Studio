import "./style.css";
import { initializeCodingCheatsheet } from "./coding-cheatsheet";
import { archiveJob } from "./archive";
import { fetchNativeRuntime, nativeRuntime, nativeRuntimes, nativeVersion } from "./native-runtime";
import {
  imageBytes,
  imagePath,
  themeImage,
  updateThemeImage,
  signatureName,
  updateSignatureName,
} from "./branding";
import {
  inlineSignatureImage,
  inlineSignatureName,
  orderSignatoryName,
  updateOrderSignatoryName,
} from "./signature-source";
import { Compiler, type CompileInput } from "./compile";
import { claimEditingTab, DraftStore, type SaveState } from "./drafts";
import { SourceEditor } from "./editor";
import { withProjectFonts, withoutProjectFonts } from "./fonts";
import { fontFamilies } from "./font-resources";
import { healthUnits, themedSettings } from "./health-units";
import { initializeHelp } from "./help";
import {
  decodeFiles,
  download,
  runtimeFiles,
  settingsPath,
  validateFiles,
} from "./project";
import { sourceLocation } from "./source-location";
import { currentProject, resetProject, type ResetScope } from "./project-actions";
import { previewSources } from "./preview-sources";
import { initializeTheme } from "./theme";
import { settingValue, updateThemeSettings } from "./theme-settings";
import type {
  BlockedCheck,
  Bundle,
  CheckResult,
  CompileResult,
  Diagnostic,
  Example,
  Files,
} from "./types";
import { Viewer } from "./viewer";

declare const __STUDIO_BUILD__: { revision: string; tag: string | null };

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing interface element: ${id}`);
  return element as T;
};
const button = (id: string) => byId<HTMLButtonElement>(id);
const select = (id: string) => byId<HTMLSelectElement>(id);
const basename = (path: string) => path.split("/").at(-1) ?? path;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

initializeTheme();
byId("studio-version").textContent =
  `ImmuKnow Studio ${__STUDIO_BUILD__.tag ?? __STUDIO_BUILD__.revision.slice(0, 7)}`;
byId<HTMLAnchorElement>("studio-version").href =
  `https://github.com/WDGPH/ImmuKnow-Studio/commit/${encodeURIComponent(__STUDIO_BUILD__.revision)}`;
byId("studio-version").title = __STUDIO_BUILD__.revision;
let bundle: Bundle;
let starters: Files;
let originals: Files;
let files: Files = {};
let template = "";
let example: Example | undefined;
let tab: "template" | "settings" | "theme" = "template";
let compiler: Compiler;
let revision = 0;
let exporting = false;
let displayedRevision = 0;
let displayedContext = -1;
let diagnosticRevision = 0;
let currentChecks: CheckResult[] = [];
let pending = false;
let diagnostics: Diagnostic[] = [];
let resultChecks: CheckResult[] = [];
let resultBlocked: BlockedCheck[] = [];
let resultVerified = false;
let actionError: string | undefined;
let compilerError: string | undefined;
let draftError: string | undefined;
let draftStore: DraftStore | undefined;
let draftRevision = 0;
let canSave = false;
let unsaved = false;
let themeUndo: Files | undefined;
const imageURLs = new Map<string, string>();

function storageError(error: unknown) {
  draftError = message(error);
  findings();
}
function saveState(state: SaveState) {
  unsaved = !["saved", "cleared"].includes(state);
  const previousError = draftError;
  if (state === "error") {
    draftError ??= "The browser draft could not be saved.";
  } else {
    draftError = undefined;
  }
  if (draftError !== previousError) findings();
}
function persist() {
  unsaved = true;
  if (!draftStore || !canSave) {
    saveState("error");
    return;
  }
  try {
    draftStore.save({
      schemaVersion: 2,
      revision: ++draftRevision,
      build: bundle.build,
      files,
      baseline: originals,
      template,
      example: example?.id ?? "",
    });
  } catch (error) {
    saveState("error");
    storageError(error);
  }
}
window.addEventListener("beforeunload", (event) => {
  if (!unsaved) return;
  event.preventDefault();
  event.returnValue = "";
});

const editor = new SourceEditor(byId("editor"), (name, bytes) => {
  files = { ...files, [name]: bytes };
  themeUndo = undefined;
  button("health-unit-undo").hidden = true;
  persist();
  compile();
});
const viewer = new Viewer(
  byId("preview-scroll"),
  () => {
    byId("pages").textContent = viewer.pages ? `${viewer.page} / ${viewer.pages}` : "—";
  },
  (text, origin) => {
    if (displayedRevision !== revision || displayedContext !== compiler.context) return false;
    const location = sourceLocation(files, template, text, origin);
    if (!location) return false;
    openSource(location.path);
    editor.highlightSource(location.from, location.to);
    return true;
  },
);

function availableExamples(): Example[] {
  return bundle.examples.filter((item) => Object.hasOwn(item.payloads, basename(template)));
}
function refreshNavigation() {
  const available = availableExamples();
  const index = available.findIndex((item) => item.id === example?.id);
  byId("example").textContent =
    index < 0 ? "No prepared example" : `Example client ${String(index + 1).padStart(2, "0")}`;
  button("previous").disabled = index <= 0;
  button("next").disabled = index < 0 || index >= available.length - 1;
}
function refreshDownloads() {
  button("export").disabled = exporting || !files[template];
  button("reset").disabled = !originals?.[template];
}
function findings() {
  const errors = byId("errors");
  const warnings = byId("warnings-list");
  errors.replaceChildren();
  warnings.replaceChildren();
  function item(text: string, error: boolean, navigate?: () => void) {
    const line = document.createElement("li");
    line.className = error ? "error" : "warning";
    if (navigate) {
      const link = document.createElement("button");
      link.textContent = text;
      link.onclick = navigate;
      line.append(link);
    } else line.textContent = text;
    (error ? errors : warnings).append(line);
  }
  if (compilerError) item(compilerError, true);
  if (actionError) item(actionError, true);
  if (draftError) item(draftError, true);
  for (const diagnostic of diagnostics) {
    const path = diagnostic.path.replace(/^\//, "");
    item(
      `Current source · ${diagnostic.path}:${diagnostic.range} · ${diagnostic.message}`,
      diagnostic.severity !== "warning",
      files[path]
        ? () => {
            openSource(path);
            editor.jump(Number(diagnostic.range.match(/^(\d+):/)?.[1] ?? 0) + 1);
          }
        : undefined,
    );
  }
  const checks = [
    ...(example?.preparationChecks[basename(template)] ?? []).map((check) => ({
      check,
      prefix: "",
    })),
    ...currentChecks.map((check) => ({ check, prefix: "Current edits · " })),
    ...resultChecks.map((check) => ({
      check,
      prefix: displayedRevision !== revision ? "Last successful preview · " : "",
    })),
  ];
  for (const { check, prefix } of checks) {
    if (!["warn", "fail"].includes(check.status)) continue;
    item(
      `${prefix}${check.message}${check.page ? ` · Page ${check.page}` : ""} (${check.code})`,
      check.status === "fail",
    );
  }
  const deferred = example?.deferredChecks?.[basename(template)] ?? [];
  const currentEvidence =
    displayedContext === compiler?.context && displayedRevision === revision && resultVerified;
  const advisory = byId("deferred-checks");
  advisory.hidden = !deferred.length || currentEvidence;
  advisory.textContent = advisory.hidden ? "" : "Checked when the notice compiles";
  const blocked = byId("blocked-checks");
  blocked.replaceChildren();
  const blockedChecks = currentEvidence
    ? resultBlocked
    : (example?.blockedChecks?.[basename(template)] ?? []);
  for (const check of blockedChecks) {
    const line = document.createElement("li");
    line.textContent = `${check.code}: ${check.reason} (${check.blocked_by})`;
    blocked.append(line);
  }
  blocked.hidden = blockedChecks.length === 0;
  const count = warnings.childElementCount;
  byId("warning-count").textContent = `${count} warning${count === 1 ? "" : "s"}`;
  byId("notice-warnings").hidden = count === 0;
  errors.hidden = errors.childElementCount === 0;
  byId("feedback").hidden = errors.hidden && count === 0 && advisory.hidden && blocked.hidden;
  editor.diagnostics(diagnosticRevision === revision ? diagnostics : []);
}
function previewStatus() {
  const target = byId("preview-state");
  const stale = displayedRevision > 0 && displayedRevision !== revision;
  const failedRequirements = resultChecks.some(
    (check) =>
      [
        "notice.requirements",
        "notice.eligibility",
        "data.forecast_coverage",
        "content.agent_display",
      ].includes(check.code) && check.status === "fail",
  );
  target.dataset.state = pending
    ? "updating"
    : stale
      ? "stale"
      : !displayedRevision
        ? "unavailable"
        : !resultVerified
          ? "unverified"
          : failedRequirements
            ? "failed"
            : "ready";
  target.dataset.context = String(compiler?.context ?? 0);
  target.dataset.requestedRevision = String(revision);
  target.dataset.displayedRevision = String(displayedRevision);
  target.dataset.displayedContext = String(displayedContext);
  const text = pending
    ? displayedRevision
      ? "Updating… Preview shows the last successful version."
      : "Preparing preview…"
    : stale
      ? "Preview shows the last successful version; current edits contain errors."
      : !displayedRevision
        ? "No current preview available."
        : !resultVerified
          ? "Preview is current, but its checks could not be verified."
          : failedRequirements
            ? "Preview is current; notice checks failed and need review."
            : "Preview is current.";
  target.setAttribute("aria-label", text);
  target.title = text;
}
function newContext() {
  byId<HTMLDetailsElement>("notice-warnings").open = false;
  compiler?.invalidate();
  displayedContext = -1;
  displayedRevision = 0;
  resultChecks = [];
  resultBlocked = [];
  resultVerified = false;
  viewer.clear();
}
function compile(replace = false) {
  if (replace) newContext();
  diagnostics = [];
  diagnosticRevision = 0;
  currentChecks = [];
  actionError = undefined;
  compilerError = undefined;
  pending = true;
  refreshNavigation();
  const notice = example?.payloads[basename(template)];
  if (!example || !notice) {
    revision = compiler.revision;
    actionError =
      "This entry has no prepared example. Your project is preserved; choose a template starter to preview an authored example.";
    pending = false;
  } else {
    try {
      const requestedInput: CompileInput = {
        template,
        example: example.id,
        files: runtimeFiles(files),
        notice,
        creationTimestamp: bundle.creationTimestamp,
      };
      revision = compiler.submit(requestedInput, replace);
    } catch (error) {
      // Failed request preparation invalidates the previous preview.
      compiler.invalidate();
      revision = compiler.revision;
      actionError = message(error);
      pending = false;
    }
  }
  previewStatus();
  refreshDownloads();
  findings();
}
async function compiled(result: CompileResult) {
  if (result.context !== compiler.context) return;
  if (result.revision === revision) {
    diagnosticRevision = result.revision;
    diagnostics = result.diagnostics;
    currentChecks = result.preview ? [] : result.checks;
    if (!result.preview) pending = false;
    findings();
    previewStatus();
  }
  if (!result.preview || result.revision <= displayedRevision) return;
  const checks = [...(result.summary?.checks ?? []), ...result.checks];
  try {
    const committed = await viewer.open(
      previewSources(result.preview, files, template, result.summary),
      result.summary,
      result.timing,
    );
    if (!committed || result.context !== compiler.context || result.revision <= displayedRevision)
      return;
    displayedContext = result.context;
    displayedRevision = result.revision;
    resultChecks = checks;
    resultBlocked = result.summary?.blocked_checks ?? [];
    resultVerified = !!result.summary;
    if (result.revision === revision) {
      pending = false;
    }
    previewStatus();
    findings();
    refreshDownloads();
  } catch (error) {
    if (result.context !== compiler.context || result.revision !== revision) return;
    actionError = `Could not display the compiled notice: ${message(error)}`;
    pending = false;
    previewStatus();
    findings();
  }
}

function openSource(path: string) {
  if (!files[path]) return;
  tab = path === settingsPath(files, template) ? "settings" : "template";
  updateTabs();
  editor.open(path, files[path]);
  editor.diagnostics(diagnosticRevision === revision ? diagnostics : []);
  refreshDownloads();
}
function updateTabs() {
  for (const name of ["theme", "template", "settings"] as const) {
    const target = button(`${name}-tab`);
    target.setAttribute("aria-selected", String(tab === name));
    target.tabIndex = tab === name ? 0 : -1;
  }
  byId("editor-panel").hidden = tab === "theme";
  byId("editor-panel").setAttribute("aria-labelledby", `${tab}-tab`);
  byId("theme-panel").hidden = tab !== "theme";
  byId("settings-controls").hidden = tab !== "settings";
}
function showTab(next: typeof tab) {
  tab = next;
  updateTabs();
  if (next === "theme") refreshTheme();
  else {
    const path = next === "template" ? template : settingsPath(files, template);
    if (path) openSource(path);
  }
}
function refreshProject() {
  select("template").replaceChildren();
  for (const name of Object.keys(files)
    .filter((name) => /^templates\/.+\.(en|fr)\.typ$/.test(name))
    .sort()) {
    const filename = basename(name);
    const title = filename
      .replace(/\.(en|fr)\.typ$/, "")
      .replace(/_v\d+$/, "")
      .replaceAll("_", " ");
    const language = filename.endsWith(".fr.typ") ? "Français" : "English";
    const directory = name.split("/").slice(1, -1).join("/");
    const label = `${title.charAt(0).toUpperCase()}${title.slice(1)} · ${language}${directory ? ` · ${directory}` : ""}`;
    const option = new Option(label, name);
    option.title = name;
    select("template").add(option);
  }
  select("template").value = template;
  const hasSettings = Boolean(settingsPath(files, template));
  button("settings-tab").disabled = !hasSettings;
  if (tab === "settings" && !hasSettings) tab = "template";
  editor.clear();
  showTab(tab);
  refreshDownloads();
  refreshNavigation();
}
function refreshTheme() {
  const path = settingsPath(files, template);
  const bytes = path ? files[path] : undefined;
  select("health-unit-preset").disabled = !bytes;
  const fontValue = bytes ? settingValue(bytes, "body-font") : undefined;
  const family: string | undefined = fontValue?.startsWith('"') ? JSON.parse(fontValue) : undefined;
  const picker = select("body-font-picker");
  picker.replaceChildren();
  const families = fontFamilies;
  if (family && !families.includes(family)) families.unshift(family);
  for (const name of families) picker.add(new Option(name, name));
  if (family) picker.value = family;
  else {
    picker.add(new Option("Edit in Settings", ""));
    picker.value = "";
  }
  picker.disabled = !bytes || !family;
  picker.title = family ? "" : "Edit the typeface in Settings.";
  const titleAlign = bytes ? settingValue(bytes, "title-align") : undefined;
  const alignPicker = select("title-align-picker");
  const supportedAlignment = titleAlign && ["left", "center", "right"].includes(titleAlign);
  alignPicker.value = supportedAlignment ? titleAlign : "";
  alignPicker.disabled = !supportedAlignment;
  alignPicker.title = supportedAlignment ? "" : "Edit the title alignment in Settings.";
  for (const name of ["heading", "link", "accent"]) {
    const input = byId<HTMLInputElement>(`${name}-color-picker`);
    const value = bytes ? settingValue(bytes, `${name}-color`) : undefined;
    const color =
      value === "black"
        ? "#000000"
        : value === "white"
          ? "#ffffff"
          : value?.match(/^rgb\("(#[\da-f]{6})"\)$/i)?.[1];
    input.disabled = !bytes || !color;
    input.title = color ? "" : "Edit this colour in Settings.";
    if (color) input.value = color;
  }
  const signatory = byId<HTMLInputElement>("signature-name-picker");
  const printedName = signatureName(files, template);
  signatory.disabled = !printedName;
  signatory.value = printedName?.value ?? "";
  signatory.title = signatory.disabled ? "Edit the printed name in Template or Settings." : "";
  for (const kind of ["logo", "signature", "extra"]) {
    const reference = kind === "extra" ? undefined : themeImage(files, template, kind);
    const relative = reference?.relative;
    const asset =
      kind === "extra"
        ? Object.keys(files).find((name) => /^templates\/assets\/studio-extra\./.test(name))
        : relative && reference
          ? imagePath(reference.path, relative)
          : undefined;
    if (imageURLs.has(kind)) URL.revokeObjectURL(imageURLs.get(kind) as string);
    const image = byId<HTMLImageElement>(`${kind}-preview`);
    image.hidden = !asset || !files[asset];
    const empty = byId(`${kind}-empty`);
    empty.hidden = !image.hidden;
    empty.textContent =
      kind !== "extra" && bytes && !relative ? "Edit in Template or Settings" : "No image";
    if (asset && files[asset]) {
      const type = asset.endsWith(".svg")
        ? "image/svg+xml"
        : asset.endsWith(".jpg")
          ? "image/jpeg"
          : asset.endsWith(".webp")
            ? "image/webp"
            : "image/png";
      const url = URL.createObjectURL(new Blob([files[asset].slice().buffer], { type }));
      imageURLs.set(kind, url);
      image.src = url;
    }
    const upload = byId<HTMLInputElement>(`${kind}-upload`);
    upload.disabled = kind !== "extra" && (!bytes || !relative);
    upload.title = upload.disabled ? "Edit this image in Template or Settings." : "";
    if (kind === "extra")
      byId("extra-path").textContent = asset
        ? `#image("${asset.replace(/^templates\//, "")}")`
        : "";
  }
}
function changeSettings(values: Record<string, string>) {
  const path = settingsPath(files, template);
  if (!path) throw new Error("This template has no companion Settings file.");
  const bytes = updateThemeSettings(files[path], values);
  editor.replaceFile(path, files[path], bytes);
  refreshTheme();
}
async function action(operation: () => void | Promise<void>) {
  try {
    actionError = undefined;
    await operation();
  } catch (error) {
    actionError = message(error);
  }
  findings();
}

for (const name of ["theme", "template", "settings"] as const)
  button(`${name}-tab`).onclick = () => showTab(name);
document.querySelector(".editor-tabs")?.addEventListener("keydown", (event) => {
  const keyboard = event as KeyboardEvent;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(keyboard.key)) return;
  keyboard.preventDefault();
  const available = ["theme", "template", "settings"].filter(
    (name) => !button(`${name}-tab`).disabled,
  ) as (typeof tab)[];
  const direction = keyboard.key === "ArrowLeft" ? -1 : 1;
  const index =
    keyboard.key === "Home"
      ? 0
      : keyboard.key === "End"
        ? available.length - 1
        : (available.indexOf(tab) + direction + available.length) % available.length;
  showTab(available[index]);
  button(`${tab}-tab`).focus();
});
for (const [id, direction] of [
  ["previous", -1],
  ["next", 1],
] as const)
  button(id).onclick = () => {
    const available = availableExamples();
    example = available[available.findIndex((item) => item.id === example?.id) + direction];
    persist();
    compile(true);
  };
const changeDialog = byId<HTMLDialogElement>("project-change-dialog");
let pendingChange: { template: string; files: Files } | undefined;
function requestProjectChange(target = template) {
  pendingChange = { template: target, files };
  const switching = target !== template;
  const label = Array.from(select("template").options).find(
    (option) => option.value === target,
  )?.text;
  byId("project-change-title").textContent = switching ? "Switch template?" : "Reset workspace?";
  byId("project-change-text").textContent = switching
    ? `Load ${label ?? basename(target)} from its starting copy. Edits to that template will be replaced. Your current template's wording stays saved in this draft.`
    : "Choose how much of the workspace to reset. Your changes are kept until you confirm.";
  byId("project-change-error").hidden = true;
  button("project-change-confirm").textContent = switching ? "Switch template" : "Reset workspace";
  for (const option of changeDialog.querySelectorAll<HTMLElement>("[data-workspace-scope]"))
    option.hidden = switching;
  const hasSettings = Boolean(settingsPath(originals, target));
  for (const input of changeDialog.querySelectorAll<HTMLInputElement>(
    'input[name="reset-scope"]',
  )) {
    input.checked = input.value === "template";
    input.disabled = ["clear", "workspace"].includes(input.value)
      ? switching || (input.value === "clear" && !draftStore)
      : input.value !== "template" && !hasSettings;
  }
  changeDialog.showModal();
}
button("project-change-cancel").onclick = () => changeDialog.close();
changeDialog.addEventListener("close", () => {
  pendingChange = undefined;
});
byId<HTMLFormElement>("project-change-form").onsubmit = (event) => {
  event.preventDefault();
  if (!pendingChange) return;
  try {
    if (files !== pendingChange.files)
      throw new Error("The project changed while this dialog was open. Cancel and try again.");
    const scope = new FormData(byId<HTMLFormElement>("project-change-form")).get("reset-scope") as
      | ResetScope
      | "clear"
      | "workspace";
    if (scope === "clear") {
      if (!draftStore) throw new Error("Draft storage is unavailable.");
      canSave = true;
      draftStore.clear();
      changeDialog.close();
      return;
    }
    if (scope === "workspace") {
      resetWorkspace();
      changeDialog.close();
      return;
    }
    files = resetProject(files, originals, pendingChange.template, scope, template);
    template = pendingChange.template;
    const available = availableExamples();
    example = available.find((item) => item.id === example?.id) ?? available[0];
    themeUndo = undefined;
    button("health-unit-undo").hidden = true;
    if (scope === "theme") select("health-unit-preset").value = "";
    refreshProject();
    persist();
    compile(true);
    changeDialog.close();
  } catch (error) {
    byId("project-change-error").textContent = message(error);
    byId("project-change-error").hidden = false;
  }
};
select("template").onchange = () => {
  const target = select("template").value;
  select("template").value = template;
  if (target !== template) requestProjectChange(target);
};
select("body-font-picker").onchange = () =>
  void action(() =>
    changeSettings({ "body-font": JSON.stringify(select("body-font-picker").value) }),
  );
select("title-align-picker").onchange = () =>
  void action(() => changeSettings({ "title-align": select("title-align-picker").value }));
for (const name of ["heading", "link", "accent"])
  byId<HTMLInputElement>(`${name}-color-picker`).onchange = () =>
    void action(() =>
      changeSettings({
        [`${name}-color`]: `rgb("${byId<HTMLInputElement>(`${name}-color-picker`).value}")`,
      }),
    );
byId<HTMLInputElement>("signature-name-picker").onchange = () =>
  void action(() => {
    const reference = signatureName(files, template);
    if (!reference) throw new Error("Edit the printed name in Template or Settings.");
    const next = updateSignatureName(
      files,
      template,
      byId<HTMLInputElement>("signature-name-picker").value,
    );
    editor.replaceFile(reference.path, files[reference.path], next[reference.path]);
    refreshTheme();
  });
for (const unit of healthUnits) select("health-unit-preset").add(new Option(unit.name, unit.id));
select("health-unit-preset").onchange = () =>
  void action(async () => {
    const unit = healthUnits.find((unit) => unit.id === select("health-unit-preset").value);
    if (!unit) return;
    const path = settingsPath(files, template);
    if (!path) throw new Error("This template has no companion Settings file.");
    const selectedTemplate = template;
    const previous = files;
    let themed = {
      ...files,
      [path]: themedSettings(
        files[path],
        unit,
        Boolean(inlineSignatureImage(files[template])),
        Boolean(inlineSignatureName(files[template])),
      ),
    };
    for (const kind of ["logo", "signature"])
      themed = updateThemeImage(themed, template, kind, `templates/assets/${kind}.png`);
    themed = updateSignatureName(themed, template, unit.signatory);
    if (orderSignatoryName(themed[template]))
      themed[template] = updateOrderSignatoryName(themed[template], unit.signatory);
    const [logo, signature] = await Promise.all(
      [unit.logo, unit.signature].map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Could not load the selected theme image.");
        return new Uint8Array(await response.arrayBuffer());
      }),
    );
    if (files !== previous || template !== selectedTemplate)
      throw new Error("The project changed while the theme loaded. Select the theme again.");
    const next = {
      ...themed,
      "templates/assets/logo.png": logo,
      "templates/assets/signature.png": signature,
    };
    validateFiles(next);
    files = next;
    themeUndo = previous;
    button("health-unit-undo").hidden = false;
    editor.clear();
    refreshTheme();
    persist();
    compile();
  });
button("health-unit-undo").onclick = () => {
  if (!themeUndo) return;
  files = themeUndo;
  themeUndo = undefined;
  button("health-unit-undo").hidden = true;
  editor.clear();
  refreshTheme();
  persist();
  compile();
};
for (const kind of ["logo", "signature", "extra"])
  byId<HTMLInputElement>(`${kind}-upload`).onchange = () =>
    void action(async () => {
      const input = byId<HTMLInputElement>(`${kind}-upload`);
      const file = input.files?.[0];
      if (!file) return;
      const previous = files;
      const bytes = await imageBytes(file);
      if (previous !== files)
        throw new Error("The project changed while the image loaded. Choose it again.");
      const extension = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/svg+xml": "svg",
      }[file.type];
      const asset = `templates/assets/studio-${kind}.${extension}`;
      let next = { ...files, [asset]: bytes };
      if (kind === "extra") {
        for (const name of Object.keys(next)) {
          if (name !== asset && /^templates\/assets\/studio-extra\./.test(name)) delete next[name];
        }
      }
      if (kind !== "extra") next = updateThemeImage(next, template, kind, asset);
      validateFiles(next);
      files = next;
      editor.clear();
      themeUndo = undefined;
      button("health-unit-undo").hidden = true;
      refreshTheme();
      persist();
      compile();
      input.value = "";
    });
byId<HTMLInputElement>("guide").onchange = () =>
  viewer.setGuide(byId<HTMLInputElement>("guide").checked);
button("zoom-in").onclick = () => void action(() => viewer.zoomBy(1.2));
button("zoom-out").onclick = () => void action(() => viewer.zoomBy(1 / 1.2));
const downloadDialog = byId<HTMLDialogElement>("download-dialog");
const downloadForm = byId<HTMLFormElement>("download-form");
const runtimeSelect = select("runtime-platform");
let downloadAbort: AbortController | undefined;
for (const runtime of nativeRuntimes)
  runtimeSelect.add(new Option(runtime.label, runtime.id));
function downloadKind() {
  return downloadForm.querySelector<HTMLInputElement>('input[name="download-kind"]:checked')?.value;
}
function refreshDownloadOptions() {
  const kind = downloadKind();
  for (const option of downloadForm.querySelectorAll<HTMLInputElement>('input[name="download-kind"]'))
    option.disabled = exporting;
  for (const id of ["include-fonts", "include-fictional-data"]) {
    const option = byId<HTMLInputElement>(id);
    option.disabled = exporting || kind === "typst";
    if (option.parentElement) option.parentElement.hidden = kind === "typst";
  }
  byId("download-runtime").hidden = kind !== "runtime";
  runtimeSelect.disabled = exporting || kind !== "runtime";
  button("download-confirm").disabled = exporting;
  downloadForm.setAttribute("aria-busy", String(exporting));
  const runtime = nativeRuntimes.find((item) => item.id === runtimeSelect.value);
  byId("runtime-description").textContent = runtime
    ? `ImmuKnow ${nativeVersion}; about ${Math.ceil(runtime.size / 1_000_000)} MB plus project files. Downloaded when you choose Download ZIP.`
    : "Choose the computer where you will run the project.";
}
byId("download-form").onchange = refreshDownloadOptions;
button("export").onclick = () => {
  byId("download-error").hidden = true;
  byId("download-status").hidden = true;
  byId("download-progress").hidden = true;
  refreshDownloadOptions();
  downloadDialog.showModal();
};
button("download-cancel").onclick = () => {
  downloadAbort?.abort();
  downloadDialog.close();
};
downloadDialog.oncancel = () => downloadAbort?.abort();
downloadForm.onsubmit = (event) => {
  event.preventDefault();
  void action(async () => {
    if (exporting) return;
    const snapshot = {
      files,
      template,
      example,
      revision,
      context: compiler.context,
      includeFonts: byId<HTMLInputElement>("include-fonts").checked,
      includeFictionalData: byId<HTMLInputElement>("include-fictional-data").checked,
      kind: downloadKind(),
      platform: runtimeSelect.value,
    };
    const controller = new AbortController();
    downloadAbort = controller;
    exporting = true;
    refreshDownloads();
    refreshDownloadOptions();
    byId("download-error").hidden = true;
    if (snapshot.kind === "runtime") {
      byId("download-status").hidden = false;
      byId("download-status").textContent = "Preparing project files…";
    } else downloadDialog.close();
    try {
      let bytes: Uint8Array;
      if (snapshot.kind === "typst") {
        bytes = await archiveJob({
          action: "export-typst",
          files: snapshot.files,
          template: snapshot.template,
        }, controller.signal);
      } else {
        const project = currentProject(
          snapshot.files,
          snapshot.template,
          bundle.examples,
          snapshot.example,
          starters,
          snapshot.includeFictionalData,
        );
        const projectFiles = await (snapshot.includeFonts
          ? withProjectFonts(project, controller.signal)
          : withoutProjectFonts(project));
        if (snapshot.kind === "runtime") {
          const runtime = nativeRuntime(snapshot.platform, bundle.build);
          const status = byId("download-status");
          const progress = byId<HTMLProgressElement>("download-progress");
          status.hidden = false;
          status.textContent = `Downloading ImmuKnow for ${runtime.label}…`;
          progress.hidden = false;
          progress.removeAttribute("value");
          const archive = await fetchNativeRuntime(runtime, controller.signal, (received, total) => {
            progress.max = total;
            progress.value = received;
            status.textContent = `Downloading ImmuKnow for ${runtime.label}: ${Math.floor(received / total * 100)}%`;
          });
          status.textContent = "Verifying ImmuKnow and preparing your project ZIP…";
          progress.removeAttribute("value");
          bytes = await archiveJob({
            action: "export-runtime",
            files: projectFiles,
            template: snapshot.template,
            build: bundle.build,
            runtimeId: runtime.id,
            runtime: archive,
          }, controller.signal);
        } else {
          bytes = await archiveJob({
            action: "export", files: projectFiles, template: snapshot.template, build: bundle.build,
          }, controller.signal);
        }
      }
      controller.signal.throwIfAborted();
      if (
        files !== snapshot.files ||
        template !== snapshot.template ||
        example !== snapshot.example ||
        revision !== snapshot.revision ||
        compiler.context !== snapshot.context
      )
        throw new Error("The project changed during download. Download it again.");
      download(
        snapshot.kind === "typst" ? "immuknow-typst.zip" : snapshot.kind === "runtime"
          ? `immuknow-project-${snapshot.platform}.zip` : "immuknow-project.zip",
        bytes,
        "application/zip",
      );
      downloadDialog.close();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (snapshot.kind === "runtime") {
        byId("download-error").textContent = `${message(error)} You can retry or choose Project files only.`;
        byId("download-error").hidden = false;
      }
      throw error;
    } finally {
      downloadAbort = undefined;
      exporting = false;
      byId("download-status").hidden = true;
      byId("download-progress").hidden = true;
      refreshDownloadOptions();
      refreshDownloads();
    }
  });
};
button("reset").onclick = () => requestProjectChange();
function resetWorkspace() {
  files = { ...starters };
  originals = starters;
  template = "templates/overdue_diseases.en.typ";
  example = availableExamples()[0];
  themeUndo = undefined;
  button("health-unit-undo").hidden = true;
  select("health-unit-preset").value = "";
  canSave = Boolean(draftStore);
  if (draftStore) draftStore.clear();
  else unsaved = false;
  refreshProject();
  compile(true);
}
const divider = byId("divider");
function resizeSplit(value: number) {
  const percent = Math.max(25, Math.min(75, value));
  byId("workspace").style.setProperty("--split", `${percent}%`);
  divider.setAttribute("aria-valuenow", String(Math.round(percent)));
}
divider.onpointerdown = (event) => {
  divider.setPointerCapture(event.pointerId);
  divider.onpointermove = (move) => {
    const bounds = byId("workspace").getBoundingClientRect();
    resizeSplit(((move.clientX - bounds.left) / bounds.width) * 100);
  };
};
divider.onpointerup = divider.onpointercancel = () => {
  divider.onpointermove = null;
};
divider.onkeydown = (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  resizeSplit(Number(divider.getAttribute("aria-valuenow")) + (event.key === "ArrowLeft" ? -3 : 3));
};
initializeCodingCheatsheet();
initializeHelp((next) => {
  const original = tab;
  showTab(next ?? "settings");
  return () => showTab(original);
});

function chooseBrowserProject(error: unknown): Promise<boolean> {
  const dialog = byId<HTMLDialogElement>("recovery-dialog");
  byId("recovery-title").textContent = "Your browser project could not be opened";
  byId("recovery-error").textContent = message(error);
  byId("recovery-error").hidden = false;
  button("recovery-continue").textContent = "Keep browser copy";
  dialog.returnValue = "continue";
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "reset"), { once: true });
    dialog.showModal();
  });
}

async function start() {
  const editingControls = ["editor-panel", "theme-panel", "settings-controls", "divider"].map(byId);
  for (const control of editingControls) control.inert = true;
  const projectMenu = document.querySelector<HTMLElement>(".project-actions");
  if (projectMenu) projectMenu.inert = true;
  try {
    if (!(await claimEditingTab())) {
      storageError("Studio is open in another tab. Close that tab, then reload this one.");
      return;
    }
  } catch (error) {
    storageError(error);
    return;
  }
  const response = await fetch(`${import.meta.env.BASE_URL}generated/project.json`);
  if (!response.ok) throw new Error("Could not load the starter project. Reload Studio to retry.");
  bundle = await response.json();
  starters = await decodeFiles(bundle);
  originals = starters;
  files = { ...originals };
  template = "templates/overdue_diseases.en.typ";
  example = bundle.examples.find((item) => item.payloads[basename(template)]);
  try {
    draftStore = await DraftStore.open(bundle.build, saveState);
    try {
      const saved = await draftStore.load();
      canSave = true;
      if (saved) {
        files = saved.files;
        originals = saved.baseline;
        draftRevision = saved.revision;
        template = saved.template;
        const available = availableExamples();
        example = available.find((item) => item.id === saved.example) ?? available[0];
        saveState("saved");
      }
    } catch (error) {
      if (await chooseBrowserProject(error)) {
        canSave = true;
        draftStore.clear();
      } else {
        canSave = false;
        storageError(error);
      }
    }
  } catch (error) {
    storageError(error);
  }
  compiler = new Compiler(
    (status: string, blocking?: boolean) => {
      if (blocking) {
        compilerError = status;
        pending = false;
        previewStatus();
        findings();
      }
    },
    (result) => void compiled(result),
  );
  for (const id of ["template-tab", "theme-tab", "template", "zoom-in", "zoom-out"])
    buttonOrSelect(id).disabled = false;
  refreshProject();
  for (const control of editingControls) control.inert = false;
  if (projectMenu) projectMenu.inert = false;
  compile(true);
}
function buttonOrSelect(id: string) {
  return byId<HTMLButtonElement | HTMLSelectElement>(id);
}
void start().catch((error) => {
  actionError = message(error);
  pending = false;
  previewStatus();
  findings();
});
