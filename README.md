# ImmuKnow Studio

Develop ImmuKnow notice templates quickly in your browser. Edit wording,
settings and branding, and preview the result with fictional example clients.
The source editors support full Typst functionality alongside the Theme controls.

Open **[ImmuKnow Studio](https://immuknow.phiz.ca/)**.
Start with the [user guide](docs/getting-started.md) or read the
[manual overview](docs/index.md). This documentation is being prepared for
**Studio v0.1.0**.

## From template development to production

[ImmuKnow](https://github.com/WDGPH/ImmuKnow) is the core engine. Studio uses its
shared components and data format, with starter projects maintained in
[ImmuKnow Template](https://github.com/WDGPH/ImmuKnow-Template), to make template development faster.
Production notice generation runs with ImmuKnow on your local workstation.

In Studio, open **Project** at the top-right of the webpage and choose
**Download project**. Extract the ZIP, install uv, Git, Typst and the supplied
fonts, then run `uv sync --locked` and `uv run python scripts/check.py --sample`.
You can omit the fonts from the ZIP if the matching fonts are already installed.
The project includes [ImmuKnow-Template](https://github.com/WDGPH/ImmuKnow-Template)'s
Python setup and helper scripts, your authored notice/configuration, and the
selected fictional sample. See [Use projects on your workstation](docs/local-production.md).

## Local browser work

Editing, previews, drafts, imports and downloads run in your local browser.
Studio has no application backend server and does not send project data
anywhere. Editing and previews can continue offline in the open tab after
the resources load; some actions may need a connection. Drafts stay in that
browser; download a ZIP for a portable copy. See [Privacy and offline use](docs/privacy-offline.md).

## Developers and contributors

- [Build and contribute](docs/development.md): setup, local serving and checks.
- [Architecture and compatibility](docs/architecture.md): ownership, Typst
  projects, Core dependency and supported resources.
- [Documentation and releases](docs/documentation.md): strict manual builds,
  the PHIZ documentation hub and v0.1.0 preparation.

Studio pins Core to commit **`3304385`**. The exact revision is
recorded in `uv.lock`. Studio and Core have separate version numbers.
