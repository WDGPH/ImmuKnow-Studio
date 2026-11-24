import { confirmProjectChange, restoredProject, saved, restoreAuthoredDraft } from "./helpers";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { unzipSync } from "fflate";
import type { Draft } from "../src/drafts";
import type { Bundle, Files } from "../src/types";

const database = "immuknow-studio-drafts-v2";
const template = "templates/overdue_diseases.en.typ";

declare global {
  interface Window {
    draftProbe: { hold: boolean; fail: boolean; abortNext: boolean; release: () => void };
  }
}

async function ready(page: Page) {
  await expect(page.locator("#template-tab")).toBeEnabled();
  await page.locator("#template-tab").click();
  await expect(page.locator(".cm-content")).not.toBeEmpty();
  await page.locator(".cm-content").press("Control+End");
}
async function append(page: Page, text: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(`\n// ${text}`);
}
async function menu(page: Page, id: string) {
  await page.locator(".project-actions").evaluate((element) => element.setAttribute("open", ""));
  if (id === "clear") {
    await page.locator("#reset").click();
    await confirmProjectChange(page, "clear");
  } else {
    await page.locator(`#${id}`).click();
    if (id === "export") {
      await page.locator('input[name="download-kind"][value="project"]').check();
      await page.locator("#download-confirm").click();
    }
  }
}
async function stored(page: Page, name = database): Promise<Draft | undefined> {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Draft | undefined>((resolve, reject) => {
        const request = db.transaction("drafts").objectStore("drafts").get("current");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, name);
}
async function storageProbe(page: Page) {
  await page.addInitScript(() => {
    const pending: (() => void)[] = [];
    window.draftProbe = {
      hold: false,
      fail: false,
      abortNext: false,
      release: () => {
        window.draftProbe.hold = false;
        for (const done of pending.splice(0)) done();
      },
    };
    for (const eventName of ["oncomplete", "onabort", "onerror"]) {
      const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, eventName);
      if (!descriptor?.set) throw new Error("Missing transaction event");
      Object.defineProperty(IDBTransaction.prototype, eventName, {
        set(handler: (event: Event) => void) {
          descriptor.set?.call(this, (event: Event) => {
            const done = () => handler.call(this, event);
            if (this.mode === "readwrite" && window.draftProbe.hold) pending.push(done);
            else done();
          });
        },
      });
    }
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (window.draftProbe.fail) throw new DOMException("Storage full", "QuotaExceededError");
      const request = put.call(this, value, key);
      if (window.draftProbe.abortNext) {
        window.draftProbe.abortNext = false;
        this.transaction.abort();
      }
      return request;
    };
  });
}

test("browsing untouched examples reopens without a project dialog", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  await page.getByRole("button", { name: "Next example" }).click();
  await saved(page);
  const before = await stored(page);
  const pluginPath = "templates/lib/immuknow/vendor/qr/qr.wasm";
  const plugin = Object.values(before?.files[pluginPath] ?? {});
  expect(plugin.length).toBeGreaterThan(8);
  expect(plugin.slice(0, 8)).toEqual([0, 97, 115, 109, 1, 0, 0, 0]);
  expect(before?.baseline[pluginPath]).toEqual(before?.files[pluginPath]);
  await page.reload();
  await ready(page);
  await expect(page.locator("#recovery-dialog")).not.toBeVisible();
  await expect(page.locator("#example")).toHaveText("Example client 02");
  const after = await stored(page);
  expect(after?.files[pluginPath]).toEqual(before?.files[pluginPath]);
  expect(after?.baseline[pluginPath]).toEqual(before?.baseline[pluginPath]);
});

test("a UI-only release resumes authored bytes and their reset baseline without prompting", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  await append(page, "Keep this notice across UI releases");
  await saved(page);
  const before = await stored(page);
  await page.route("**/generated/project.json", async (route) => {
    const response = await route.fetch();
    const bundle = (await response.json()) as Bundle;
    bundle.build.studio_version = "ui-only-release";
    bundle.build.source_revision = "1".repeat(40);
    await route.fulfill({ response, json: bundle });
  });
  await page.reload();
  await ready(page);
  await expect(page.locator("#recovery-dialog")).not.toBeVisible();
  await expect(page.locator(".cm-content")).toContainText("Keep this notice across UI releases");
  expect(await stored(page)).toEqual(before);
});

