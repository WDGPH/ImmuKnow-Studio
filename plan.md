# Plan: consume revised findings and project resources

Studio work from the [tracked shared execution plan](../ImmuKnow/plan.md). Filename settings and coordinated pins are implemented; the other work remains planned. Studio is the browser editor and fictional preview environment; production preparation, HTML run reports, acknowledgment persistence and bundle operations belong in Core. Do not add a native batch service or patch Core here.

## Evidence and boundaries

- [Architecture](docs/architecture.md) describes a static browser app consuming Core's public `prepare`/`resources` contracts and Template's pinned authored package.
- [main.ts](src/main.ts), around 164–207, combines preparation, compiler and rendered findings in preview. [types.ts](src/types.ts) has finding status/code/message; there is no warning-acceptance control today.
- [Development](docs/development.md) requires exact clean Core source/executable verification and coordinated Core/Template pins. Generated schemas, shared resources and browser payloads stay generated.
- [benchmark-preview.mjs](scripts/benchmark-preview.mjs) measures browser previews, including cold/warm timings and environment. It does not profile a real production native batch.

## F0: filename adoption complete

Matching runtime pins, editable filename settings in downloads, unit/browser checks and downloaded native original/protected/bundle/review/rebundle handoffs are complete. Do not rebuild or reimplement filename support for the work below. The shared plan distinguishes shipped defaults from custom examples.

## R1: reference fixes adopted

- [x] Adopt Template's committed Meningococcal disease normalization and TIg reference/display exclusions (`b129c7a286483261332d3403e51d064b476f4711`) through Studio's package pin and lock.
- [x] Regenerate native-prepared examples/resources and confirm the authored files appear in downloads. The existing Core pin remains unchanged.
- [x] Verify existing fictional previews and export preservation without adding private records or separate reference configuration copies.

## R2a/R2b: adopt the shared requirements contract

- [ ] Participate in R2a's schema/fixture review, then adopt R2b's prerelease v2.0 notice-local requirements/report contract and empty-agent display evidence with coordinated Core/Template pins. The shared Typst helper evaluates eligibility/coverage; Studio validates/displays its report without a second JavaScript evaluator. Refreshed starters and exported resources no longer contain or depend on `notice_versions.yaml`; no legacy catalog compatibility is required.
- [ ] Build the exact clean Core source through `scripts/native_core.py` and verify the stored executable fingerprint through that workflow. Regenerate Core-exported schemas, browser validators and prepared examples; never edit generated validators or installed resource files.
- [ ] Preserve R2a's per-entry deferred-check list outside observed checks in generated examples. Deferred requirements must not make example generation fail or imply a passed check. Display a neutral “Checked when the notice compiles” advisory until a current validated result exists; do not include it in warning counts. Preserve existing stale/last-successful-preview labels and distinguish assertion/compilation failures from readable notices with failed checks.
- [ ] Keep a rendered preview visible with an explicit mandatory failure for missing/duplicate/malformed requirements; do not conflate successful rendering plus failed validation with compilation failure. For genuinely corrupt/wrong-row evidence, reject claimed findings and mark the artifact unverified while retaining the rendered preview. Use the R2a fixtures for parity.
- [ ] Distinguish pending checks from completed but blocked checks: invalid requirements produce a mandatory `notice.requirements` failure and an explicit `blocked_checks` list outside observations. Clear the deferred advisory for a current validated failed-declaration report; do not present dependent checks as passed or not applicable.
- [ ] Preserve ordinary authored bytes, paths and drafts, without adding catalog-specific import handling or silently rewriting notices. Verify v2 projects use notice-local requirements with no YAML; missing/malformed declarations fail visibly and an obsolete imported YAML file has no effect. Remove old catalog assumptions from project generation and tests.
- [ ] Verify a downloaded project outside both repos with native sync/check/run/rebundle, using the matching engine and no Python requirement in the exported project. Confirm structured failures retain review PDFs and rebundling uses saved requirements/results without re-evaluating an edited notice.

## W1/W2: consume warning evidence; native acknowledgment remains Core-owned

- [ ] If Core adds structured URL subjects, update generated contracts and preview rendering so issue details/counts are available without parsing human messages. Keep raw compiler diagnostics separate.
- [ ] Keep observed findings visible even if a future effective/acknowledged state is displayed. An acknowledgment is not a passed check or an implicit delivery approval. Do not add a generic hide-all-errors button.
- [ ] Core's saved-run acknowledgment belongs in its run/report/rebundle workflow. Add a Studio authoring acknowledgment control only if separately scoped and supported by an exported policy contract; there is no production run UI here to extend today.
- [ ] Avoid exposing personalized query values in aggregate labels. New links and changed destination sets need distinct review.

## D1/S1/H1/PR1: later work and documentation

- [ ] If the disease catalog/language layout changes, preserve imported legacy files and paths, package all required authored resources, and test explicit migration/export compatibility. File renaming alone does not add language support.
- [ ] Verify downloaded project settings for optional last-name/DOB ordering separately from completed F0 filename support. Keep grouping, naming, sorting and production report-size implementation in Core.
- [ ] Update native-production guidance when behavior actually changes. Link to Core's finding/review/performance guides instead of duplicating their contracts.
- [ ] Keep browser benchmark results separate from the 384.5-second native run. Use the existing preview benchmark only to detect editor/compiler/viewer changes from new resources; native profiling is a separate workflow.

## Verification

Execute R1 independently; do not implement R2b before R2a fixtures/schema/deferred semantics are fixed. G1 and W1 engine changes may be adopted separately; W2 needs its operator/persistence contract first. Follow [development checks](docs/development.md) and [documentation checks](docs/documentation.md). For code/pin changes run frontend typecheck, lint and unit tests plus Python type/lint checks, then focused browser checks against a fresh build. Verify preview findings, draft/import preservation, downloads and the intended standalone native engine together. Use the manual `full_tests` workflow for full browser/native acceptance; retain the existing routine-CI policy.

Documentation-only changes use the strict documentation build, without rebuilding the compiler or running the full browser suite. An unchanged browser compiler does not need rebuilding merely because Core resources or Template data changed.
