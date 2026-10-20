import content from "../docs/coding-cheatsheet.md?raw";

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function initializeCodingCheatsheet() {
  const trigger = byId<HTMLButtonElement>("coding-cheatsheet-open");
  const dialog = byId<HTMLDialogElement>("coding-cheatsheet-dialog");
  // This is a bundled, authored manual fragment, never imported project content.
  byId("coding-cheatsheet-content").innerHTML = content;
  trigger.onclick = () => {
    dialog.showModal();
    dialog.scrollTop = 0;
  };
  byId("coding-cheatsheet-close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => trigger.focus({ preventScroll: true }));
}
