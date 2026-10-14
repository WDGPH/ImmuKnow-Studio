# ImmuKnow Studio

Edit ImmuKnow notice templates, Settings and Theme with live browser previews
of fictional examples. Download the complete authored Typst project for use
with the separately installed ImmuKnow native engine. See the
[Studio guide](docs/studio.md) for editing, drafts and exports.

Studio owns its UI, browser compiler, fonts, example scenarios and tests.
Core owns the Python pipeline, schemas, default notices, configuration and
shared Typst components. Core is a Python build dependency; deployed Studio
is static and needs no Python server.

## Core dependency

Studio installs Core from the `studio-core` branch of
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

For a Studio release, replace the branch with an existing Core tag using
`uv add git+https://github.com/WDGPH/ImmuKnow.git --tag <core-tag>`.
Commit both dependency files and run the checks before releasing. Core and
Studio provenance are recorded separately; compatibility continues to compare
resource bytes and formats with the pinned compiler identity.

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
schemas, and writes `dist/`. It does not build Core documentation or publish.
The first compiler build takes longer; verified cached artifacts are reused.
Use `--compiler-source /path/to/typst.ts` with
`uv run --locked python -m scripts.build-site` to reuse a source checkout,
or set `IMMUKNOW_COMPILER_BUILD_DIR`.

After initial preparation, use `npm run build` to rebuild frontend changes.
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

Install native Typst 0.15.1 and system FreeSans/FreeSerif fonts for native/browser
comparisons. Set `TYPST_BIN` if Typst is outside PATH. Install Playwright's full
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

In this workspace, Chromium's runtime libraries are already extracted locally.
Run browser checks with their library directories when they are not on the
system loader path:

```bash
LD_LIBRARY_PATH=/tmp/immuknow-browser-libs/extracted/lib/x86_64-linux-gnu:/tmp/immuknow-browser-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:browser
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
