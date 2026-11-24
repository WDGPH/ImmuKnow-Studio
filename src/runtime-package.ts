import type { Zippable } from "fflate";
import { nativeVersion, type NativeRuntime } from "./native-runtime";
import { encoder } from "./project";

function unixLauncher(runtime: NativeRuntime, directory: string): string {
  return `#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
cd "$project_dir"
runtime_dir="$project_dir/runtime/${directory}"
if [ ! -f "$runtime_dir/.complete" ] || [ ! -f "$runtime_dir/immuknow" ]; then
  mkdir -p "$runtime_dir"
  if ! tar -xzf "$project_dir/runtime/${runtime.filename}" -C "$runtime_dir"; then
    echo "Could not extract ImmuKnow. Extract the complete project ZIP again and retry." >&2
    exit 1
  fi
  chmod u+x "$runtime_dir/immuknow"
  : > "$runtime_dir/.complete"
fi
if [ -d "$project_dir/templates/fonts" ]; then
  TYPST_FONT_PATHS="$project_dir/templates/fonts\${TYPST_FONT_PATHS:+:$TYPST_FONT_PATHS}"
  export TYPST_FONT_PATHS
fi
exec "$runtime_dir/immuknow" "$@"
`;
}

function windowsLauncher(runtime: NativeRuntime, directory: string): string {
  return `@echo off
setlocal DisableDelayedExpansion
pushd "%~dp0" || exit /b 1
set "IMMUKNOW_RUNTIME_DIR=%~dp0runtime\\${directory}"
set "IMMUKNOW_RUNTIME_ARCHIVE=%~dp0runtime\\${runtime.filename}"
if not exist "%IMMUKNOW_RUNTIME_DIR%\\immuknow.exe" goto extract
if exist "%IMMUKNOW_RUNTIME_DIR%\\.complete" goto run
:extract
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference = 'Stop'; if ((Get-FileHash -LiteralPath $env:IMMUKNOW_RUNTIME_ARCHIVE -Algorithm SHA256).Hash -ne '${runtime.sha256}') { throw 'Runtime archive is incomplete or changed. Extract the project ZIP again.' }; Expand-Archive -LiteralPath $env:IMMUKNOW_RUNTIME_ARCHIVE -DestinationPath $env:IMMUKNOW_RUNTIME_DIR -Force; if (!(Test-Path -LiteralPath (Join-Path $env:IMMUKNOW_RUNTIME_DIR 'immuknow.exe'))) { throw 'The runtime executable is missing.' }; Set-Content -LiteralPath (Join-Path $env:IMMUKNOW_RUNTIME_DIR '.complete') -Value '${runtime.sha256}'"
if errorlevel 1 goto failed
:run
if not exist "%~dp0templates\\fonts" goto execute
if defined TYPST_FONT_PATHS goto appendfonts
set "TYPST_FONT_PATHS=%~dp0templates\\fonts"
goto execute
:appendfonts
set "TYPST_FONT_PATHS=%~dp0templates\\fonts;%TYPST_FONT_PATHS%"
:execute
"%IMMUKNOW_RUNTIME_DIR%\\immuknow.exe" %*
set "IMMUKNOW_EXIT=%ERRORLEVEL%"
popd
exit /b %IMMUKNOW_EXIT%
:failed
echo Could not extract ImmuKnow. Extract the complete project ZIP again and retry. 1>&2
popd
exit /b 1
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
sh ./immuknow run --sample
result=$?
${mac ? 'printf "\\nReview the run summary above and any findings. Press Return to close. "\nread -r answer\n' : ""}exit "$result"
`;
}

// Runtime assets are distribution files, separate from the bounded authored project.
// Keep the upstream archive intact (including its licence) and store without
// recompression. First use extracts it with the workstation's built-in tools.
export function runtimePackage(
  runtime: NativeRuntime,
  archive: Uint8Array,
  template: string,
  hasSample: boolean,
): Zippable {
  const windows = runtime.id.startsWith("windows-");
  const mac = runtime.id.startsWith("macos-");
  const launcher = windows ? "immuknow.cmd" : "immuknow";
  const sample = windows ? "run-sample.cmd" : mac ? "run-sample.command" : "run-sample.sh";
  const command = windows ? ".\\immuknow.cmd" : "sh ./immuknow";
  const templateArgument = windows
    ? `'${template.replaceAll("'", "''")}'`
    : `'${template.replaceAll("'", "'\\''")}'`;
  const directory = `immuknow-${nativeVersion}-${runtime.id}-${runtime.sha256.slice(0, 12)}`;
  const executable = { os: 3, attrs: 0o100755 << 16 };
  const entries: Zippable = {
    [`runtime/${runtime.filename}`]: [archive, { level: 0 }],
    [launcher]: [
      encoder.encode(
        windows ? windowsLauncher(runtime, directory) : unixLauncher(runtime, directory),
      ),
      executable,
    ],
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
