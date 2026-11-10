# v2 plan: adopt revised evidence, QR resources and native reports

**Status: complete; verified locally.** This checklist implements Phase 3 and records the Studio migration notes arising during Phase 1 in the [shared Core plan](../ImmuKnow/plan.md). The shared plan owns CSV, saved-state, severity, measurement and QR decisions. No hosted output is changed.

Work on existing branch `feat/rust-core-integration`. Adopted Core `073dde56ad71cc852141e69135a8b779d4332fe6` and Template `cb5bbd7552c07c8c3ffd013bcb579813f6fa60a5` after both upstream phase exits. Studio remains a browser authoring/preview application. Production CSV export, saved runs, acknowledgment, holds and rebundling belong in Core; add no native batch service or production review UI here.

Sol coordinates this repository phase, with most implementation delegated to Terra subagents and occasional Astra review of consequential integration decisions. Parallelize independent work where useful; do not split a small migration into artificial release gates. Keep this checklist current while Core iterates, then perform the consumer changes together.

## 1. Prepare consumers of the new contract

- [x] Review render-report v4 and saved-run v2 fixtures with Core. Inventory `src/types.ts`, `src/render-contract.ts`, `src/main.ts`, `src/viewer.ts`, `src/preview-sources.ts`, generated validators, relevant `unit/` cases and `tests/check_typst_project.py`. Prepared facts/deferred-check schema remains v2; do not bump unrelated contracts merely because resources change.
- [x] Move the envelope guide in `viewer.ts` from a passing check's duplicate `measurements` to validated top-level address component geometry. Preserve address/window padding and actual page selection. Keep source-target navigation from address/client/history/section evidence in `preview-sources.ts`. Missing/invalid evidence must not produce a fabricated overlay or stale verified indication.
- [x] Retain full-notice/source identity checks, finite-number/page bounds, requirements/coverage/source-display assertions and structured link subjects through the shared exported contract. Update measurement expectations deliberately; do not blanket-remove passing evidence used to verify or edit the notice. No JavaScript reimplementation of clinical/notice eligibility rules.
- [x] Keep pending and blocked checks distinct, preserve readable failed previews and last-successful/stale labeling, and keep compiler diagnostics separate from structured findings. The native CSV severity summary is not a new browser batch-report feature.

## 2. Adopt the verified Core → Template pair

After Core and then Template have completed their migrations:

- [x] Update `core-revision.txt`, the Template Git revision in `pyproject.toml`, and `uv.lock` together. Template's packaged Core revision must equal Studio's Core revision exactly. Never pin uncommitted source, a branch or the older profiling revision.
- [x] Install the exact clean Core source through `uv run --locked python -m scripts.native_core install` (with a matching local `--source` if appropriate); verify the stored source/binary fingerprint. Regenerate Core-exported schemas, browser validators, preview facts and assets through the existing preparation/build commands. Never patch installed package files or generated validators.
- [x] Consume the complete shared library, including the integer-grid helper and finder bounds, without a boolean adapter. Verify the downloaded project's shared bytes against the executable's manifest.
- [x] Preserve existing browser compiler/renderer pins and licenses. These shared Typst resource changes do not require rebuilding an unchanged browser compiler; use the existing verified cache workflow.

## 3. Verify preview and downloaded-project workflows

- [x] Update TypeScript types and native/browser contract fixtures for render-report v4. Add focused regressions for envelope guide/source navigation after duplicate measurement removal, wrong-fact provenance, nonfinite geometry, blocked requirements and diagnostic separation. Reuse Core's shared fixture expectations rather than copying the complete native suite.
- [x] Exercise styled QR previews with colored finders/alignment, module/corner alternatives, Unicode destinations and valid/rejected logo masks, plus existing default RGB SVG and non-RGB run paths. Check representative English/French previews and decoded destinations. Default Template examples alone do not exercise every optimized grid path.
- [x] Update `tests/check_typst_project.py` and other native readers to the new saved-evidence/effective-result shape and selected export-generation paths. Remove assumptions about `render_report.notice`, duplicate check measurements, `report.html` and a CSV next to each bundle PDF. Preserve semantic native/browser finding, page, QR and source-identity comparisons.
- [x] From a fresh built site, download a fictional project and extract it outside both repositories. Use only the separately installed native executable and fonts for `project sync`, `project check --sample`, `run` and `rebundle`. Verify terminal counts/percentages, both run-wide CSVs, no-PDF and held membership, original/protected/bundle paths and page ranges, and the new active versus prior attempt exports. Keep acknowledgment/revoke/refresh native, with one handoff smoke check where the fictional project supplies a reviewable warning.
- [x] Verify import/export and draft recovery retain complete authored bytes and relative paths, editable filename/grouping/sorting/QR settings and the packaged project README. Keep imported arbitrary files intact; do not create special legacy-report/YAML migration behavior. A downloaded project needs no Python setup.

