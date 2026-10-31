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
remain read-only and must match Core. Keep the existing draft, archive limits,
comment-aware editing and compatibility checks. Do not introduce a new project
format or repository ingestion feature as part of the extraction.

Run npm run typecheck, npm run lint, npm run test:unit, Python type/lint checks,
then the relevant browser checks against a fresh build. Preserve the downloaded
project journey through the separately installed native engine. Build compiler
patches only with their matching pins and retain licenses. Commit authored
example records in examples/scenarios.json; browser payloads and other generated
assets stay ignored and are rebuilt during dev setup and production builds.

Never commit real client data or private PHU assets. Keep changes small and
commit after meaningful verification. Record actual checks and limits in handoff.
