# Editing, drafts and downloads

Studio lets you edit a Typst notice and preview it with prepared, fictional
clients. It uses the same facts contract, authored project and native findings
as standalone ImmuKnow. Upstream systems assess immunization status; Studio
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

Use **Template** for letter wording, contacts and suspension dates,
**Settings** for shared page/envelope setup, QR destinations and display choices,
and **Theme** for fonts, colours, logo, signature and an additional image. Template starters and Theme starters
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
or explain where to edit it. Signature image paths, widths and printed names are
written directly in the Template. For example:

```typst
#immuknow.signature-block(
  signature: image("assets/signature.png", width: 4.5cm),
  name: "Dr. Annie Body, MD",
  title: "Medical Officer of Health",
)
```

Change the width to `3cm` for a smaller signature. Leaving height unspecified
preserves the image's aspect ratio. Theme uploads change the image path and keep
that width; the printed-name control edits the Template value. Older projects
that define these values in Settings remain supported. In suspension orders,
`order-signatory-name` is a separate Template value for the legal wording.
Changing printed credentials leaves that name unchanged. Theme starters fill both
names initially. Template-only and Settings-only resets preserve Theme images
and names; a reset that includes Theme restores their starting values.

Settings supplies shared defaults for notice components. You can override an
option for one table or page directly in Template. Keep the opening Settings
marker, import and `#show: immuknow.letter` line in place. See the
[Template customization guide](https://github.com/WDGPH/ImmuKnow-Template/blob/main/README.md)
for starter settings and the [Typst Reference](coding-cheatsheet.md) for
examples. ImmuKnow's [authoring guide](https://docs.phiz.ca/immuknow/latest/developer_guide/templates/)
describes its components and checks. Review printed QR codes after changing
their appearance.

A refused theme change leaves the project unchanged.

The editor keeps native imports such as `#import "settings.typ" as immuknow` visible.
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
its displayed wording as plain text. Click a QR code or text link to open its
destination in a new tab. Email and telephone links use your browser’s configured
apps; links within the notice scroll to their destination. Links can also be
focused with Tab and opened with Enter. Double-click supported content to open and
highlight its source when the preview is current. Measured client/address blocks
and generated history or overdue text lead to their editable component calls
when there is one unambiguous call. Generated
headings, links and signature text can lead to authored values in Template or
Settings. Other generated text can lead to shared read-only code or have no
source target. Where no source span or component target is available, navigation
requires a unique text match within the selected notice and its companions. Compiler
diagnostics can also link to a source location.

## Review examples and findings

Use the **Example client** arrows to browse fictional clients. Every
supplied template offers the same examples. The selected person's name, address
and recorded facts stay the same when you switch notices or languages. Changing
examples preserves your edits and does not open a reset dialog.

The examples include clients with English and French names. They are
fictional records for notice design, not vaccination schedules. Each has complete contact details and consistent history dates. A client may
not fit a particular notice; the resulting warnings remain
available for review; Studio does not rewrite the facts to make a notice fit.

Findings combine source-preparation warnings, compiler diagnostics and placed
Typst checks. Notice requirements and display checks are marked **Checked when
the notice compiles** until a current preview supplies validated evidence.
If the evidence is invalid, the readable preview remains visible with an error.
Review the findings for the selected notice and example. ImmuKnow's
[findings guide](https://docs.phiz.ca/immuknow/latest/user_guide/findings/)
explains native checks and their meanings.

Warnings start collapsed with a count, such as **6 warnings**. Select the count
to read them. Errors stay visible. A different notice or example starts with
warnings collapsed again; ordinary edits keep your choice. Long content stays
visible with a warning where possible. A readable preview with missing checking
evidence retains a finding; it is not treated as checked success.

## Preview updates

During ordinary edits, the last successful preview remains visible while the
refresh icon spins. Temporary errors retain those pages and leave the icon visible.
The icon's tooltip and accessible label describe the preview state. It also stays
visible when the current preview has failed notice checks or its checking evidence
could not be verified. Findings and envelope
measurements describe the displayed pages; new errors describe the current
source. Old diagnostics are removed as soon as you edit, so their locations
cannot underline different source text.

Updates preserve zoom and your page position, including scrolling while a
replacement is being prepared. Removing pages clamps the position to the
remaining document. All replacement pages are prepared before the notice changes.
Scrolling and zooming keep the painted pages available. Extremely large output
may exceed the preview resource limit; Studio reports this and retains the last
usable preview. There is no five-page output limit. Switching examples or
languages, confirming a template reset and refreshing the page clear the
previous preview.
During continuous typing, newer successful versions can appear while the refresh
icon continues to spin.

Examples use fixed prepared facts and dates. Editing a downloaded project’s
source CSV or configuration does not prepare new browser facts. Use the native
pipeline for a different cohort or factual configuration.

## Keep your work

Studio saves the current draft as you edit, including file bytes, uploaded
images, the selected template and example, and the project's starting files.
When you reload or return to Studio, compatible projects reopen automatically,
including your edits, starting files and selected example. Browsing examples or
installing a UI-only update does not open a project dialog. The copy lives only
in this browser on this device; it is not saved to the cloud.

Choose **Project → Reset workspace…** to choose how much to restore. Nothing
changes until you confirm **Reset workspace**; Cancel or Escape keeps your work.

If the copy cannot be opened, **Keep browser copy** retains it without replacing
it; the starters open with saving blocked until you reset the entire workspace
or clear the saved copy.

Saving happens in the background. The browser warns before you leave while
edits are still unsaved. Storage errors appear in Findings; the open project
remains available to download, and another edit retries saving. Download the
project for a portable copy.

Only one tab can edit Studio on a site at a time. A second tab asks you to close
the editing tab and reload. Another device or site address has separate storage.
Drafts use format 2 in `immuknow-studio-drafts-v2` and check the supported build
requirements.
These cover shared components, fonts, the data format and the compiler build.
Projects can move between application releases when those requirements still
match. The selected file must be an English or French notice under `templates/`.

An update to shared components, including the bundled QR encoder, requires a
matching project. Studio does not replace an older project's shared files or
migrate its authored files automatically. Download your work before adopting
such an update; keep the existing project for its pinned native engine, or move
your authored changes into a current starter project.

**Reset workspace…** offers these scopes, regardless of the open editor tab:

- **Saved draft only** removes the browser copy, including pending saves, while
  keeping the open workspace. Later edits save it again.
- **Template only** restores the selected template and keeps current Settings and Theme, including images.
- **Template + settings** also restores layout and display
  options, while keeping fonts, colours, signature, image
  sizes and QR appearance. Uploaded images stay available.
- **Template + settings + theme** restores the complete starting Settings and
  images, and removes images added since the project was opened.
- **Entire workspace** restores all of Studio’s current starter templates,
  settings and images, removes custom files and clears the saved browser draft.

For the template scopes, the starting copy is stored with the draft and survives
reloads. Existing compatible drafts keep their original starting files. Shared
Settings and images affect other templates that use them.
Complex Settings that cannot safely separate Theme are left unchanged with an
explanation; use a template-only or complete reset instead.

Refresh the webpage to retry after a compiler problem. Your compatible saved
browser project reopens automatically.

Project ZIP upload is unavailable. Downloaded projects cannot be reopened in
Studio. Keep the compatible browser draft to continue editing here; downloaded
files remain usable with the matching native ImmuKnow engine.

## Download the project

Open **Project → Download project** and choose the package you need:

- **Ready-to-run project** includes your selected notice and its project files,
  the matching native ImmuKnow executable and launchers. Studio fills in
  the operating system and processor when your browser provides them. Check
  the selection against the workstation that will run ImmuKnow. Studio fetches
  the selected runtime when you request the download.
- **Project files only** includes the same authored project without a runtime or
  launchers. Use it with your existing matching ImmuKnow installation.
- **Authored .typ files only** includes the active template, Settings and
  referenced authored `.typ` companions for an existing matching repository.

The first two options include current Settings, Theme, translations, shared
components, images and configuration. Authored files retain their bytes and
relative paths. Unrelated unchanged starter notices, unused starter assets and
example inputs are normally omitted. Explicitly referenced notices, authored
companions and modified or custom notices stay available. Calculated paths
retain possible dependencies conservatively. Download another notice when you
need its unchanged starter in the project.

**Fictional client data** defaults to **Selected client**. Choose **All fictional
clients** to download the full example CSV, or **No fictional clients** to omit
Studio’s sample data. Studio puts the chosen CSV under `input/sample/` and
points `sample.json` to it and the active notice. Custom sample data and
selections already present in a compatible saved draft are preserved.

Fonts and their licences are included by default. Ready-to-run launchers load
these fonts from the extracted project, so global font installation is not
needed. Clear **Include fonts** for a smaller download when the matching fonts
are already available on the workstation. Studio removes only byte-identical
copies of its supplied font files; custom font files remain in the download.

Extract the complete ready-to-run ZIP once and open `START-HERE.txt`. The
native executable is ready in the project folder and matches the project’s
reviewed ImmuKnow revision. See [Use projects on your workstation](local-production.md)
for sample and production runs.

A runtime download needs access to the static application files. If it fails,
retry after restoring the connection or select **Project files only**. The open
project and browser draft remain available. If the project changes while a ZIP
is being prepared, download it again. Unfinished edits or a notice without a
prepared example can still be saved.

Downloads omit unchanged starter instructions and browser build records.
The authored project retains its 12 MiB per-file and 32 MiB total limits.
Executables stay out of editable files, saved drafts and the browser compiler.

**Authored .typ files only** creates `immuknow-typst.zip`. Shared ImmuKnow
components, fonts, images, CSV/JSON data and native setup instructions are
omitted. Extract the source into the matching paths in your existing repository,
which supplies those dependencies. Studio follows literal local paths and
retains authored `.typ` files conservatively when it detects calculated paths;
review dependencies the scan cannot resolve. This ZIP is not a complete project.

## Use the project with the native engine

Production notice generation happens with ImmuKnow on your local
workstation. Follow [Use projects on your workstation](local-production.md)
for the complete handoff, native command examples, fonts and output review.
Keep the extracted project and its assets together. `immuknow project sync`
installs or verifies the shared library from the matching executable.
Ready-to-run launchers use the included fonts; a separately installed engine
needs access to the same fonts. No separate Typst installation is needed.
For native delivery grouping and optional PDF encryption, edit the project
configuration on your workstation and follow the [ImmuKnow configuration guide](https://docs.phiz.ca/immuknow/latest/user_guide/configuration/).
That guide also explains optional password placeholders, including initials.

The footer shows **ImmuKnow Studio** followed by the exact release tag (such as
`v0.1.0`), that tag with `+` for later commits, or the short Studio commit before
the first version tag. Hover over the label for the complete commit, or click it
to open the commit on GitHub. The Studio build also identifies its pinned
ImmuKnow resources.
