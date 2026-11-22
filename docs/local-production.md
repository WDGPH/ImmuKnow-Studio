# Use projects on your workstation

Studio downloads your selected notice, Settings and assets from the current
[ImmuKnow-Template](https://github.com/WDGPH/ImmuKnow-Template) project. A
**Ready-to-run project** also includes the matching native ImmuKnow runtime and
launchers. Setup and runs require no Python, uv, separate Typst installation or
Template checkout.

## Download and extract your project

Open **Project → Download project**. Keep **Ready-to-run project**. Studio
fills in the operating system and processor when your browser provides them.
Check that the selection matches the computer that will run ImmuKnow. Choose
Windows x64, macOS Apple silicon, macOS Intel or Linux x64 as needed.

Keep **Include fonts** selected to use the supplied fonts directly from the
project. **Include fictional client data** supplies the selected preview client
for a sample run. Clear it to omit Studio’s fictional inputs and supply your own
CSV and notice selection. Custom sample data already in a compatible saved
draft is preserved.

Download and extract the complete ZIP into a folder you control. Open
`START-HERE.txt` for the platform-specific commands. Keep the directory structure
and relative paths together, and leave `templates/lib/immuknow/` unchanged.

| Item | Purpose |
| --- | --- |
| `START-HERE.txt` | How to run the sample or use your own CSV |
| `immuknow.cmd` or `immuknow` | Launcher for native ImmuKnow commands |
| `run-sample.cmd`, `run-sample.command` or `run-sample.sh` | Run the selected fictional sample, when `sample.json` is present |
| `runtime/` | Pinned official release archive; the executable is unpacked here on first use |
| `immuknow-revision.txt` | Reviewed native ImmuKnow source revision |
| `templates/` | Selected notice, Settings, supporting files, images and shared components |
| `config/` | Configuration for native runs |
| `input/sample/`, `sample.json` | Selected fictional client and notice, when included |
| `templates/fonts/` | Fonts and licences used by the launchers, when included |

The native archive is fetched only when you request the download. Studio verifies
its pinned size and checksum before packaging it. No further network download
is needed when the launcher first unpacks it. The executable is kept out of
Studio’s editable project and draft storage.

These archives are unsigned, and macOS releases are not notarized. Your
operating system or organization’s application policy may require approval
before running them. The supplied archive must match your chosen platform;
changing its filename does not change its architecture.

## Run the sample

On Windows, open `run-sample.cmd`. On macOS, open `run-sample.command`. On Linux,
run `sh ./run-sample.sh` from the extracted project folder. The launcher keeps the
project’s paths together and uses fonts under `templates/fonts/` when present.
There is no need to add ImmuKnow to PATH or install those fonts globally.

For commands in a terminal, use `./immuknow` on macOS/Linux, or
`.\immuknow.cmd` on Windows. If your ZIP extractor drops executable permissions
on macOS/Linux, use `sh ./immuknow` instead. For example:

```bash
sh ./immuknow project check --sample
sh ./immuknow run --sample
```

`project check --sample` checks configuration and shared components, then
prepares and renders the sample temporarily. `run --sample` retains a run under
`runs/` and prints its report location. The sample keeps the preview client’s
facts: warnings or a failed notice can result when that client does not fit the
selected notice. Review the report and PDFs before drawing conclusions about
production output.

Without `sample.json`, no sample launcher is included. You can still run your
own CSV, or create a sample selection before using `--sample`. Editing source
CSV files does not change Studio’s fixed browser examples.

## Use an existing ImmuKnow installation

Choose **Project files only** if you already have the executable matching
`immuknow-revision.txt`. This ZIP contains the same authored files without the
runtime archive or launchers. Obtain a matching executable from
[ImmuKnow releases](https://github.com/WDGPH/ImmuKnow/releases) or your maintainer.
See ImmuKnow’s [release guide](https://docs.phiz.ca/immuknow/latest/developer_guide/releases/)
for platform requirements and checksums.

Put that executable on PATH, or use its full path in commands. Install the
supplied fonts or set `TYPST_FONT_PATHS` to the project’s `templates/fonts`
directory. From the project directory, run:

```bash
immuknow project sync
immuknow project check --sample
immuknow run --sample
```

`project sync` installs or verifies the complete shared library. The sample
commands require included sample inputs; use `immuknow project check` to check
configuration and shared components alone.

**Authored .typ files only** is a smaller option for copying the active notice,
Settings and referenced `.typ` companions into an existing matching repository.
That repository must supply shared components, fonts, images and other assets.
Downloaded ZIPs cannot be reopened in Studio; compatible browser drafts continue
to reopen automatically.

## Run your own notices

Review configuration, wording, dates, contacts, branding, signatures and QR
destinations before using your own records. Keep your validated cohort and
assignments under `input/`. From the extracted ready-to-run folder on
macOS/Linux:

```bash
# One notice for every client
sh ./immuknow run input/clients.csv --project . \
  --template overdue_diseases.en.typ

# An explicit notice for each client
sh ./immuknow run input/clients.csv --project . \
  --notice-assignments input/assignments.json
```

On Windows, replace `sh ./immuknow` with `.\immuknow.cmd` and enter each command
on one line. For a separate installation, use its `immuknow` executable.
Use the actual filename of your downloaded notice. Each assignment must name a
notice present in `templates/`. Results go to `runs/`; use `--output` to select
another folder.

ImmuKnow’s [CSV guide](https://docs.phiz.ca/immuknow/latest/user_guide/input_schema/)
explains the input fields; its [configuration guide](https://docs.phiz.ca/immuknow/latest/user_guide/configuration/)
covers assignments, duplicate IDs and run settings. Template’s
[customization guide](https://github.com/WDGPH/ImmuKnow-Template/blob/main/README.md)
explains the starter notices and project settings.

## Review the generated notices

Review the terminal summary, printed `records.csv` and `findings.csv` paths,
and actual PDFs before delivery. A Studio preview checks layout with fictional
examples; native runs use your supplied data. ImmuKnow's
[review guide](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/)
explains findings, delivery routes, holds and rebundling. Use the launcher’s `refresh-exports RUN_DIR` command to repair derived CSV exports.
Run files and PDFs contain client information and stay on your workstation under
your organization's handling procedures.

## Update the executable

Keep the runtime matching `immuknow-revision.txt`. For a new ImmuKnow revision,
obtain a reviewed project and runtime together. Keep a copy of your authored
notices, Settings, configuration and assets when moving changes into it.
Do not substitute the latest executable into an older project without checking
its shared-resource compatibility. See
[ImmuKnow versions](architecture.md#immuknow-versions).

## Output filenames

Downloaded projects preserve the filename patterns in `config/parameters.yaml`.
Configure those patterns in the downloaded project; see ImmuKnow's
[filename settings](https://docs.phiz.ca/immuknow/latest/user_guide/configuration/#filename-templates)
for supported fields and naming rules. The run-wide CSVs are separate from
batch PDF filenames.