## 4. Documentation, checks and handoff

- [x] Update Studio's project-download/native instructions and relevant architecture/development pages to link to the CSV-first Core workflow. Remove claims that native review opens HTML or generates a per-bundle CSV. Explain that native output review/acknowledgment remains outside Studio without exposing build internals in the editor UI.
- [x] Follow `docs/development.md`: frontend typecheck, lint, unit/format checks, Python type/lint/tests, strict documentation build and a fresh site build. Run focused browser/native checks for findings, overlays/source navigation, styled QR, draft/import preservation and downloaded projects against that fresh build and exact native fingerprint.
- [x] Retain the existing manual `full_tests` workflow and cheaper routine-CI policy; select the manual workflow for full browser/native acceptance when publishing is separately authorized. Local checks must state their scope and cannot be described as that workflow having run. Do not rebuild compiler binaries for a plan-only or documentation-only change.
- [x] Record exact Core/Template/Studio revisions, actual checks and limitations. Adopting a different upstream revision requires a refreshed matching pair and repeated affected handoff checks. This plan includes no push, merge or deployment.

## Preserve completed work and boundaries

Retain filename settings/downloads, reference fixes, notice-local requirements with no obsolete catalog fallback, row-isolation preparation, structured warning subjects, grouping/sorting and native fingerprint verification. Core's reporting change deliberately supersedes its old HTML layout; it does not reopen these features.

The supplied native profiling is completed evidence, distinct from Studio's preview benchmark. Any browser benchmark here checks preview regressions and must not claim a native batch speedup. Disease catalog migration, scheduling/cache/engine experiments and upstream school exports remain outside scope. There are no unresolved Studio product choices blocking implementation.

## Phase 3 acceptance notes

Exact upstream pair: Core `073dde56ad71cc852141e69135a8b779d4332fe6`, Template
`cb5bbd7552c07c8c3ffd013bcb579813f6fa60a5`. Native installation records clean
Core source and binary SHA-256
`fcbe29bfab628cfd65ba8640a68962a6ac21bc7b8cc86fe985de691d612175f6`.
All shared resources and report-v4 validators were regenerated through public
commands. The verified browser compiler/renderer cache, pins and licenses remain
unchanged; the fresh static build passed with `--require-prepared-toolchain`.
The final Studio integration commit is recorded in the shared Core migration ledger.

Validation completed:

- Frontend typecheck/lint, nonmutating Biome format checks on changed TypeScript,
  and all 243 unit tests pass. Python type/lint/format checks, six Python unit
  tests and strict MkDocs pass.
- The full local 87-case browser/native suite executed: 86 passed, and one stale
  eligibility assertion was updated to the current `notice.eligibility` contract.
  That case then passed its targeted recheck. A 105-file source-hash audit confirms
  only that test changed after the full run, preserving the other 86 results.
- All four downloaded-project journeys passed. They cover custom source and both
  selectors, long French pagination, guardian-directed output, warning review,
  and original/protected/bundle paths and page ranges. The actual protected PDF
  requires a password and retains AES-256/R6 metadata; its selected path/hash are
  verified without adding an optional crypto dependency. Core owns password and
  decryption roundtrips.
- Native readers verify saved-run v2, selected CSV hashes/revision/source-row joins,
  keyed observed/effective findings and compact saved-evidence identity/pages/QR.
  The no-PDF row remains accounted for; acknowledgment/revocation/valid refresh
  and immutable prior CSV/bundle generations across hold/release pass after
  authored inputs are removed.
- The external QR matrix passed 24 English/French authored PDF exports with
  independently decoded destinations, UTF-8 ECI and PDF links, plus four unsafe
  mask rejections. Module/corner shapes, colored finders/alignment, SVG, CMYK,
  Unicode and valid logo/mask cases are covered. Representative previews were
  visually inspected.
- Astra's bounded integrated review found no consequential blocker in pin
  alignment, validated geometry/source identity or native handoff readers.

The envelope guide now follows validated top-level component geometry committed
with its displayed pages, including the measured page. Missing/unverified
replacement evidence clears the overlay. A pre-existing startup error discovered
by draft tests was corrected: findings can render storage/recovery messages
before compiler construction. Existing second-tab, unavailable-storage and
incompatible-draft browser cases pass without weakening assertion timeouts.

Studio's manual now describes the native run-wide CSV pair and keeps production
review outside the editor. Full authored bytes, editable project settings, draft
recovery and native-only extracted-project setup remain intact. Extreme authored
content can still require layout adjustments; no claim is made that arbitrary
long content fits. These are local checks, not execution of the remote manual
workflow. No push, merge or publication occurred.
