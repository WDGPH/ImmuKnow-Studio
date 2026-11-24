import type { BuildInfo, Files } from "./types";

export type ArchiveRequest =
  | { action: "export"; files: Files; template: string; build: BuildInfo }
  | { action: "export-typst"; files: Files; template: string }
  | {
      action: "export-runtime";
      files: Files;
      template: string;
      build: BuildInfo;
      runtimeId: string;
      runtime: Uint8Array;
    };

export function archiveJob(request: ArchiveRequest, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const worker = new Worker(new URL("./archive.worker.ts", import.meta.url), { type: "module" });
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      finish();
      reject(new Error("Archive processing exceeded 30 seconds; no files were changed."));
    }, 30_000);
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event) => {
      finish();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("Archive processing failed; no files were changed."));
    };
    worker.postMessage(
      request,
      request.action === "export-runtime" ? [request.runtime.buffer as ArrayBuffer] : [],
    );
  });
}
