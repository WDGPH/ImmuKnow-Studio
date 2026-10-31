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
and Windows line-ending offsets. The five prepared scenarios provide eleven
variants across six maintained filenames: English and French overdue disease and
agent notices, an English affirmative notice and an English suspension order.

## Planned: shared example clients

This is a plan for extending Studio PR #16. It does not describe the current
example data format. Keep the client-data update in PR #12 independent; build
this feature on main after that update merges.

### One record for each person

Give each fictional client a stable ID, a name for the example picker, a short
description and one source record. Store their identity, address, school, birth
date, history and overdue facts once. Keep the shared assessment dates and
creation timestamp with the example collection.

A template or language change selects another view of that same person. It must
not substitute a different person under the same example ID, translate their
identity, or change their history or overdue facts to make a notice fit. Preserve
the intern's authored client records when extracting the shared collection;
curating their contents is separate work.

The browser already supports an example with several prepared payloads, keyed
by template filename. Keep that useful structure. Generated payloads may repeat
facts; the important change is to author each client's facts in one place.

### Preparation and selection

1. Replace template-specific source records in `scenarios.json` with a shared
   client collection. Give distinct people distinct IDs, even when both were
   previously grouped under a label such as Short history.
2. Prepare each client for the maintained notice entry points through the locked
   Core package. Core continues to own normalization, applicability findings and
   the notice facts contract. Do not copy those rules into browser code.
3. Keep the selected client ID when switching between supported templates or
   languages. Show the person's name with the example controls so the selection
   is clear. Changing clients must preserve authored Template, Settings and Theme
   edits.
4. Write one source CSV per client and a separate assignment file for each notice
   view. Downloads include that client's unchanged CSV and the selected notice's
   assignment. Preserve imported, authored sample files rather than replacing
   them with Studio examples.

The selection policy is still to be decided. The recommended default is to offer
clients whose supplied facts fit the selected notice, using Core's applicability
results. Overdue notices in different languages can share a client; an up-to-date
notice needs a client with no overdue diseases. Retain the selected person
whenever possible, and select another compatible person when necessary. Unknown
applicability must not count as confirmed compatibility.

The alternative is to allow every client with every prepared template and show
Core's applicability warnings. Either policy must preserve the source facts.
A custom entry point without prepared facts remains exportable; Studio must not
invent data for it.

### Checks and cleanup to carry forward

- Keep the inexpensive native preparation check that exported inputs reproduce
  the preview. Add a check that views of one client use the same source CSV and
  preserve the same client facts.
- Add a browser journey that keeps one person selected across English/French and
  disease/agent notices, then verifies the chosen applicability policy. Confirm
  that edits and the selected client survive a draft reload and project download.
- Create missing dates, incomplete addresses and conflicting assignments inside
  tests that need them. The example collection should serve notice design rather
  than act as a collection of validation edge cases.
- Have the performance benchmark create its own long history, independent of the
  number of administrations in a public example.
- Keep browser/native download checks focused on the project handoff. Remove the
  duplicate saved-run rebundling exercise from Studio after confirming that Core
  owns that coverage, and update the coverage descriptions together. Do not add
  a PDF compilation for every client/template combination.

Studio owns this collection and its browser behavior. Core needs no new clinical
rules or dependency update for this change. Template continues to supply the
runnable project setup. As a pre-release change, this does not need a migration
layer for the old internal example format; project integrity and authored file
preservation still apply.

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
