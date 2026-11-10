# v2 plan: adopt revised evidence, QR resources and native reports

**Status: planned; implementation pending.** This checklist implements Phase 3 and records the Studio migration notes arising during Phase 1 in the [shared Core plan](../ImmuKnow/plan.md). The shared plan owns CSV, saved-state, severity, measurement and QR decisions. This planning change does not modify runtime code, pins, generated assets or hosted output.

Start at `4c4c98d2f57e0042c9fc8349c274eb64a663c9fc`, pinning Core `16792decc1e4fb405f63d2780ed87d5f46dba37c` and Template `91c5b1cf5e573d8c8f234d71252ea65bfbe6d9fb`. Studio remains a browser authoring/preview application. Production CSV export, saved runs, acknowledgment, holds and rebundling belong in Core; add no native batch service or production review UI here.

Sol coordinates this repository phase, with most implementation delegated to Terra subagents and occasional Astra review of consequential integration decisions. Parallelize independent work where useful; do not split a small migration into artificial release gates. Keep this checklist current while Core iterates, then perform the consumer changes together.

## 1. Prepare consumers of the new contract

- [ ] Review render-report v4 and saved-run v2 fixtures with Core. Inventory `src/types.ts`, `src/render-contract.ts`, `src/main.ts`, `src/viewer.ts`, `src/preview-sources.ts`, generated validators, relevant `unit/` cases and `tests/check_typst_project.py`. Prepared facts/deferred-check schema remains v2; do not bump unrelated contracts merely because resources change.
- [ ] Move the envelope guide in `viewer.ts` from a passing check's duplicate `measurements` to validated top-level address component geometry. Preserve address/window padding and actual page selection. Keep source-target navigation from address/client/history/section evidence in `preview-sources.ts`. Missing/invalid evidence must not produce a fabricated overlay or stale verified indication.
- [ ] Retain full-notice/source identity checks, finite-number/page bounds, requirements/coverage/source-display assertions and structured link subjects through the shared exported contract. Update measurement expectations deliberately; do not blanket-remove passing evidence used to verify or edit the notice. No JavaScript reimplementation of clinical/notice eligibility rules.
- [ ] Keep pending and blocked checks distinct, preserve readable failed previews and last-successful/stale labeling, and keep compiler diagnostics separate from structured findings. The native CSV severity summary is not a new browser batch-report feature.

## 2. Adopt the verified Core → Template pair

After Core and then Template have completed their migrations:

- [ ] Update `core-revision.txt`, the Template Git revision in `pyproject.toml`, and `uv.lock` together. Template's packaged Core revision must equal Studio's Core revision exactly. Never pin uncommitted source, a branch or the older profiling revision.
- [ ] Install the exact clean Core source through `uv run --locked python -m scripts.native_core install` (with a matching local `--source` if appropriate); verify the stored source/binary fingerprint. Regenerate Core-exported schemas, browser validators, preview facts and assets through the existing preparation/build commands. Never patch installed package files or generated validators.
- [ ] Consume the complete shared library, including the integer-grid helper and finder bounds, without a boolean adapter. Verify the downloaded project's shared bytes against the executable's manifest.
- [ ] Preserve existing browser compiler/renderer pins and licenses. These shared Typst resource changes do not require rebuilding an unchanged browser compiler; use the existing verified cache workflow.

## 3. Verify preview and downloaded-project workflows

- [ ] Update TypeScript types and native/browser contract fixtures for render-report v4. Add focused regressions for envelope guide/source navigation after duplicate measurement removal, wrong-fact provenance, nonfinite geometry, blocked requirements and diagnostic separation. Reuse Core's shared fixture expectations rather than copying the complete native suite.
- [ ] Exercise styled QR previews with colored finders/alignment, module/corner alternatives, Unicode destinations and valid/rejected logo masks, plus existing default RGB SVG and non-RGB run paths. Check representative English/French previews and decoded destinations. Default Template examples alone do not exercise every optimized grid path.
- [ ] Update `tests/check_typst_project.py` and other native readers to the new saved-evidence/effective-result shape and selected export-generation paths. Remove assumptions about `render_report.notice`, duplicate check measurements, `report.html` and a CSV next to each bundle PDF. Preserve semantic native/browser finding, page, QR and source-identity comparisons.
- [ ] From a fresh built site, download a fictional project and extract it outside both repositories. Use only the separately installed native executable and fonts for `project sync`, `project check --sample`, `run` and `rebundle`. Verify terminal counts/percentages, both run-wide CSVs, no-PDF and held membership, original/protected/bundle paths and page ranges, and the new active versus prior attempt exports. Keep acknowledgment/revoke/refresh native, with one handoff smoke check where the fictional project supplies a reviewable warning.
- [ ] Verify import/export and draft recovery retain complete authored bytes and relative paths, editable filename/grouping/sorting/QR settings and the packaged project README. Keep imported arbitrary files intact; do not create special legacy-report/YAML migration behavior. A downloaded project needs no Python setup.

## 4. Documentation, checks and handoff

- [ ] Update Studio's project-download/native instructions and relevant architecture/development pages to link to the CSV-first Core workflow. Remove claims that native review opens HTML or generates a per-bundle CSV. Explain that native output review/acknowledgment remains outside Studio without exposing build internals in the editor UI.
- [ ] Follow `docs/development.md`: frontend typecheck, lint, unit/format checks, Python type/lint/tests, strict documentation build and a fresh site build. Run focused browser/native checks for findings, overlays/source navigation, styled QR, draft/import preservation and downloaded projects against that fresh build and exact native fingerprint.
- [ ] Select the existing manual `full_tests` workflow for full browser/native acceptance when publishing is separately authorized; retain the current cheaper routine-CI policy. Local checks must state their scope and cannot be described as that workflow having run. Do not rebuild compiler binaries for a plan-only or documentation-only change.
- [ ] Record exact Core/Template/Studio revisions, actual checks and limitations. Adopting a different upstream revision requires a refreshed matching pair and repeated affected handoff checks. This plan includes no push, merge or deployment.

## Preserve completed work and boundaries

Retain filename settings/downloads, reference fixes, notice-local requirements with no obsolete catalog fallback, row-isolation preparation, structured warning subjects, grouping/sorting and native fingerprint verification. Core's reporting change deliberately supersedes its old HTML layout; it does not reopen these features.

The supplied native profiling is completed evidence, distinct from Studio's preview benchmark. Any browser benchmark here checks preview regressions and must not claim a native batch speedup. Disease catalog migration, scheduling/cache/engine experiments and upstream school exports remain outside scope. There are no unresolved Studio product choices blocking implementation.
