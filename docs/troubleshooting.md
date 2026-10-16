# Troubleshooting

## The preview has not caught up with my edits

While a preview is updating, the refresh icon spins. If an edit cannot compile,
Studio keeps the last successful pages and shows the current error. Check the
findings below the editor, correct the source and wait for a successful preview.
The visible pages may still contain earlier wording until then.

Use **Project → Restart compiler** if the compiler has stopped responding.
Restarting may need access to the application files again if you are offline.

## A Theme control says “Edit in Settings”

The Theme controls understand the supplied Settings layout. A calculated value,
repeated definition or more complex Typst source may need a direct edit in
**Settings**. Your source stays available; the control does not overwrite a
value it cannot safely change.

## My imported project has no example preview

Studio can preview only the prepared examples available for a supported entry
point. A custom entry without a prepared example can still be downloaded. Use
the native ImmuKnow engine to prepare your own input and render the notice.
Editing a CSV inside a project does not create new browser examples.

## My draft or ZIP is incompatible

Read the error before resetting anything. Studio checks project format, shared
components, fonts, data format and compiler requirements. Rewriting the project
manifest or replacing a shared component does not make an incompatible project
supported.

Keep the original ZIP. Reopen it in a compatible Studio build, or review its
authored files with a compatible native engine. See
[Architecture and compatibility](architecture.md).

## My draft did not appear on another computer

Drafts belong to a browser profile and site address. They do not synchronize.
Download the current template on the first computer, then import its ZIP on the
other one. If saving fails, download your open work before closing the tab.

## The native PDF looks different

Check the selected template, input facts, dates, configuration, installed fonts
and Core/Typst versions. Studio's examples have fixed facts and dates. Native
ImmuKnow uses system fonts and prepares facts from your actual input. Review
the native report as well as the page appearance. See
[Use templates on your workstation](local-production.md).

## Report a problem

Use the [Studio issue tracker](https://github.com/WDGPH/ImmuKnow-Studio/issues)
for editor, preview, draft or download problems. Use
[ImmuKnow's issue tracker](https://github.com/WDGPH/ImmuKnow/issues) for native
input preparation, generation or delivery problems.

Include the steps to reproduce, browser, operating system, error wording and
Studio/Core identities from the footer. Reproduce with fictional data and public
assets before sharing a template, ZIP, screenshot, log or report.
