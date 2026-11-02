# Studio development

Read README.md and docs/studio.md before changing build or editor behavior.
Manual content stays in docs/ with navigation in mkdocs.yml. Follow
docs/documentation.md for source checks and the separate PHIZ hub publication.
This repository owns Studio's UI, browser compiler, fonts, fictional scenarios
and browser/unit tests. Core owns the native engine, default templates,
configuration, schemas and shared Typst components. Follow the
[shared language and project responsibilities](https://github.com/WDGPH/ImmuKnow/blob/main/docs/developer_guide/documentation.md#shared-language-and-project-responsibilities).

Use the installed Core package through immuknow.resources for resources and
rendering identity. Example preparation currently calls internal Core functions;
keep that dependency locked to an exact commit and test updates. Do not add Core
source or its test package here. Changes belong on the separate Core branch.

Preserve complete authored project bytes and relative paths. Shared components
remain read-only and must match Core. Preserve draft recovery, archive limits,
comment-aware editing and compatibility checks.

Follow Core's [template authoring principles](https://github.com/WDGPH/ImmuKnow/blob/main/docs/developer_guide/documentation.md#template-authoring-principles).
Theme controls should support clear literal arguments in Templates rather than
require Settings aliases solely for UI convenience. Preserve image aspect ratios,
authored sizes, independent printed/prose names, and Theme choices through resets
and downloads. Change shared starters and helper defaults in Core.

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
engine. Build compiler
patches only with their matching pins and retain licenses. Commit authored
example records in examples/scenarios.json; browser payloads and other generated
assets stay ignored and are rebuilt during dev setup and production builds.
Documentation-only changes need the strict documentation build, not a compiler
rebuild or browser suite.

Never commit real client data or private PHU assets. Keep changes small and
commit after meaningful verification. Record actual checks and limits in handoff.
