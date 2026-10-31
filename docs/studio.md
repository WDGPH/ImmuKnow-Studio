# Editing, drafts and downloads

Studio lets you edit a Typst notice and preview it with prepared, fictional
clients. It uses the same facts contract, authored project and native findings
as the Python pipeline. Upstream systems assess immunization status; Studio
does not assess a client or choose their notice.

This is the detailed editor reference. For a first visit, follow
[Get started](getting-started.md). For data handling and disconnected work, see
[Privacy and offline use](privacy-offline.md).

Template and Settings are full Typst source editors. Theme provides convenient
controls for common changes; you can write more detailed layouts and helper
functions directly in the source. Keep project dependencies local and preserve
ImmuKnow's shared components as described in
[Architecture and compatibility](architecture.md#typst-and-project-files).

## Edit and review

Use **Template** for letter wording, **Settings** for page/envelope setup,
dates, QR destinations and display choices, and **Theme** for fonts, colours,
logo, signature and an additional image. Template starters and Theme starters
are in Theme. Selecting a different template opens a confirmation dialog: load
that template from its starting copy, optionally resetting Settings or Settings
and Theme too. Edits to the target template are replaced only after confirmation;
Cancel or Escape keeps the current draft and preview. Other templates’ wording
remains in the browser draft until you explicitly reset it. Shared Settings changes can affect several entry points; check
each notice you intend to use. The question mark opens the guided walkthrough.

Theme controls use the supplied Settings layout and ignore commented examples,
including nested comments. Changes preserve surrounding text and line endings.
For calculated values, repeated definitions or more complex source, use the
Settings editor; controls that cannot safely read a value show **Edit in Settings**
or explain where to edit it. A refused theme change leaves the project unchanged.

The editor keeps native imports such as `#import "settings.typ": *` visible.
Open **Typst Reference** using the book icon in the top header, beside the
walkthrough button, for
examples of letter wording, client information, page layout and ImmuKnow functions.
It is available offline in the open app; the [manual has the same examples](coding-cheatsheet.md).
Type `#` followed by a function name for coding suggestions, or press Ctrl+Space
inside Typst code to open them. Suggestions cover common Typst layout and text
functions, the shared ImmuKnow components, and the supplied Settings helpers.
Inside a supported function call, suggestions include selected named options;
already supplied options are omitted. Accept a suggestion with Enter or Tab.
Hover over a supported function for a short explanation, useful options and an
example. Suggestions stay out of ordinary wording, comments and quoted text.
This is a focused authoring aid: it does not infer your own functions, imported
aliases or all available Typst types and methods. The Typst compiler checks the
complete source when previewing.

## Navigate the editor and preview

Use Ctrl+/ to comment a selection and Ctrl+[ or Ctrl+] to change indentation.
Drag the divider to resize the panes. The preview shows all pages in one scroll;
use its plus/minus controls to zoom. Drag across preview text to select and copy
its displayed wording as plain text. Double-click supported content to open and
highlight its source when the preview is current. Measured client/address blocks
and generated history or overdue text lead to their editable component calls
when there is one unambiguous call. Generated
headings, links and signature text can lead to authored values in Template or
Settings. Other generated text can lead to shared read-only code or have no
source target. Where no source span or component target is available, navigation
requires a unique text match within the selected notice and its companions. Compiler
diagnostics can also link to a source location.

## Review examples and findings

Choose a person from **Example client**, or use the arrows to browse. Every
supplied template offers the same examples. The selected person's name, address
and recorded facts stay the same when you switch notices or languages. Changing
examples preserves your edits and does not open a reset dialog.

The examples include the existing English and French-name clients. They are
fictional records for notice design, not vaccination schedules. Some examples
have incomplete details or do not fit a particular notice. Their warnings remain
available for review; Studio does not rewrite the facts to make a notice fit.

Findings combine source-preparation warnings, compiler diagnostics and placed
Typst checks. Extra diseases covered by a forecasted agent are a warning;
they do not stop the preview. For example, MMR also covers Mumps and Rubella
when only Measles is overdue. Examples contain valid source history. Invalid history rejects a
native input file before rendering, even if a template omits the history table.
Display checks, such as unknown dose validity, follow the components actually placed.

Warnings start collapsed with a count, such as **6 warnings**. Select the count
to read them. Errors stay visible. A different notice or example starts with
warnings collapsed again; ordinary edits keep your choice. Long content stays
visible with a warning where possible. A readable preview with missing checking
evidence retains a finding; it is not treated as checked success.

## Preview updates

During ordinary edits, the last successful preview remains visible while the
refresh icon spins. Temporary errors retain those pages and leave the icon visible.
The icon's tooltip and accessible label describe the preview state. Findings and envelope
measurements describe the displayed pages; new errors describe the current
source. Old diagnostics are removed as soon as you edit, so their locations
cannot underline different source text.

Updates preserve zoom and your page position, including scrolling while a
replacement is being prepared. Removing pages clamps the position to the
remaining document. All replacement pages are prepared before the notice changes.
Scrolling and zooming keep the painted pages available. Extremely large output
may exceed the preview resource limit; Studio reports this and retains the last
usable preview. There is no five-page output limit. Switching examples or languages, importing a project,
confirming a template reset and restarting the compiler clear the previous preview.
During continuous typing, newer successful versions can appear while the refresh
icon continues to spin.

Examples use fixed prepared facts and dates. Editing their source CSV or
configuration in an imported project does not prepare new browser facts. Use
the native pipeline for a different cohort or factual configuration.

## Keep your work

Studio saves the current draft as you edit, including file bytes, uploaded
images, the selected template and example, and the project's starting files.
When you reload or return to Studio, a dialog asks whether to **Continue project**
or **Start fresh**. The copy lives only in this browser on this device; it is not
saved to the cloud. Continue keeps your edits and starting files. Start fresh
removes the browser copy and restores all starter templates, settings and images.
Escape continues the saved project. If the copy cannot be opened, **Keep browser
copy** retains it without replacing it; the starters open with saving blocked
until you clear that copy or import a compatible project.

Saving happens in the background. The browser warns before you leave while
edits are still unsaved. Storage errors appear in Findings; the open project
remains available to download, and another edit retries saving. Download the
project for a portable copy.

Only one tab can edit Studio on a site at a time. A second tab asks you to close
the editing tab and reload. Another device or site address has separate storage.
Current drafts use format 2 in `immuknow-studio-drafts-v2`; older browser storage
is left untouched. Drafts and imported ZIPs check the same supported build requirements.
These cover shared components, fonts, the data format and the compiler build.
Projects can move between application releases when those requirements still
match. The selected file must be an English or French notice under `templates/`.

**Reset template…** always restores the selected template, regardless of the
open editor tab. Its confirmation offers three scopes:

- **Template only** keeps current Settings and Theme, including images.
- **Template + settings** also restores layout, dates, contacts and display
  options, while keeping fonts, colours, organization name, signature, image
  sizes and QR appearance. Uploaded images stay available.
- **Template + settings + theme** restores the complete starting Settings and
  images, and removes images added since the project was opened.

The starting copy comes from the starter or imported project and survives draft
reloads. Shared Settings and images affect other templates that use them.
Complex Settings that cannot safely separate Theme are left unchanged with an
explanation; use a template-only or complete reset instead.

**Clear saved draft** removes the stored draft, including pending edits, while
keeping the open project available to download; later edits save it again.
**Restart compiler** retries the open project after a compiler problem.

Import project accepts the current complete ZIP format. Authored source,
companions and assets keep their bytes; Studio performs no source rewriting or
format migration. An unsupported draft/project format produces an actionable
error. An imported entry without a prepared example can still be exported,
but has no preview.

## Download the project

Open **Project** at the top-right of the webpage.
**Download project** saves the selected notice with current Settings,
Theme, translations, components, images and configuration. It includes only the
selected fictional client’s CSV and assignment file; unrelated starter notices
and example inputs are omitted. Explicitly referenced notices and authored
companion files remain available, preserving project dependencies. Other notices
in the browser draft are not backed up by this download; download each notice
you want to keep.
Authored files keep their bytes and relative paths. Import the ZIP to resume
editing, or run it locally using the included ImmuKnow-Template Python setup,
locked Core dependency and helper scripts. The ZIP includes a README
and sample copies under `input/sample/` when a prepared example is available.
An imported project's existing sample selection and authored files are preserved.
The installed environment, engine wheel and native Typst compiler are not bundled.
If the project changes while the ZIP is being prepared, download it again.
A project with unfinished edits or no prepared example can still be saved.

Downloads include Studio's FreeSans and FreeSerif files and licences by default
for manual installation. Clear **Include fonts for installation** for a smaller
download when the matching fonts are already installed on the workstation.
The production pipeline uses system fonts; downloading the files does not install them.
Studio removes only byte-identical copies of its supplied font files; other
project files remain in the download.
The ZIP's `immuknow-project.json` records format version, selected entry, build identity
and SHA-256 file hashes, which are verified on import. Files are limited to
12 MiB each and 32 MiB in total. Absolute/traversal paths, duplicate paths,
symlinks and corrupt archives are rejected.

## Use the project with the native engine

Production notice generation happens with ImmuKnow core on your local
workstation. Follow [Use projects on your workstation](local-production.md)
for the complete handoff, native command examples, fonts and output review.
Keep the extracted project and its assets together. `uv sync --locked` installs
the pinned engine; install native Typst and the supplied fonts separately.

The footer identifies the Studio commit and latest reachable version tag, plus
the pinned ImmuKnow commit targeted by its supplied resources. A `+` after the
Studio version means the build includes commits after that tag. Hover over a
short hash to see the complete commit, or click it to open that commit on GitHub.
When Core has no recorded source commit,
the footer shows its application version instead.
