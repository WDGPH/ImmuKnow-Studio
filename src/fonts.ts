import { FontInputs, fontManifest } from "./font-resources";
import { safePath, sha256, validateFiles } from "./project";
import type { Files } from "./types";

const fontRoot = "templates/fonts/";

// Only byte-identical supplied fonts may be omitted from an imported project.
// Preserve every other file, including unknown or modified files.
export async function withoutProjectFonts(files: Files): Promise<Files> {
  validateFiles(files);
  const result = { ...files };
  const present: string[] = [];
  for (const [name, hash] of Object.entries(fontManifest)) {
    const path = `${fontRoot}${name}`;
    if (!files[path]) continue;
    if ((await sha256(files[path])) !== hash) return result;
    present.push(path);
  }
  for (const path of present) delete result[path];
  return result;
}

// Include the supplied preview fonts and their licences.
export async function withProjectFonts(files: Files, signal?: AbortSignal): Promise<Files> {
  validateFiles(files);
  const result = Object.fromEntries(
    Object.entries(files).filter(([path]) => !path.startsWith(fontRoot)),
  );
  const base = `${import.meta.env.BASE_URL}generated/fonts/`;
  async function resource(name: string): Promise<Uint8Array> {
    safePath(name);
    const response = await fetch(base + name, { signal });
    if (!response.ok) throw new Error(`Could not include project font resource: ${name}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const bundled: Files = Object.fromEntries(
    await Promise.all(
      Object.entries(fontManifest).map(async ([name, hash]) => {
        const bytes = await resource(name);
        if ((await sha256(bytes)) !== hash) throw new Error(`Font integrity check failed: ${name}`);
        return [`/${fontRoot}${name}`, bytes];
      }),
    ),
  );
  new FontInputs(bundled).validate(
    Object.fromEntries(Object.entries(files).map(([path, bytes]) => [`/${path}`, bytes])),
  );
  for (const [path, bytes] of Object.entries(bundled)) result[path.slice(1)] ??= bytes;
  for (const name of ["manifest.json", "families.json", "LICENSE", "UPSTREAM.json"])
    result[`${fontRoot}${name}`] ??= await resource(name);
  validateFiles(result);
  return result;
}
