# ImmuKnow Studio

Develop ImmuKnow notice templates quickly in your browser. Edit wording,
settings and branding, and preview the result with fictional example clients.
The source editors support full Typst functionality alongside the Theme controls.

Open **[ImmuKnow Studio](https://immuknow.phiz.ca/)**.
Start with the [user guide](docs/getting-started.md) or read the
[manual overview](docs/index.md).

## From template development to production

[ImmuKnow](https://docs.phiz.ca/immuknow/latest/) is the native engine. Studio uses its
shared components and data format, with packaged starter projects maintained in
[ImmuKnow Template](https://github.com/WDGPH/ImmuKnow-Template/blob/main/README.md), to make template development faster.
Production notice generation runs with ImmuKnow on your local workstation.

In Studio, open **Project** at the top-right of the webpage and choose
**Download project**. Keep **Ready-to-run project**, select the operating system
and processor of the workstation that will run ImmuKnow, and download the ZIP.
Extract it once and open `START-HERE.txt`. The matching ImmuKnow executable
is in the project folder. The included launchers use the bundled fonts locally.

Setup, checks and production runs require no Python, uv or separate Typst
installation. Under **Fictional client data**, choose the selected client, all
fictional clients or no fictional clients. **Project files only** is available
when you already have the matching executable.
See [Use projects on your workstation](docs/local-production.md).

## Local browser work

Editing, previews, drafts and downloads run in your local browser.
Studio has no application backend server and does not send project data
anywhere. Editing and previews can continue offline in the open tab after
the resources load; some actions may need a connection. Drafts stay in that
browser; download a ZIP for local native use. Downloaded projects cannot be
reopened in Studio. See [Privacy and offline use](docs/privacy-offline.md).

## Developers and contributors

- [Build and contribute](docs/development.md): setup, local serving and checks.
- [Architecture and compatibility](docs/architecture.md): ownership, Typst
  projects, ImmuKnow dependency and supported resources.
- [Documentation and releases](docs/documentation.md): strict manual builds,
  the PHIZ documentation hub and release checks.

Studio pins native ImmuKnow to the exact reviewed commit recorded in
`immuknow-revision.txt`. Studio and ImmuKnow have separate version numbers.
