# Use projects on your workstation

Studio downloads a runnable project based on
[ImmuKnow-Template](https://github.com/WDGPH/ImmuKnow-Template), with your selected
notice, settings and assets. The included Python setup installs the pinned
ImmuKnow core release locally. You do not need a separate Core or Template checkout.

## Download and extract your project

In Studio, open **Project** at the top-right and choose **Download project**.
Keep **Complete project** for the runnable ZIP described below. Choose
**Authored .typ files only** to copy the active notice, settings and referenced
`.typ` companions into an existing matching repository instead; that smaller ZIP
uses your repository’s existing ImmuKnow components, fonts and assets.
Extract `immuknow-project.zip` into a folder you control.

| Item | Purpose |
| --- | --- |
| `pyproject.toml`, `uv.lock`, `.python-version` | Python setup and the exact Core dependency |
| `scripts/`, `README.md` | Template's run/check helpers and instructions |
| `templates/` | Your selected notice, Settings, supporting files, images and shared components |
| `config/` | Configuration for native ImmuKnow runs |
| `input/sample/`, `sample.json` | Selected fictional sample and its configured paths |
| `examples/` | Original selected fictional input files and their explanation |
| `templates/fonts/` | Fonts and licences for manual installation, when included in the download |
| `template-source.json` | Template repository, source commit and original scaffold file hashes |
| `immuknow-project.json` | Studio import format, selected notice, build identity and current file hashes |

Keep the complete directory structure and relative paths. Leave
`templates/lib/immuknow/` unchanged. The ZIP includes the selected notice and its
dependencies; download other notices separately. When combining projects, review
shared Settings and assets before replacing files.

## Install and check the project

Install [uv](https://docs.astral.sh/uv/), Git, and
[Typst 0.15.1](https://typst.app/docs/changelog/0.15.1/), exactly.
Put `typst` on `PATH` or set `TYPST_BIN`. Core requires Python 3.11 or later;
uv installs the interpreter selected by `.python-version`.
Install the supplied fonts on your workstation for matching typography. If you
cleared **Include fonts for installation** when downloading, use the same fonts
already installed on the workstation or download them from Studio separately.
Extracting them does not install them; native Typst uses system fonts.

Open a terminal in the extracted folder:

```bash
uv sync --locked
uv run python scripts/check.py --sample
uv run python scripts/run.py --sample
```

The first command needs network access to install the locked dependencies,
including Core from reviewed commit `7254f86`. The ZIP includes setup
files, not an installed environment, engine wheel or native Typst compiler.
The check validates configuration, compiler and shared resources, then runs the
sample in a temporary folder. The last command keeps a run and prints its report
location. Warnings can be expected; review them in the report.

Studio supplies copies of the selected fictional inputs in `input/sample/` and
points `sample.json` to them. Original example paths remain intact. An imported
project's existing sample selection and authored sample bytes are preserved,
even when you change the preview client. With no prepared example, a project can
still be downloaded: provide inputs and a `sample.json` selection before running
`--sample`. Changing source CSVs does not change Studio's fixed browser facts.

To use Git, run `git init` before `uv run pre-commit install`. The included ignore
rules and hook keep client inputs and run output out of commits; only the
conventional synthetic sample paths are exempt. Original CSVs under `examples/`
are ignored, while the sample copies can travel with the project.

You can also use the complete `config/` and `templates/` trees with an existing
compatible ImmuKnow installation. See [Core versions](architecture.md#core-versions).

## Run your own notices

Review configuration, wording, dates, contacts, branding, signatures and QR
destinations before using your own records. Replace the fictional input with
your own validated cohort and assignments, kept under `input/`:

```bash
# One notice for every client
uv run python scripts/run.py input/clients.csv \
  --template overdue_diseases_v1.en.typ

# An explicit notice for each client
uv run python scripts/run.py input/clients.csv \
  --notice-assignments input/assignments.json
```

Use the actual filename of your downloaded notice. Each assignment must name a
notice present in `templates/`; the catalog may describe notices not included in
this project. The helpers default to this project's configuration, templates and
`runs/` output folder. Other Core options are passed through unchanged.
See [notice selection and input requirements](https://docs.phiz.ca/immuknow/latest/user_guide/getting_started/#select-notices).

## Review the generated notices

Open the printed `report.html` and inspect the notices and findings. Core retains
source and output evidence in `run.json`. A Studio preview checks layout with
fictional examples; production review uses actual generated notices and findings.

Follow [PDF validation and delivery](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/)
before releasing notices. Run files and PDFs contain client information and stay
on your workstation under your organization's handling procedures.
