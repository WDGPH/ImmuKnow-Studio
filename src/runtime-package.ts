import { gunzipSync, unzipSync, type Zippable } from "fflate";
import { nativeVersion, type NativeRuntime } from "./native-runtime";
import { decoder, encoder } from "./project";

function tarReleaseFiles(archive: Uint8Array): Record<string, Uint8Array> {
  // ImmuKnow publishes two root files and uses PAX headers for timestamps.
  const tar = gunzipSync(archive);
  const field = (offset: number, length: number) =>
    decoder.decode(tar.subarray(offset, offset + length)).split("\0", 1)[0].trim();
  const files: Record<string, Uint8Array> = {};
  const block = 512;
  for (let offset = 0; offset + block <= tar.length;) {
    const name = field(offset, 100);
    if (!name) break;
    const sizeField = field(offset + 124, 12);
    const size = /^[0-7]+$/.test(sizeField) ? Number.parseInt(sizeField, 8) : NaN;
    const start = offset + block;
    const end = start + size;
    if (!Number.isSafeInteger(end) || end > tar.length)
      throw new Error("Invalid tar entry size");
    const type = tar[offset + 156];
    offset = start + Math.ceil(size / block) * block;
    if (type === 120) continue; // PAX metadata
    if ((name !== "immuknow" && name !== "LICENSE") || files[name] || (type !== 0 && type !== 48) ||
        field(start - block + 345, 155))
      throw new Error("Unexpected tar entry");
    files[name] = tar.subarray(start, end);
  }
  return files;
}

function releaseFiles(archive: Uint8Array, executable: string) {
  try {
    const files = executable === "immuknow.exe"
      ? unzipSync(archive, { filter: ({ name }) => name === executable || name === "LICENSE" })
      : tarReleaseFiles(archive);
    if (!files[executable]?.length || !files.LICENSE?.length)
      throw new Error("The executable or license is missing");
    return { binary: files[executable], license: files.LICENSE };
  } catch (cause) {
    throw new Error("The ImmuKnow release archive could not be unpacked. Choose Project files only.", { cause });
  }
}

function unixLauncher(): string {
  return `#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
cd "$project_dir"
if [ ! -x "$project_dir/immuknow" ]; then
  chmod u+x "$project_dir/immuknow"
fi
if [ -d "$project_dir/templates/fonts" ]; then
  TYPST_FONT_PATHS="$project_dir/templates/fonts\${TYPST_FONT_PATHS:+:$TYPST_FONT_PATHS}"
  export TYPST_FONT_PATHS
fi
exec "$project_dir/immuknow" "$@"
`;
}

function windowsLauncher(): string {
  return `@echo off
setlocal DisableDelayedExpansion
pushd "%~dp0" || exit /b 1
if not exist "%~dp0templates\\fonts" goto execute
if defined TYPST_FONT_PATHS goto appendfonts
set "TYPST_FONT_PATHS=%~dp0templates\\fonts"
goto execute
:appendfonts
set "TYPST_FONT_PATHS=%~dp0templates\\fonts;%TYPST_FONT_PATHS%"
:execute
"%~dp0immuknow.exe" %*
set "IMMUKNOW_EXIT=%ERRORLEVEL%"
popd
exit /b %IMMUKNOW_EXIT%
`.replaceAll("\n", "\r\n");
}

function sampleLauncher(windows: boolean, mac: boolean): string {
  if (windows)
    return `@echo off
setlocal DisableDelayedExpansion
call "%~dp0immuknow.cmd" run --sample
set "IMMUKNOW_EXIT=%ERRORLEVEL%"
echo.
echo Review the run summary above and any findings before using the output.
pause
exit /b %IMMUKNOW_EXIT%
`.replaceAll("\n", "\r\n");
  return `#!/bin/sh
cd -P -- "$(dirname -- "$0")" || exit 1
sh ./immuknow.sh run --sample
result=$?
${mac ? 'printf "\\nReview the run summary above and any findings. Press Return to close. "\nread -r answer\n' : ""}exit "$result"
`;
}

// Runtime assets are distribution files, separate from the bounded authored project.
// Unpack only the executable and its license from the verified release.
export function runtimePackage(
  runtime: NativeRuntime,
  archive: Uint8Array,
  template: string,
  hasSample: boolean,
): Zippable {
  const windows = runtime.id.startsWith("windows-");
  const mac = runtime.id.startsWith("macos-");
  const executableName = windows ? "immuknow.exe" : "immuknow";
  const launcher = windows ? "immuknow.cmd" : "immuknow.sh";
  const sample = windows ? "run-sample.cmd" : mac ? "run-sample.command" : "run-sample.sh";
  const command = windows ? ".\\immuknow.cmd" : "sh ./immuknow.sh";
  const templateArgument = windows
    ? `'${template.replaceAll("'", "''")}'`
    : `'${template.replaceAll("'", "'\\''")}'`;
  const { binary, license } = releaseFiles(archive, executableName);
  const executable = { os: 3, attrs: 0o100755 << 16 };
  const entries: Zippable = {
    [executableName]: [binary, executable],
    "ImmuKnow-LICENSE.txt": license,
    [launcher]: [encoder.encode(windows ? windowsLauncher() : unixLauncher()), executable],
    "START-HERE.txt": encoder.encode(`ImmuKnow ${nativeVersion} for ${runtime.label}

Extract the whole ZIP to a folder. Keep the extracted files together.
${hasSample ? `
Try the fictional sample
${windows || mac ? `Open ${sample} in the extracted folder.` : `Open a terminal in the extracted folder and run sh ./${sample}.`}
Open runs/ to find the output. Review the findings before using any notices.
` : ""}
Use your own CSV
Open a terminal in the extracted folder. Replace input/clients.csv below
with the path to your CSV.

${command} run input/clients.csv --template ${templateArgument}

Help and input requirements
https://docs.phiz.ca/immuknow/latest/
`),
  };
  if (hasSample) entries[sample] = [encoder.encode(sampleLauncher(windows, mac)), executable];
  return entries;
}
