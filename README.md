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
templates, shared components and data format to make template development faster.
Production notice generation runs with ImmuKnow on your local workstation.

In Studio, open **Project** at the top-right of the webpage and choose
**Download current template**. Extract the project and use its complete
`templates/` and `config/` directories with your separately installed ImmuKnow
engine. Your custom template, settings, images and supporting assets travel
together. See [Use templates on your workstation](docs/local-production.md).

## Local browser work

Editing, previews, drafts, imports and downloads run in your local browser.
Studio has no application backend server and does not send project data
anywhere. After the application resources have loaded, you can keep working
offline in the open tab. Drafts stay in that browser; download a ZIP for a
portable copy. See [Privacy and offline use](docs/privacy-offline.md).

## Developers and contributors

- [Build and contribute](docs/development.md): setup, local serving and checks.
- [Architecture and compatibility](docs/architecture.md): ownership, Typst
  projects, Core dependency and supported resources.
- [Documentation and releases](docs/documentation.md): strict manual builds,
  the PHIZ documentation hub and v0.1.0 preparation.

Studio currently locks an exact Core commit as a short-term arrangement. It is
intended to target a published **ImmuKnow v2 or later tag** once available and
validated. Studio and Core have separate version numbers.
