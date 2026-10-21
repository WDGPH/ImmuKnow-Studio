# Build and contribute

Studio is the browser workspace for developing ImmuKnow templates. This guide
is for contributors building the application. For everyday use, start with
[Get started](getting-started.md); no development setup is needed for the hosted
application.

## Choose the right repository

Change the editor, browser previews, drafts, imports, exports, fictional examples
and this manual here. Change the native pipeline, schemas, default templates,
configuration and shared Typst components in [ImmuKnow](https://github.com/WDGPH/ImmuKnow).
Change the shared documentation presentation and catalogue in
[WDGPH/docs](https://github.com/WDGPH/docs).

Read `AGENTS.md` before contributing. Use fictional data and public assets, make
small changes, and include the checks and any remaining limits in your PR.

## Core dependency

Studio installs Core from the `main` branch of
<https://github.com/WDGPH/ImmuKnow>. `pyproject.toml` selects the branch and
`uv.lock` records the exact commit. A local Core checkout is not required.

After committing and pushing a Core change, deliberately adopt it in Studio:

```bash
uv lock --upgrade-package immuknow
uv sync --locked
npm run prepare:assets
```

Preparation checks the committed example facts. If Core intentionally changes
those facts, regenerate and review `examples/prepared.json` instead:

```bash
uv run --locked python -m scripts.examples
```

The current locked commit is also tagged `v2.0.0` in Core. Studio selects
`main` so deliberate dependency refreshes follow that branch. To select a
published Core tag instead, use
`uv add git+https://github.com/WDGPH/ImmuKnow.git --tag <core-tag>`.
Commit both dependency files and run the checks before releasing. Core and
Studio provenance are recorded separately; compatibility continues to compare
resource bytes and formats with the pinned compiler identity.

## GitHub Pages and dependency updates

The **Studio Pages** workflow builds and checks pull requests and pushes to
`main`. Successful builds on `main` deploy `dist/` through GitHub Pages after
the site build, Python checks, frontend type checks, lint and unit tests pass.
Playwright and native export tests run only when **full_tests** is selected
in a manual run; routine builds do not install Chromium or native Typst.
A passing routine build does not establish browser/native rendering parity.
After pushing this workflow, select
**Settings → Pages → Build and deployment → Source → GitHub Actions** in the
Studio repository. GitHub documents the required Pages configuration and
deployment permissions in its [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

To deploy against the latest Core branch commit, open **Actions → Studio Pages
→ Run workflow**, select `main`, and leave **refresh_core** enabled (the default).
The workflow runs `uv lock --upgrade-package immuknow` before installing and
building. This resolves the Git reference configured in `pyproject.toml`;
currently it is Core's `main` branch. A configured tag or revision stays
at that reference. The workflow still checks the committed example facts and
resource compatibility; a failed required check prevents deployment. Enable
**full_tests** when validating a Core upgrade or a change to rendering or exports.
If selected, those tests must also pass before deployment.

The run summary records the exact Core and Studio commits. The **build-inputs**
artifact retains the effective `uv.lock`, package declarations, compiler pins
and generated build identity for 30 days. A manual refresh applies to that run;
it does not commit the updated lockfile. Ordinary pushes and pull requests use
the committed pin. To make a new pin the default for subsequent builds, update
and commit `uv.lock` using the commands above. Disable **refresh_core** to run
the manual workflow with the committed pin. Manually running another Studio
branch performs checks without deploying Pages.

Compiler and renderer binaries, build metadata and Rust licence notices are
cached together and verified against their input fingerprints and file hashes.
The cache is saved immediately after preparation, before the site and test
checks. Ordinary UI, npm and Core updates reuse it without Rust or compiler
sources. A cold cache still needs the expensive source build, but uses a
prebuilt, checksum-verified wasm-bindgen CLI. Compiler pins, patches or
preparation-script changes invalidate the cache; GitHub may also evict it.
Only prepared outputs are cached, rather than the compiler checkout and Cargo
target directory.

Dependabot checks npm, uv and GitHub Actions dependencies every Monday at
09:00 UTC. Version updates are grouped by ecosystem and have a seven-day
cooldown. Review and merge the resulting pull requests through the same checks.
Browser compiler/renderer source revisions and Rust/bindgen pins in
`compiler-pins.json` are maintained explicitly with their patches and checks.

## Install and build

Use Linux, Python 3.11 or later, uv, Node.js 24 or later and npm. Browser
compiler builds also need Git, Bash 4+, GNU sha256sum, Rust/rustup, a native
compiler/linker, pkg-config and OpenSSL development headers. Pins are in
`compiler-pins.json`:

```bash
rustup toolchain install 1.92.0 --profile minimal
cargo +1.92.0 install --locked wasm-bindgen-cli --version 0.2.118
uv sync --locked
npm ci
npm run build:site
```

The build verifies or builds the pinned compiler and renderer, retains license
notices, prepares examples and fonts, generates validators from installed Core
schemas, and writes `dist/`. It does not build the manual or publish. Documentation has its own
[build instructions](documentation.md#check-a-documentation-change).
The first compiler build takes longer. Subsequent `build:site` runs verify and
reuse the prepared binaries and Rust notices without invoking Cargo or needing
the compiler checkout. npm notices are regenerated for every build. CI uses
`npm run build:site -- --require-prepared-toolchain` to forbid an unexpected
source rebuild after the cache preparation step.
Use `--compiler-source /path/to/typst.ts` with
`uv run --locked python -m scripts.build-site` to reuse a source checkout,
or set `IMMUKNOW_COMPILER_BUILD_DIR`.

After initial preparation, use `npm run build` to rebuild frontend changes.
The footer's Studio SHA and latest reachable version tag are embedded during that
build. Actions supplies `IMMUKNOW_STUDIO_BUILD_SHA` and
`IMMUKNOW_STUDIO_BUILD_TAG`; local builds read Git directly. The targeted
ImmuKnow revision comes from the prepared Core resources.
For example, an exact v0.1.0 release shows `v0.1.0`; later commits show
`v0.1.0+`. Before the first
version tag, only the Studio SHA is shown.
Re-run `npm run prepare:assets` after Core or example inputs change. npm's dev,
build, type and unit commands refresh the generated Core resource copies and
validators automatically. No generated browser assets are committed.

## Run locally

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Open <http://localhost:5173/>. This checks prepared assets and starts hot reload.
To serve the production artifact instead, run `npm run serve` and open
<http://localhost:4173/>. Relative production URLs also support a proxy prefix.

For a stripping notebook proxy, set `IMMUKNOW_DEV_PROXY_BASE` to the full path
with leading/trailing slashes and set
`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` to the proxy hostname when starting dev.
To see updated starters instead of a saved draft, export work you want to keep,
clear the saved draft in Studio, then reload.

## Checks

Install native Typst 0.15.1 for native/browser comparisons. The Playwright
configuration makes native test subprocesses use the same verified fonts in
`assets/fonts` as the browser, ignoring system fonts. This keeps comparisons
independent of the runner's font package; production Core still uses system
fonts. Set `TYPST_BIN` if Typst is outside PATH. Install Playwright's full
Chromium browser and its system dependencies for the encrypted PDF reader tests.

```bash
uv run --locked ty check
uv run --locked ruff check --no-fix .
uv run --locked ruff format --check .
npm run typecheck
npm run lint
npm run test:unit
npm run build:site
npx playwright install --with-deps chromium
npm run test:browser
```

Browser checks serve `dist/` at the root. Set `IMMUKNOW_BASE_URL` to test an
already served artifact, including any proxy prefix and trailing slash. Do not
rebuild an artifact while it is being tested. Evidence stays in `test-results/`.
Downloaded-project checks run the installed Core engine outside either checkout
through both notice selectors. PDF reader checks use Studio's own example inputs.
Core maintains its separate native test fixtures. Studio's contract cases under
`unit/fixtures/` are a local snapshot, not imports from Core's test package.

## Python interface boundary

Studio uses Core's supported `immuknow.resources.resource_root()` and
`rendering_build_info()` for packaged resources and their identity, and
`immuknow.orchestrator.run_pipeline()` for complete native runs.
`scripts/examples.py` still calls internal preparation functions against the
locked Core commit. Those calls intentionally stay internal; dependency updates
must pass example preparation and native/browser checks. A broader preparation
API is not required for this extraction.

Core resources are copied into disposable `generated/core/` for browser builds.
Edits belong in Core or the open authored project, never the installed package
or generated copy. Shared library files retain their existing integrity checks.
