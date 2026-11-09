# Plan: consume revised findings and project resources

Studio work from the [shared investigation plan](../plan.md). Filename settings and coordinated pins are implemented; the other work remains planned. Studio is the browser editor and fictional preview environment; production preparation, HTML run reports, acknowledgment persistence and bundle operations belong in Core. Do not add a native batch service or patch Core here.

## Evidence and boundaries

- [Architecture](docs/architecture.md) describes a static browser app consuming Core's public `prepare`/`resources` contracts and Template's pinned authored package.
- [main.ts](src/main.ts), around 164–207, combines preparation, compiler and rendered findings in preview. [types.ts](src/types.ts) has finding status/code/message; there is no warning-acceptance control today.
- [Development](docs/development.md) requires exact clean Core source/executable verification and coordinated Core/Template pins. Generated schemas, shared resources and browser payloads stay generated.
- [benchmark-preview.mjs](scripts/benchmark-preview.mjs) measures browser previews, including cold/warm timings and environment. It does not profile a real production native batch.

## P0: adopt individual and batch filename templates first

- [x] As soon as Core and Template support filename patterns, update matching Core/Template pins, build the exact clean Core source through `scripts/native_core.py`, verify the stored executable fingerprint and refresh generated resources.
- [x] Preserve editable filename patterns in Template project settings through import, drafts and download. Follow encryption's `{field}` authoring approach and link to Core's individual/batch supported-field documentation. Native naming remains Core-owned; a new Studio control is not required to ship the setting.
- [x] Verify a downloaded fictional project produces configured original/protected names, normal/review batch names and matching CSV stems, with functioning native report links and rebundle. Existing imported projects without filename settings retain legacy behavior.
- [x] Treat this as the highest usability priority, separate from coverage/acknowledgment/catalog changes and configurable sorting. Do not delay it for a browser compiler rebuild when compiler inputs have not changed.

## Independent: consume the reference fixes

- [ ] After Template carries Meningococcal disease normalization and TIg reference/display exclusions upstream, update Studio's Template package pin and lock.
- [ ] Regenerate native-prepared examples/resources and confirm the authored files appear in downloads. Reference-only changes need no new native schema; keep the current Core pin if unchanged.
- [ ] Verify existing fictional previews and export preservation. Do not add private production records or separate copies of the reference configuration here.

## P1: adopt Core's notice-dependent row findings

- [ ] After Core implements coverage-basis metadata and empty-agent display evidence, and Template adopts them, update `core-revision.txt` and the Template pin together.
- [ ] Build the exact clean Core source through `scripts/native_core.py` and verify the stored executable fingerprint through that workflow. Regenerate Core-exported schemas, browser validators and prepared examples; never edit generated validators or installed resource files.
- [ ] Ensure preview presents preparation coverage failures/warnings and placed-content empty-list failures consistently with the native contract. Eligibility, source coverage and display exclusions must remain distinguishable.
- [ ] Preserve source bytes, relative paths, drafts and imported older projects. Do not silently rewrite authored catalogs or references to fit new defaults. Show compatibility guidance when an actual migration is needed.
- [ ] Verify a downloaded project outside both repos with native sync/check/run/rebundle, using the matching engine and no Python requirement in the exported project.

## Warning acknowledgment: consume the contract, keep scope clear

- [ ] If Core adds structured URL subjects, update generated contracts and preview rendering so issue details/counts are available without parsing human messages. Keep raw compiler diagnostics separate.
- [ ] Keep observed findings visible even if a future effective/acknowledged state is displayed. An acknowledgment is not a passed check or an implicit delivery approval. Do not add a generic hide-all-errors button.
- [ ] Core's saved-run acknowledgment belongs in its run/report/rebundle workflow. Add a Studio authoring acknowledgment control only if separately scoped and supported by an exported policy contract; there is no production run UI here to extend today.
- [ ] Avoid exposing personalized query values in aggregate labels. New links and changed destination sets need distinct review.

## Later: catalog, sorting handoff and profiling documentation

- [ ] If the disease catalog/language layout changes, preserve imported legacy files and paths, package all required authored resources, and test explicit migration/export compatibility. File renaming alone does not add language support.
- [ ] Verify downloaded project settings for optional last-name/DOB ordering separately from P0 filename templates. Keep grouping, naming, sorting and production report-size implementation in Core.
- [ ] Update native-production guidance when behavior actually changes. Link to Core's finding/review/performance guides instead of duplicating their contracts.
- [ ] Keep browser benchmark results separate from the 384.5-second native run. Use the existing preview benchmark only to detect editor/compiler/viewer changes from new resources; native profiling is a separate workflow.

## Verification

Follow [development checks](docs/development.md) and [documentation checks](docs/documentation.md). For code/pin changes run frontend typecheck, lint and unit tests plus Python type/lint checks, then focused browser checks against a fresh build. Verify preview findings, draft/import preservation, downloads and the intended standalone native engine together. Use the manual `full_tests` workflow for full browser/native acceptance; retain the existing routine-CI policy.

Documentation-only changes use the strict documentation build, without rebuilding the compiler or running the full browser suite. An unchanged browser compiler does not need rebuilding merely because Core resources or Template data changed.
