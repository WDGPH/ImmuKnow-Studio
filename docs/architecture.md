# Architecture and compatibility

## What each project owns

| Project | Responsibility |
| --- | --- |
| ImmuKnow core | Python pipeline, input validation, prepared notice facts, schemas, default templates, configuration, shared Typst components and native generation/review results |
| ImmuKnow Studio | Browser editor, Theme controls, draft storage, project import/download, browser compiler and renderer, fonts, fictional examples and Studio tests |
| ImmuKnow Template | Runnable project setup, Python dependency lock, native helper scripts and project tests |
| PHIZ documentation hub | Shared manual presentation, version selection, search and documentation publication |

Studio installs Core as a Python build dependency. Build preparation obtains
resources from the installed package through `immuknow.resources.resource_root()`
and `rendering_build_info()`, copies disposable resources into `generated/core/`,
prepares examples and generates browser validators. The deployed Studio is a
static application: it runs no Python service and requires no application backend.

The browser compiles Typst and renders previews locally using the prepared
facts. Native production runs use the separately installed ImmuKnow core.
`immuknow.orchestrator.run_pipeline()` is Core's complete native-run interface.
Studio's example preparation still uses internal Core functions, so adopting
a new Core revision requires preparation and browser/native export checks.

## Typst and project files

Studio supports full Typst functionality through its Template and Settings
source editors. Theme controls are conveniences for common changes. They do
not define the limits of what you can author in the Typst source.

The project still follows ImmuKnow's notice contract and local file boundaries:

- Keep helper files, translations, images and other dependencies inside the
  project's template tree and use relative paths.
- Keep supplied `lib/immuknow/` files complete and unchanged. Put your own helpers
  outside that directory. Studio opens shared components for reading only.
- Vendor dependencies into the project. Runtime `@preview` and `@local` package
  imports and package downloads are disabled in Studio and native ImmuKnow.
- Keep notice entry filenames in `<version>.<language>.typ` form, with supported
  `en` or `fr` language codes.

See [Core's native template contract](https://docs.phiz.ca/immuknow/latest/user_guide/phu_templates/)
for supplied components and facts. Browser previews use fixed prepared examples;
new source records or factual configuration require native preparation. A custom
entry point without a prepared example remains exportable.

Studio preserves authored file bytes and relative paths through drafts, imports
and downloads. The ZIP's `immuknow-project.json` records the selected entry,
format version, build identity and SHA-256 file hashes. Import verifies these
requirements and the shared resources. Files are limited to 12 MiB each and
32 MiB in total; unsafe paths, duplicates, symlinks and corrupt archives are
rejected. See [Editing, drafts and downloads](studio.md) for format and reset
details.

Preview source spans distinguish repeated wording and preserve accented-character
and Windows line-ending offsets.

## Shared example clients

Every supplied notice uses the same collection of fictional clients. Each client
has one source record and a stable example ID. Names, addresses, history and
overdue facts stay the same when switching templates or languages. The previous
French-name examples are ordinary members of the collection and can also appear
in English notices.

`examples/scenarios.json` owns the client records, the maintained template
filenames and the fixed dates used by the examples. Asset preparation writes one
CSV per client and uses the locked Core package to prepare a view and assignment
for each notice. The browser reads these prepared facts; it does not assess
clients or change their records to fit a notice.

All examples remain available, including combinations that produce warnings.
Core's source and applicability findings stay attached to the selected view.
A custom entry point without prepared facts remains exportable.

The selected example ID survives template changes and draft reloads. Downloads
include its source CSV and the chosen notice's assignment. Imported sample files
remain authored project files and are preserved. The native preparation checks
confirm that the exported inputs reproduce each view; browser checks cover
selection, edits, reloads and downloads.

## Template scaffold

Studio bundles an allowlisted snapshot of ImmuKnow-Template at an exact commit
under `assets/project-template/`. Asset preparation verifies every upstream file
against `template-source.json` and checks that its lock selects the same Core
commit as Studio. Normal builds and browser downloads need no private repository
credentials or fetches. Refresh the snapshot explicitly as described in
[Build and contribute](development.md#update-the-project-template).

Downloads combine this scaffold with the selected authored project and fictional
inputs. Missing setup files are supplied for older imported projects; existing
files are preserved. `template-source.json` identifies the original upstream
snapshot, while `immuknow-project.json` hashes the actual downloaded bytes.


## Core versions

Studio v0.1.0 has its own release number. Its Core dependency currently selects
Core's `v2.0.0-rc2` tag in `pyproject.toml`, with an exact commit recorded
in `uv.lock`. Ordinary locked builds use that commit. A manual build can
explicitly refresh the configured reference; its effective lockfile and Core
identity are retained in the workflow artifacts.

The current pin is the **ImmuKnow v2.0.0-rc2** release candidate. Do not infer
Core compatibility from Studio's version number.

When adopting a tagged Core release, update both dependency files, prepare and
review examples, and run the browser/native export checks described in
[Build and contribute](development.md). Resource bytes, formats and compiler
identity determine whether an existing draft or project is compatible; matching
a version label alone is insufficient.

The application footer shows Studio's commit and latest reachable version tag,
along with its targeted ImmuKnow commit. A `+` after the Studio tag means later
commits are included. Hover over a short hash for the full value. These identities
help contributors reproduce a problem without conflating the two releases.
