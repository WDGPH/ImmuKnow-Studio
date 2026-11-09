# Use projects on your workstation

Studio downloads a runnable project based on
[ImmuKnow-Template](https://github.com/WDGPH/ImmuKnow-Template), with your selected
notice, settings and assets. Use a standalone ImmuKnow executable matching
`core-revision.txt`. Setup, checks and runs use the executable directly; no
Python, uv or Template checkout is needed.

## Download and extract your project

In Studio, open **Project** at the top-right and choose **Download project**.
Keep **Complete project** for the runnable ZIP described below. Choose
**Authored .typ files only** to copy the active notice, settings and referenced
`.typ` companions into an existing matching repository instead; that smaller ZIP
uses your repository’s existing ImmuKnow components, fonts and assets.
**Include fictional client data** is selected by default for a local test run.
Clear it to omit Studio’s fictional inputs and sample setup. Custom imported
sample data is preserved. Without a sample, use your own CSV and assignments
as described under [Run your own notices](#run-your-own-notices).
Extract `immuknow-project.zip` into a folder you control.

| Item | Purpose |
| --- | --- |
| `core-revision.txt` | Reviewed standalone Core source revision |
| `README.md` | Native setup, sample checks and notice instructions |
| `templates/` | Your selected notice, Settings, supporting files, images and shared components |
| `config/` | Configuration for native ImmuKnow runs |
| `input/sample/`, `sample.json` | Selected fictional client and notice assignment, when included |
| `examples/` | Explanation of the fictional examples |
| `templates/fonts/` | Fonts and licences for manual installation, when included in the download |
| `template-source.json` | Template package source commit and original scaffold file hashes |
| `immuknow-project.json` | Studio import format, selected notice, build identity and current file hashes |

Keep the complete directory structure and relative paths. Leave
`templates/lib/immuknow/` unchanged. The ZIP includes the selected notice and its dependencies. When combining projects, review
shared Settings and assets before replacing files.

## Install and check the project

Obtain the standalone `immuknow` executable matching `core-revision.txt` from
your project maintainer. Developers can follow Template's
[build instructions](https://github.com/WDGPH/ImmuKnow-Template/blob/feat/rust-core-project/CONTRIBUTING.md#build-the-reviewed-core). Put it on PATH, or use its full path in place of `immuknow` in commands.
There is no separate Typst or Python installation.
Install the supplied fonts on your workstation for matching typography. If you
cleared **Include fonts for installation** when downloading, use the same fonts
already installed on the workstation or download them from Studio separately.
Extracting them does not install them; Core uses system fonts.

Open a terminal in the extracted folder:

```bash
immuknow project sync
immuknow project check --sample
immuknow run --sample
```

The first command installs or verifies the complete shared library. The ZIP
includes no executable or Python environment. The check verifies source
preparation and shared resources, then runs the sample in a temporary folder.
The last command keeps a run and prints its report location. Warnings can be
expected; review them in the report. You can also run the executable directly:

```bash
immuknow run input/sample/sample_students.csv --project . \
  --notice-assignments input/sample/sample_assignments.json
```

When **Include fictional client data** is selected, Studio supplies copies of
the selected preview client's data and its active notice assignment in `input/sample/`
and points `sample.json` to them. The sample retains the client's facts, so an
incompatible notice can produce findings or a failed notice. An imported
project's existing sample selection and authored sample bytes are preserved,
even when you change the preview client. Without fictional data or a prepared example, a project can
still be downloaded: provide inputs and a `sample.json` selection before running
`--sample`. Changing source CSVs does not change Studio's fixed browser facts.

Fresh downloads omit Python scripts, environment files and maintainer tools.
Imported projects keep their existing authored files, including legacy helpers.
The supplied ignore rules keep conventional client inputs and run outputs out
of Git. Maintainers can install additional commit checks from Template's source
repository; those checks are separate from project setup and production runs.

You can also use the complete `config/` and `templates/` trees with an existing
compatible ImmuKnow installation. See [Core versions](architecture.md#core-versions).

## Run your own notices

Review configuration, wording, dates, contacts, branding, signatures and QR
destinations before using your own records. Replace the fictional input with
your own validated cohort and assignments, kept under `input/`:

```bash
# One notice for every client
immuknow run input/clients.csv --project . \
  --template overdue_diseases.en.typ

# An explicit notice for each client
immuknow run input/clients.csv --project . \
  --notice-assignments input/assignments.json
```

Use the actual filename of your downloaded notice. Each assignment must name a
notice present in `templates/`; the catalog may describe notices not included in
this project. `--project .` selects this project's configuration and templates. Results go
to `runs/`; use `--output` to choose another output folder.
See [notice selection and input requirements](https://docs.phiz.ca/immuknow/latest/user_guide/getting_started/#select-notices).

Duplicate nonblank client IDs normally reject the input. To accept specified
clients, set `allowed_duplicate_client_ids: ["0123456789"]` in
`config/parameters.yaml`, with quoted IDs. Every repeated source row is rendered
separately and receives a warning; all rows for an ID share its notice assignment.
Unlisted duplicates still reject the input. Use each report row's key to hold or
release one notice independently.

## Review the generated notices

Open the printed `report.html` and inspect the notices and findings. Core retains
source and output evidence in `run.json`. A Studio preview checks layout with
fictional examples; production review uses actual generated notices and findings.

Follow [PDF validation and delivery](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/)
before releasing notices. Run files and PDFs contain client information and stay
on your workstation under your organization's handling procedures.

## Update the executable

Obtain the reviewed executable recorded in `core-revision.txt`. Refresh the
complete shared library with `immuknow project sync --replace`, then run
`immuknow project check --sample` and inspect a retained sample run. Sync changes
only `templates/lib/immuknow/`; keep your authored notices and configuration.
