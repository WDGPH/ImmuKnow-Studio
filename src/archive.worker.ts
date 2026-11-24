import type { ArchiveRequest } from "./archive";
import { exportProject, exportRuntimeProject, exportTypstFiles } from "./project-archive";

globalThis.onmessage = async (event: MessageEvent<ArchiveRequest>) => {
  try {
    const request = event.data;
    const result =
      request.action === "export"
        ? await exportProject(request.files, request.template, request.build)
        : request.action === "export-typst"
          ? exportTypstFiles(request.files, request.template)
          : await exportRuntimeProject(
              request.files,
              request.template,
              request.build,
              request.runtimeId,
              request.runtime,
            );
    postMessage({ result }, { transfer: [result.buffer as ArrayBuffer] });
  } catch (error) {
    postMessage({ error: String(error) });
  }
};