test("an immediate reload is guarded until the newest edit has saved", async ({ page }) => {
  await storageProbe(page);
  await page.goto("./");
  await ready(page);
  await expect(page.locator("#save-state, #storage, #save-error")).toHaveCount(0);
  const position = await page.locator("#workspace").boundingBox();
  await append(page, "Earlier saved edit");
  await saved(page);
  expect(await page.locator("#workspace").boundingBox()).toEqual(position);
  const before = (await stored(page))?.revision ?? 0;
  await page.evaluate(() => {
    window.draftProbe.hold = true;
  });
  await append(page, "First pending edit");
  await append(page, "Newest edit survives reload");
  expect(await page.locator("#workspace").boundingBox()).toEqual(position);
  const prompt = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const dialog = await prompt;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.locator(".cm-content")).toContainText("Newest edit survives reload");
  await page.evaluate(() => window.draftProbe.release());
  await saved(page);
  expect((await stored(page))?.revision).toBeGreaterThan(before);
  const recovered = await stored(page);
  await page.reload();
  await restoredProject(page);
  expect(await stored(page)).toEqual(recovered);
  await ready(page);
  await expect(page.locator(".cm-content")).toContainText("Newest edit survives reload");
});

test("a compatible saved custom notice retains its reset baseline after reload", async ({
  page,
}) => {
  await page.goto("./");
  await ready(page);
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const files: Files = Object.fromEntries(
    Object.entries(bundle.files).map(([name, bytes]) => [
      name,
      new Uint8Array(Buffer.from(bytes, "base64")),
    ]),
  );
  const custom = "templates/my_notice_v2.en.typ";
  files[custom] = new TextEncoder().encode(
    `${new TextDecoder().decode(files[template])}\n// Authored baseline`,
  );
  await restoreAuthoredDraft(page, files, bundle.build, custom);
  await page.locator(".cm-content").press("Control+End");
  await expect(page.locator(".cm-content")).toContainText("Authored baseline");
  await saved(page);
  await page.reload();
  await restoredProject(page);
  await ready(page);
  await expect(page.locator("#template")).toHaveValue(custom);
  await append(page, "Remove this edit on reset");
  await saved(page);
  await menu(page, "reset");
  await confirmProjectChange(page);
  await saved(page);
  await expect(page.locator(".cm-content")).toContainText("Authored baseline");
  await expect(page.locator(".cm-content")).not.toContainText("Remove this edit on reset");
  await page.reload();
  await restoredProject(page);
  await ready(page);
  await expect(page.locator(".cm-content")).toContainText("Authored baseline");
  await expect(page.locator(".cm-content")).not.toContainText("Remove this edit on reset");
});

