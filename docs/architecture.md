# Architecture and compatibility

## What each project owns

| Project | Responsibility |
| --- | --- |
| ImmuKnow | Standalone Rust pipeline, input validation, prepared notice facts, schemas, shared Typst components and native generation/review results |
| ImmuKnow Studio | Browser editor, Theme controls, draft storage, project downloads, browser compiler and renderer, fonts, example previews and Studio tests |
| ImmuKnow Template | Starter letters, Settings, translations, example branding, project configuration, native setup instructions, fictional samples and starter tests |
| PHIZ documentation hub | Shared manual presentation, version selection, search and documentation publication |

ImmuKnow contains no starter project. Studio obtains authored starters from the
pinned Template resource package and the shared library from installed ImmuKnow. Template owns the fictional client records; Studio owns their descriptions and preview selections.

Studio builds the exact clean ImmuKnow source recorded in `immuknow-revision.txt` and
verifies its executable fingerprint before use. Public `resources` exports
supply the shared library, schemas and resource hashes; `prepare` supplies a
versioned JSON envelope with row identities, notice facts and checks. Studio
copies exports into disposable `generated/immuknow/` and generates browser validators.
There are no Python ImmuKnow imports. The deployed application remains static and
runs no native executable or Python service in the browser.

The browser consumes ImmuKnow's render report, including component geometry used
for guides and source navigation. ImmuKnow owns the separate
[native saved-report contract](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/).

The browser compiles Typst and renders previews locally using prepared facts.
Ready-to-run downloads include the matching executable and its license at the
project root and use the same shared resources. Project-only downloads can use an existing installation.
Any ImmuKnow upgrade requires preparation, browser and native downloaded-project
checks.

## Typst and project files

Studio supports full Typst functionality through its Template and Settings
source editors. Theme controls are conveniences for common changes. They do
not define the limits of what you can author in the Typst source.

The project follows ImmuKnow's notice contract and local file boundaries:

- Keep helper files, translations, images and other dependencies inside the
  project's template tree and use relative paths.
- Keep supplied `lib/immuknow/` files complete and unchanged. Put your own helpers
  outside that directory. Studio opens shared components for reading only.
- Vendor dependencies into the project. Runtime `@preview` and `@local` package
  imports and package downloads are disabled in Studio and native ImmuKnow.
- Keep notice entry filenames in `<version>.<language>.typ` form, with supported
  `en` or `fr` language codes.

See [ImmuKnow's native template contract](https://docs.phiz.ca/immuknow/latest/developer_guide/templates/)
for supplied components and facts. Browser previews use fixed prepared examples;
new source records or factual configuration require native preparation. A custom
entry point without a prepared example remains exportable.

Studio preserves authored file bytes and relative paths through drafts and
downloads. Studio verifies shared component bytes before exporting a project.
Draft recovery checks format,
compiler and shared-resource compatibility. Authored files are limited to
12 MiB each and 32 MiB in total; unsafe or duplicate paths are rejected.
Project ZIP upload is unavailable.

Runtime distribution is separate from editable project files. The build stages
four official release archives from `native-runtimes.json`, checking their
size, SHA-256 digest and compatibility with `immuknow-revision.txt`. The browser
requests only the selected archive from the same origin when a ready-to-run
download is confirmed. The archive worker verifies the release and adds its executable
and license to the project ZIP. Runtime bytes never enter the draft or browser compiler.
See [Editing, drafts and downloads](studio.md) for package choices and reset details.

Preview source spans distinguish repeated wording and preserve accented-character
and Windows line-ending offsets.

## Shared example clients

Every supplied notice uses the same collection of fictional clients. Each client
has one source record and a stable example ID. Names, addresses, history and
overdue facts stay the same when switching templates or languages. Clients with
English and French names are available in either language.

Template owns the fictional client CSV. `examples/previews.json` identifies the
clients, maintained notice filenames used by Studio. Asset
preparation reads the pinned Template CSV, writes one CSV per client and prepares a
view and assignment for each notice. Dev startup and production builds generate these assets; the
prepared payloads are not committed. The browser reads these prepared facts; it
does not assess clients or change their records to fit a notice.

All examples are available, including combinations that produce warnings.
ImmuKnow's source and applicability findings stay attached to the selected view.
A custom entry point without prepared facts remains exportable.

The selected example ID survives template changes and draft reloads. The
**Fictional client data** download setting offers the selected client's CSV,
Template's complete fictional client CSV or no fictional data. Studio updates
unchanged generated sample selections to match that setting and preserves custom
samples. Native preparation checks confirm that the exported inputs reproduce
each preview. Browser checks cover selection, edits, reloads and downloads.

## Starter project resources

Studio installs `immuknow-template-resources` from an exact Git revision of
ImmuKnow-Template, alongside its separately pinned ImmuKnow dependency. Asset
preparation reads the installed resource API and checks that the included
project immuknow-revision.txt selects the same ImmuKnow commit as Studio. Installed files are
read-only. No scaffold copies are committed in Studio; copies are created only for build output and downloaded projects.
The default theme logo and signature are generated from those same installed
Template assets, rather than separate committed image copies.

ImmuKnow and Template are public, so installation needs no GitHub credentials.
After installation, asset preparation does not fetch Template files. Browser
previews and downloads continue to use the built local resources. See
[Build and contribute](development.md#update-the-project-template).

Studio maps ImmuKnow’s exported library paths to authored project paths when
recording compatibility. Relocating installed files alone does not invalidate
projects whose shared bytes and formats still match.

Build preparation combines Template’s authored starter files with ImmuKnow’s shared
library. Downloads include the selected authored project and, when requested,
Studio’s fictional inputs. Studio uses `template-source.json` to verify the
upstream package source during asset preparation. Downloads omit unchanged
starter documentation and build metadata unless project sources reference them.


## ImmuKnow versions

Studio has its own release number. `immuknow-revision.txt` selects the exact
reviewed ImmuKnow commit. Template records the same revision. `pyproject.toml` and `uv.lock` separately pin the Template resource
package. Workflow artifacts retain those pins, the executable fingerprint and
resource identity. A manual rebuild uses the same recorded ImmuKnow commit.

Do not infer compatibility from a version label. Update ImmuKnow and Template pins
together, regenerate examples and validate browser/native handoffs. Resource
bytes, formats and browser compiler identity determine draft compatibility.

The application footer shows **ImmuKnow Studio** with its exact release tag,
that tag plus `+` for later commits, or a short commit before the first version
tag. Hover over the label for the full Studio commit or follow its link to GitHub.
That build identifies the pinned ImmuKnow resources as well.
