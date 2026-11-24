import { zipSync } from "fflate";
import { authoredTypstFiles } from "./project-actions";
import { verifyComponents } from "./component-resources";
import { decoder, sha256, validateFiles, validateTemplate } from "./project";
import { nativeRevision, nativeRuntime } from "./native-runtime";
import { runtimePackage } from "./runtime-package";
import type { BuildInfo, Files } from "./types";

// fflate can emit DEFLATE blocks that Windows Explorer rejects. See fflate#296.
const zipOptions = { level: 0 } as const;

function checkProject(files: Files, template: string, build: BuildInfo): Promise<void> {
  validateFiles(files);
  validateTemplate(files, template);
  return verifyComponents(files, build);
}

export function exportTypstFiles(files: Files, template: string): Uint8Array {
  return zipSync(authoredTypstFiles(files, template), zipOptions);
}

export async function exportProject(
  files: Files,
  template: string,
  build: BuildInfo,
): Promise<Uint8Array> {
  await checkProject(files, template, build);
  return zipSync(files, zipOptions);
}

export async function exportRuntimeProject(
  files: Files,
  template: string,
  build: BuildInfo,
  runtimeId: string,
  archive: Uint8Array,
): Promise<Uint8Array> {
  const runtime = nativeRuntime(runtimeId, build);
  if (
    !files["immuknow-revision.txt"] ||
    decoder.decode(files["immuknow-revision.txt"]).trim() !== nativeRevision
  )
    throw new Error(
      "This project's ImmuKnow pin differs from the bundled runtime. Choose Project files only.",
    );
  if (archive.length !== runtime.size || (await sha256(archive)) !== runtime.sha256)
    throw new Error(
      "The runtime download failed its integrity check. Retry, or choose Project files only.",
    );
  await checkProject(files, template, build);
  const distribution = runtimePackage(runtime, archive, template, !!files["sample.json"]);
  const reserved = new Set(Object.keys(distribution).map((name) => name.toLowerCase()));
  for (const name of Object.keys(files)) {
    const normalized = name.normalize("NFC").toLowerCase();
    if (
      [...reserved].some((entry) => normalized === entry || normalized.startsWith(`${entry}/`))
    )
      throw new Error(
        `The bundled runtime would replace ${name}. Choose Project files only to preserve that file.`,
      );
  }
  return zipSync({ ...files, ...distribution }, zipOptions);
}
