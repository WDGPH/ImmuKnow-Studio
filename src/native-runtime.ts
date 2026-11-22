import pins from "../native-runtimes.json";
import type { BuildInfo } from "./types";

export const nativeRuntimes = pins.platforms;
export const nativeVersion = pins.version;
export const nativeRevision = pins.revision;
export type NativeRuntime = (typeof nativeRuntimes)[number];

export function nativeRuntime(id: string, build: BuildInfo): NativeRuntime {
  if (
    build.immuknow_source_revision !== nativeRevision ||
    build.immuknow_source_modified !== false ||
    build.application_version !== nativeVersion
  )
    throw new Error("No bundled runtime matches this project build. Choose Project files only.");
  const runtime = nativeRuntimes.find((item) => item.id === id);
  if (!runtime) throw new Error("Choose the operating system and processor for your workstation.");
  return runtime;
}

// Fetch only the explicitly selected archive. It never enters the editor's Files,
// draft storage or compiler. The archive worker verifies its SHA-256 before use.
export async function fetchNativeRuntime(
  runtime: NativeRuntime,
  signal: AbortSignal,
  progress: (received: number, total: number) => void,
): Promise<Uint8Array> {
  const timeout = AbortSignal.timeout(120_000);
  const response = await fetch(
    `${import.meta.env.BASE_URL}generated/runtimes/${runtime.filename}`,
    {
      signal: AbortSignal.any([signal, timeout]),
      credentials: "same-origin",
    },
  );
  if (!response.ok || !response.body)
    throw new Error(
      "The runtime could not be downloaded. Try again online, or choose Project files only.",
    );
  const reader = response.body.getReader();
  const bytes = new Uint8Array(runtime.size);
  let received = 0;
  try {
    progress(0, runtime.size);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.length > runtime.size)
        throw new Error("The runtime download exceeds its expected size. Try downloading again.");
      bytes.set(value, received);
      received += value.length;
      progress(received, runtime.size);
    }
    if (received !== runtime.size)
      throw new Error("The runtime download is incomplete. Try downloading again.");
    return bytes;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
