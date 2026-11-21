import { zipSync } from "fflate";
import { authoredTypstFiles } from "./project-actions";
import { verifyComponents } from "./component-resources";
import { decoder, encoder, sha256, validateFiles, validateTemplate } from "./project";
import { nativeRevision, nativeRuntime } from "./native-runtime";
import { runtimePackage } from "./runtime-package";
import type { BuildInfo, Files } from "./types";

const manifestName = "immuknow-project.json";

async function projectFiles(files: Files, template: string, build: BuildInfo): Promise<Files> {
  validateFiles(files);
  validateTemplate(files, template);
  await verifyComponents(files, build);
  if (Object.hasOwn(files, manifestName))
    throw new Error(`${manifestName} is reserved for the generated project manifest.`);
  const hashes = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([name, value]) => [name, await sha256(value)]),
    ),
  );
  const project = {
    ...files,
    [manifestName]: encoder.encode(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          build,
          template,
          hashes,
        },
        null,
        2,
      )}\n`,
    ),
  };
  validateFiles(project);
  return project;
}

export function exportTypstFiles(files: Files, template: string): Uint8Array {
  return zipSync(authoredTypstFiles(files, template), { level: 6 });
}

export async function exportProject(
  files: Files,
  template: string,
  build: BuildInfo,
): Promise<Uint8Array> {
  return zipSync(await projectFiles(files, template, build), { level: 6 });
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
  const project = await projectFiles(files, template, build);
  const distribution = runtimePackage(runtime, archive, template, !!files["sample.json"]);
  const reserved = new Set(Object.keys(distribution).map((name) => name.toLowerCase()));
  for (const name of Object.keys(project)) {
    const normalized = name.normalize("NFC").toLowerCase();
    if (
      normalized === "runtime" ||
      normalized.startsWith("runtime/") ||
      [...reserved].some((entry) => normalized === entry || normalized.startsWith(`${entry}/`))
    )
      throw new Error(
        `The bundled runtime would replace ${name}. Choose Project files only to preserve that file.`,
      );
  }
  return zipSync({ ...project, ...distribution }, { level: 6 });
}
