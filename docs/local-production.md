# Use templates on your workstation

Use Studio to develop a template, then use ImmuKnow core on your local
workstation to generate production notices. You can drop the downloaded
template tree, including your images and other assets, directly into your local
ImmuKnow workflow. You do not need to recreate your changes in another editor.

## Download and extract your project

In Studio, open **Project** at the top-right of the webpage and choose
**Download current template**. Extract `immuknow-project.zip` into a folder you
control. The important parts are:

| Item | Purpose |
| --- | --- |
| `templates/` | Your selected notice, Settings, supporting Typst files, translations, images and shared components |
| `config/` | Configuration supplied with the project for use by ImmuKnow |
| `immuknow-project.json` | The project's format, selected template, build identity and file checksums for Studio import |
| Font files and licences | The fonts used by Studio, supplied for manual installation on your workstation |
| Example CSV and assignment file | Fictional inputs for the selected example, useful for a trial run |

Keep the extracted directory structure and relative paths intact. Copy or point
ImmuKnow at the complete `templates/` directory, including its assets and
`lib/immuknow/`. Copying only the visible `.typ` notice can leave it without its
settings, images or shared components. Keep `lib/immuknow/` unchanged.

The download contains the selected notice and its dependencies. It omits
unrelated starter notices and example inputs. Download other notices separately
if you need them. When combining exports into one local template tree, review
shared Settings, translations and assets so that one export does not overwrite
changes needed by another notice.

## Install the engine separately

The ZIP contains authored project files, not ImmuKnow itself, a Python
environment or the native Typst compiler. Follow
[ImmuKnow's getting-started guide](https://docs.phiz.ca/immuknow/latest/user_guide/getting_started/)
to install the engine and supported Typst version. Studio's footer identifies
the ImmuKnow revision used by that build. Use compatible Core resources; an
older tagged Core release may not support the project supplied by Studio.
See [Core versions](architecture.md#core-versions).

Install the supplied fonts on the workstation if you want matching typography.
Native ImmuKnow uses system fonts; extracting the font files does not install
them. A missing or substituted font can change line breaks and page layout.

## Run a selected template

The following examples assume you have installed the `immuknow` command and
opened a terminal in the extracted project folder. Replace `clients.csv` with
the path to your own validated input, and use the actual filename of your
downloaded notice:

```bash
immuknow /path/to/clients.csv \
  --template ./templates/overdue_diseases_v1.en.typ \
  --config ./config \
  --output ./runs
```

This selects one template for the whole input file. If you manage ImmuKnow
through a uv checkout, use `uv run immuknow` in that environment with paths to
the extracted project.

For a cohort that uses different notices, prepare an assignment file for your
real clients and select the complete template directory instead:

```bash
immuknow /path/to/clients.csv \
  --notice-assignments /path/to/assignments.json \
  --templates ./templates \
  --config ./config \
  --output ./runs
```

Each assignment must name a template that exists in that directory. Use one
selection method per run. The downloaded assignment file belongs to the
fictional example; replace it for your own cohort. See
[notice selection and input requirements](https://docs.phiz.ca/immuknow/latest/user_guide/getting_started/#select-notices).

Review configuration, wording, dates, contacts, branding, signatures and QR
destinations before using your own records. Studio's prepared examples do not
change when you edit a source CSV or factual configuration. Native ImmuKnow
prepares fresh facts for each production run.

## Review the generated notices

Open the run's `report.html` and inspect the notices and findings. ImmuKnow
retains source and output evidence in `run.json`. A good-looking Studio preview
is a layout check with fictional examples; production review uses the actual
generated notices and Core's findings.

Follow [PDF validation and delivery](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/)
before releasing notices. Run files and PDFs contain your clients' information
and remain on your workstation under your organization's handling procedures.