test("starting fresh discards the browser copy and restores the complete starter project", async ({
  page,
}, info) => {
  await page.goto("./");
  await ready(page);
  await expect(page.locator("#recovery-dialog")).not.toBeVisible();
  const bundle = (await (await page.request.get("./generated/project.json")).json()) as Bundle;
  const starters: Files = Object.fromEntries(
    Object.entries(bundle.files).map(([name, bytes]) => [
      name,
      new Uint8Array(Buffer.from(bytes, "base64")),
    ]),
  );
  const custom = "templates/custom_notice_v1.en.typ";
  const files = {
    ...starters,
    [custom]: new TextEncoder().encode(
      `${new TextDecoder().decode(starters[template])}\n// Authored notice`,
    ),
    "templates/settings.typ": new TextEncoder().encode(
      `${new TextDecoder().decode(starters["templates/settings.typ"])}\n// Authored settings`,
    ),
  };
  await restoreAuthoredDraft(page, files, bundle.build, custom);
  await saved(page);
  const before = await stored(page);
  await page.reload();
  await restoredProject(page);
  await expect(page.locator("#fresh, #clear")).toHaveCount(0);
  await expect(page.locator(".project-actions #reset")).toHaveText("Reset workspace…");
  await menu(page, "reset");
  await expect(page.getByRole("dialog", { name: "Reset workspace?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath("reset-workspace-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("reset-workspace-mobile.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press("Escape");
  expect(await stored(page)).toEqual(before);
  await expect(page.locator("#template")).toHaveValue(custom);
  await menu(page, "reset");
  await expect(page.getByText("Entire workspace", { exact: true })).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await confirmProjectChange(page, "workspace");
  await ready(page);
  await saved(page);
  expect(await stored(page)).toBeUndefined();
  await expect(page.locator("#template")).toHaveValue(template);
  await expect(page.locator(".cm-content")).not.toContainText("Authored notice");
  await append(page, "First edit in the fresh project");
  await saved(page);
  expect((await stored(page))?.baseline).toEqual(starters);
});

test("clearing cancels pending saves, preserves the open project and leaves older storage untouched", async ({
  page,
}) => {
  await storageProbe(page);
  await page.goto("./proof.html");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("immuknow-studio-drafts", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("drafts", "readwrite");
        tx.objectStore("drafts").put({ schemaVersion: 1, text: "Keep my older work" }, "current");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.goto("./");
  await ready(page);
  const legacy = await stored(page, "immuknow-studio-drafts");
  await page.evaluate(() => {
    window.draftProbe.hold = true;
  });
  await append(page, "Open work remains after clearing");
  await menu(page, "clear");
  await page.evaluate(() => window.draftProbe.release());
  await saved(page);
  expect(await stored(page)).toBeUndefined();
  expect(await stored(page, "immuknow-studio-drafts")).toEqual(legacy);
  await expect(page.locator(".cm-content")).toContainText("Open work remains after clearing");
  await append(page, "Editing saves again");
  await saved(page);
  await page.reload();
  await restoredProject(page);
  await ready(page);
  await expect(page.locator(".cm-content")).toContainText("Editing saves again");
  expect(await stored(page, "immuknow-studio-drafts")).toEqual(legacy);
});

test("failed storage keeps current work downloadable and a later edit retries saving", async ({
  page,
}) => {
  await storageProbe(page);
  await page.goto("./");
  await ready(page);
  await append(page, "Saved before storage filled");
  await saved(page);
  await page.evaluate(() => {
    window.draftProbe.fail = true;
  });
  await append(page, "Keep this unsaved edit in the ZIP");
  await expect(page.locator("#diagnostics")).toContainText("The browser draft could not be saved.");
  const pending = page.waitForEvent("download");
  await menu(page, "export");
  const path = await (await pending).path();
  const files = unzipSync(readFileSync(path as string));
  expect(new TextDecoder().decode(files[template])).toContain("Keep this unsaved edit in the ZIP");
  await page.evaluate(() => {
    window.draftProbe.fail = false;
  });
  await append(page, "Retry succeeds");
  await saved(page);
  await expect(page.locator("#diagnostics")).not.toContainText(
    "The browser draft could not be saved.",
  );
  await page.reload();
  await restoredProject(page);
  await ready(page);
  await expect(page.locator(".cm-content")).toContainText("Keep this unsaved edit in the ZIP");
  await expect(page.locator(".cm-content")).toContainText("Retry succeeds");
});

test("a second tab cannot overwrite the draft and can reopen it after the first closes", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await ready(page);
  await append(page, "Work from the first tab");
  await saved(page);
  const second = await context.newPage();
  await second.goto("./");
  await expect(second.getByRole("list")).toContainText("Studio is open in another tab");
  await expect(second.locator("#editor-panel")).toHaveAttribute("inert", "");
  await expect(second.locator("#theme-panel")).toHaveAttribute("inert", "");
  await expect(second.locator("#template-tab")).toBeDisabled();
  await expect(second.locator("#import, #archive")).toHaveCount(0);
  await page.close();
  await second.reload();
  await restoredProject(second);
  await ready(second);
  await expect(second.locator(".cm-content")).toContainText("Work from the first tab");
  await append(second, "Work from the next tab");
  await saved(second);
  await second.reload();
  await restoredProject(second);
  await ready(second);
  await expect(second.locator(".cm-content")).toContainText("Work from the next tab");
});

test("a requested clear still finishes after the preceding write fails", async ({ page }) => {
  await storageProbe(page);
  await page.goto("./");
  await ready(page);
  await append(page, "Earlier saved work");
  await saved(page);
  await page.evaluate(() => {
    window.draftProbe.hold = true;
    window.draftProbe.abortNext = true;
  });
  await append(page, "This write is aborted");
  await menu(page, "clear");
  await page.evaluate(() => window.draftProbe.release());
  await saved(page);
  expect(await stored(page)).toBeUndefined();
});

test("unavailable storage leaves editing and project download available", async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
  });
  await page.goto("./");
  await ready(page);
  await append(page, "Work without local storage");
  await expect(page.locator("#diagnostics")).toContainText("Storage denied");
  const pending = page.waitForEvent("download");
  await menu(page, "export");
  const path = await (await pending).path();
  const files = unzipSync(readFileSync(path as string));
  expect(new TextDecoder().decode(files[template])).toContain("Work without local storage");
});

for (const incompatible of [
  "format",
  "build",
  "template",
  "library",
  "baseline-library",
] as const) {
  test(`an unsupported draft ${incompatible} is retained until explicitly cleared`, async ({
    page,
  }) => {
    await page.goto("./");
    await ready(page);
    await append(page, "Retain this unsupported draft");
    await saved(page);
    await page.goto("./proof.html");
    await page.evaluate(
      async ({ database, incompatible }) => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open(database, 1);
          request.onsuccess = () => resolve(request.result);
        });
        await new Promise<void>((resolve) => {
          const tx = db.transaction("drafts", "readwrite");
          const store = tx.objectStore("drafts");
          const read = store.get("current");
          read.onsuccess = () => {
            const draft = read.result;
            if (incompatible === "format") draft.schemaVersion = 99;
            else if (incompatible === "build") draft.build.shared_resources.sha256 = "unsupported";
            else if (incompatible === "library" || incompatible === "baseline-library") {
              const target = incompatible === "library" ? draft.files : draft.baseline;
              target["templates/lib/immuknow/lib.typ"] = new TextEncoder().encode(
                "Changed library",
              );
            } else {
              draft.template = "config/notice.en.typ";
              draft.files[draft.template] = new TextEncoder().encode("Wrong directory");
              draft.baseline[draft.template] = draft.files[draft.template];
            }
            store.put(draft, "current");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        });
      },
      { database, incompatible },
    );
    const before = await stored(page);
    await page.goto("./");
    await expect(
      page.getByRole("dialog", { name: "Your browser project could not be opened" }),
    ).toBeVisible();
    const reason =
      incompatible === "format"
        ? "unsupported format"
        : incompatible === "build"
          ? "different ImmuKnow format"
          : incompatible === "template"
            ? "entry point"
            : "differs from the supplied version";
    await expect(page.locator("#recovery-error")).toContainText(reason);
    expect(await stored(page)).toEqual(before);
    if (incompatible === "build") {
      await page.getByRole("button", { name: "Start fresh", exact: true }).click();
      await ready(page);
      await saved(page);
      expect(await stored(page)).toBeUndefined();
      await append(page, "Save after discarding the incompatible copy");
      await saved(page);
      expect((await stored(page))?.schemaVersion).toBe(2);
      return;
    }
    await page.getByRole("button", { name: "Keep browser copy", exact: true }).click();
    await ready(page);
    await expect(page.locator("#diagnostics")).toContainText(reason);
    await append(page, "Do not replace stored work without clearing");
    await expect(page.locator("#diagnostics")).toContainText(reason);
    expect(await stored(page)).toEqual(before);
    await menu(page, "clear");
    await saved(page);
    expect(await stored(page)).toBeUndefined();
    await append(page, "Now save the open project");
    await saved(page);
    expect((await stored(page))?.schemaVersion).toBe(2);
  });
}
