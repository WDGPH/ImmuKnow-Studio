# Troubleshooting

## The preview has not caught up with my edits

While a preview is updating, the refresh icon spins. If an edit cannot compile,
Studio keeps the last successful pages and shows the current error. Check the
findings below the editor, correct the source and wait for a successful preview.
The visible pages may still contain earlier wording until then.

Refresh the webpage if the compiler has stopped responding. Refreshing starts a
new compiler and restores your saved browser project automatically. It may need
access to the application files again if you are offline.

## A Theme control says “Edit in Settings”

The Theme controls understand the supplied Settings layout. A calculated value,
repeated definition or more complex Typst source may need a direct edit in
**Settings**. Your source stays available; the control does not overwrite a
value it cannot safely change.

## A saved custom notice has no example preview

Studio can preview only the prepared examples available for a supported entry
point. A custom entry without a prepared example can still be downloaded. Use
the native ImmuKnow engine to prepare your own input and render the notice.
Editing a CSV inside a project does not create new browser examples.

## A download or Theme starter fails while offline

These actions may need bundled application files that are not yet available in
your browser cache. Keep the tab open and restore the connection, then try
again. The project is processed locally; these requests retrieve application
resources, not upload your work. For fully disconnected use, serve a complete
static build locally. See [Privacy and offline use](privacy-offline.md).

## My saved draft is incompatible

Read the error before resetting anything. Studio checks project format, shared
components, fonts, data format and compiler requirements. Rewriting the project
manifest or replacing a shared component does not make an incompatible project
supported.

Keep the browser copy and any downloaded files. Review downloaded authored
files with their compatible native engine. Project ZIP upload is unavailable. See
[Architecture and compatibility](architecture.md).

## My draft did not appear on another computer

Drafts belong to a browser profile and site address. They do not synchronize.
A downloaded project can be used with the native engine on another computer,
but cannot be reopened in Studio. If saving fails, download your open work
before closing the tab.

## The native PDF looks different

Check the selected template, input facts, dates, configuration, installed fonts
and ImmuKnow/Typst versions. Studio's examples have fixed facts and dates. Native
ImmuKnow prepares facts from your actual input. Ready-to-run launchers use
included project fonts; a separately installed executable needs the same fonts. Review
the native report as well as the page appearance. See
[Use projects on your workstation](local-production.md).

## Report a problem

Use the [Studio issue tracker](https://github.com/WDGPH/ImmuKnow-Studio/issues)
for editor, preview, draft or download problems. Use
[ImmuKnow-Template's issue tracker](https://github.com/WDGPH/ImmuKnow-Template/issues)
for starter notices, project configuration, packaging or project tests. Use
[ImmuKnow's issue tracker](https://github.com/WDGPH/ImmuKnow/issues) for native
input preparation, generation or delivery problems.

Include the steps to reproduce, browser, operating system, error wording and
Studio version from the footer (hover for the full commit). Reproduce with fictional data and public
assets before sharing a template, ZIP, screenshot, log or report.
