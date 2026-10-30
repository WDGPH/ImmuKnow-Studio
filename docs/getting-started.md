# Get started

You can use [ImmuKnow Studio](https://immuknow.phiz.ca/) without installing
Python, Typst or a development environment. A computer with a current browser
and enough screen space for an editor and preview is a useful starting point.

## Open a starting template

Wait for the first example notice to appear. The question mark at the top-right
opens a guided walkthrough.

Choose **Theme** to find **Template starters** and **Theme starters**. Select the
notice you want to work on, then choose a theme if useful. The supplied wording,
logos, names, dates and contact details are examples; replace them with your
organization's reviewed content.

When you change templates, Studio asks which parts to restore from the starting
copy. Read the choices before confirming: restoring a template replaces edits
to that template. Cancel keeps your current work.

## Edit wording, settings and appearance

| Tab | What to use it for |
| --- | --- |
| **Template** | Letter wording, headings, privacy text and the content placed on each page |
| **Settings** | Page and envelope layout, dates, contacts, QR destinations and display choices |
| **Theme** | Fonts, colours, logo, signature and an additional image |

The preview updates as you edit. Try a small wording change first. If an edit
contains an error, Studio keeps the last successful preview and shows a finding;
those pages may show an earlier version of your work.

Template and Settings contain Typst source, the text and instructions that
describe the notice. You can use full Typst functionality, including your own
layout and helper functions, rather than being limited to the Theme controls.
For an introduction to the supplied components, see
[ImmuKnow's template authoring guide](https://docs.phiz.ca/immuknow/latest/user_guide/phu_templates/).
For project boundaries and local dependencies, see
[Architecture and compatibility](architecture.md#typst-and-project-files).

## Review the examples

Use the **Example client** arrows above the preview. They change the fictional
client without discarding your edits. The available examples depend on the
selected template and language; they include short and long histories and
different kinds of notice.

Review every page. Use the zoom buttons and drag the divider between the editor
and preview to make the text easier to read. Check names and addresses, long
content, page breaks, dates, QR destinations and any reported findings. Settings
and images can be shared between templates, so check each notice you plan to use.

## Save a portable copy

Studio saves a draft in this browser as you edit. Wait for **Saved** before
closing the tab. To make a copy you can keep or move to another computer:

1. Open **Project** at the top-right of the webpage.
2. Choose **Download project** to save `immuknow-project.zip`.
3. Keep the ZIP somewhere you control. It contains the selected template,
   supporting files, assets, Python setup, helper scripts and selected fictional example inputs.

Download each template you want to keep: this action does not back up every
other notice in the browser draft. To return to a downloaded project, open
**Project → Import project** and select its ZIP.

When your template is ready, follow
[Use projects on your workstation](local-production.md). Production notice
generation runs locally with ImmuKnow and your own client records.
