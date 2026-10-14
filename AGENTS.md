# Studio development

Read README.md and docs/studio.md before changing build or editor behavior.
This repository owns Studio's UI, browser compiler, fonts, fictional scenarios
and browser/unit tests. Core owns the native engine, default templates,
configuration, schemas and shared Typst components.

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
patches only with their matching pins and retain licenses. Commit generated
examples/prepared.json when scenarios change; other generated assets stay ignored.

Never commit real client data or private PHU assets. Keep changes small and
commit after meaningful verification. Record actual checks and limits in handoff.
