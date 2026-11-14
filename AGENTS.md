# Studio development

Read README.md and docs/studio.md before changing build or editor behavior.
Manual content stays in docs/ with navigation in mkdocs.yml. Follow
docs/documentation.md for source checks and the separate PHIZ hub publication.
This repository owns Studio's UI, browser compiler, fonts, example descriptions
and preview settings, and browser/unit tests. Core owns the native engine,
schemas and shared Typst components. Template owns the fictional example
clients, starter letters, Settings, display translations, example branding,
project configuration and reference lists. Studio consumes its pinned
resource package. Core supplies no starter project. Follow the
[shared language and project responsibilities](https://docs.phiz.ca/immuknow/latest/ecosystem/).

Use the verified standalone executable through scripts/native_core.py and the
public prepare/resources/run/rebundle and project commands. core-revision.txt and Template's
recorded revision must agree. Build the exact clean source and verify the stored
executable fingerprint; do not import Python Core or infer source from a version
label. Do not add Core source or tests here. Changes belong in Core.

Preserve complete authored project bytes and relative paths. Shared components
remain read-only and must match Core. Preserve draft recovery, archive limits,
comment-aware editing and compatibility checks.

Prefer clear, direct authoring and abstractions that earn their complexity. Follow
Core's [authoring principles](https://docs.phiz.ca/immuknow/latest/developer_guide/templates/).

Follow docs/documentation.md for plain language and current-behavior guidance.
Use short, plain pull request descriptions focused on the reason for the change
and its effect. Omit agent attribution and detailed verification logs.

Example clients help people develop notices. Use plausible fictional records
with complete contact details and consistent dates. Share the client collection
across templates and languages. Keep deliberately invalid or conflicting data
in test fixtures; Core owns validation tests.

Follow docs/development.md for test scope and the shared testing strategy.
The full browser/native suite runs only when selected in the manual workflow
to conserve Actions minutes. Preserve that policy unless a change is requested.

For code changes, run npm run typecheck, npm run lint, npm run test:unit and
Python type/lint checks, then the relevant browser checks against a fresh build.
Preserve the downloaded project journey through the separately installed native
engine with no Python setup in the extracted project. Build compiler
patches only with their matching pins and retain licenses. Maintain fictional
example records in Template. Studio keeps only example descriptions and preview
settings; browser payloads and other generated assets stay ignored and
are rebuilt during dev setup and production builds.
Documentation-only changes need the strict documentation build, not a compiler
rebuild or browser suite.

Never commit real client data or private PHU assets. Keep changes small and
commit after meaningful verification. Record actual checks and limits in handoff.
