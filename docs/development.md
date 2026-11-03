# Build and contribute

Studio is the browser workspace for developing ImmuKnow templates. This guide
is for contributors building the application. For everyday use, start with
[Get started](getting-started.md); no development setup is needed for the hosted
application.

## Choose the right repository

Change the editor, browser previews, drafts, imports, exports, fictional examples
and this manual here. Change the native pipeline, schemas, reference
configuration and shared Typst components in [ImmuKnow](https://github.com/WDGPH/ImmuKnow).
Change starter letters, Settings, translations, example branding, project
configuration and native helper scripts in
[ImmuKnow Template](https://github.com/WDGPH/ImmuKnow-Template), then refresh
its pinned resource dependency here. Core ships no starter letters.
Change the shared documentation presentation and catalogue in
[WDGPH/docs](https://github.com/WDGPH/docs).

Read `AGENTS.md` before contributing. Use fictional data and public assets, make
small changes, and include the checks and any remaining limits in your PR.

## Core dependency

Studio installs Core from reviewed commit `499dd2a2a04e6d621e3720a4f0fe618727cf1bd5`
of <https://github.com/WDGPH/ImmuKnow>. `pyproject.toml` and `uv.lock` pin that
revision. It supplies the shared components and native behavior used by
previews and downloaded projects. Starter content comes from the separate
Template resource package.
A local Core checkout is not required.

To adopt a different Core revision, update `rev` in `pyproject.toml`, then:

```bash
uv lock --upgrade-package immuknow
uv sync --locked
npm run prepare:assets
```

The authored clients live in `examples/scenarios.json`. Dev startup and builds
prepare their preview facts with the locked Core package. After changing Core or
example inputs, review the regenerated previews and downloaded samples.

To select a published Core tag instead, use
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

To rebuild against the configured Core reference, open **Actions → Studio Pages
→ Run workflow**, select `main`, and leave **refresh_core** enabled (the default).
The workflow runs `uv lock --upgrade-package immuknow` before installing and
building. This resolves the Git reference configured in `pyproject.toml`;
currently it is Core commit `499dd2a2a04e6d621e3720a4f0fe618727cf1bd5`. A configured tag or revision stays
at that reference. The workflow regenerates example facts and checks resource
compatibility; a failed required check prevents deployment. Enable
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
sources. A cold cache requires a source build with a prebuilt, checksum-verified
wasm-bindgen CLI. Compiler pins, patches or preparation-script changes invalidate
the cache; GitHub may also evict it.
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

After the initial compiler preparation, `npm run dev` and `npm run build`
regenerate the examples, fonts, notices and browser validators automatically.
The Studio SHA and latest reachable version tag are embedded during that build.
The footer displays only **ImmuKnow Studio** and its tag or short SHA. Actions supplies `IMMUKNOW_STUDIO_BUILD_SHA` and
`IMMUKNOW_STUDIO_BUILD_TAG`; local builds read Git directly. The targeted
ImmuKnow revision comes from the prepared Core resources.
For example, an exact v0.1.0 release shows `v0.1.0`; later commits show
`v0.1.0+`. Before the first
version tag, only the Studio SHA is shown.
Restart `npm run dev` after Core or example inputs change, or run
`npm run prepare:assets` to refresh the project data without restarting the server.
Type and unit commands also refresh the Core resource copies and validators.
Generated browser assets stay under `public/generated/` and `generated/`;
none are committed.

Python dependency groups separate the usual build and lint tools (`dev`),
browser/native comparison tools (`browser`), and documentation tools (`docs`).
Ordinary site builds do not need the `browser` group. The full Python type
check includes browser helpers and installs that group explicitly.
`npm run test:browser` also installs its locked Python tools automatically.
Ajv and Ajv Formats are npm runtime dependencies because generated browser
validators include their helper code. Their licences stay in the site notices.

## Run locally

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Open <http://localhost:5173/>. Startup checks the prepared compiler and renderer,
regenerates the current example data and starts hot reload. It does not build Rust
or download a compiler automatically.
To serve the production artifact instead, run `npm run serve` and open
<http://localhost:4173/>. Relative production URLs also support a proxy prefix.

For a stripping notebook proxy, set `IMMUKNOW_DEV_PROXY_BASE` to the full path
with leading/trailing slashes and set
`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` to the proxy hostname when starting dev.
To see updated starters instead of a saved draft, export work you want to keep,
choose **Project → Reset workspace… → Saved draft only** in Studio, confirm,
then reload.

## Checks

Install Git hooks once per clone with `uv run --locked prek install`. The hooks
lint and format Python with Ruff; CI checks the same rules without rewriting
files. Run them
manually with `uv run --locked prek run --all-files`. The hooks run the Ruff version
locked by the project. Change and check Template-owned Python helpers in Template.

Install native Typst 0.15.1 for native/browser comparisons. The Playwright
configuration makes native test subprocesses use the same verified fonts in
`assets/fonts` as the browser, ignoring system fonts. This keeps comparisons
independent of the runner's font package; production Core uses system
fonts. Set `TYPST_BIN` if Typst is outside PATH. Install Playwright's full
Chromium browser and its system dependencies for the encrypted PDF reader tests.

```bash
uv run --locked --group browser ty check
uv run --locked ruff check --no-fix .
uv run --locked ruff format --check .
uv run --locked python -m unittest discover -s tests -p 'test_*.py'
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
Downloaded-project checks install the ZIP's locked environment outside either checkout
and run its Template helpers and Core engine. Four cases cover a customized
English notice through both selectors, long French output, saved-run review
for a French notice with warnings, and a guardian-directed suspension order for
an older student. Template's maintainer tests run in its own
repository; fresh downloads contain the user-facing setup and sample check.
PDF reader checks use Studio's own example inputs.

When adding or updating example clients, aim for plausible records that help
people develop notice wording and layout. Use complete contact details,
consistent dates and notices that match the supplied facts. Keep deliberately
incomplete or conflicting data in separate test fixtures. Core owns tests of
native validation and delivery decisions.

Core maintains its separate native test fixtures. Studio's contract cases under
`unit/fixtures/` are a local snapshot, not imports from Core's test package.

## Test scope and Actions minutes

Follow the [shared testing strategy](https://github.com/WDGPH/ImmuKnow/blob/main/docs/developer_guide/testing.md#testing-across-the-projects).
Core tests native input rules, validation, notice families and delivery. Studio
tests the browser and the handoff from an authored project to native output.
The same contract cases run against the Python and browser validators because
each implementation needs to accept and reject the right data.

Pull requests and main builds run the site build, type checks, lint and unit
tests. The full browser/native suite is deliberately manual to conserve GitHub
Actions minutes. Select **full_tests** in the **Studio Pages** manual workflow to
run it. Ordinary deployment does not require that manual run. Build summaries
record whether it ran, so a successful ordinary build should not be described
as a browser/native test pass.

Run relevant browser checks locally for editor, draft, import or download
changes. Run the full suite for Core/compiler updates, changes to shared
contracts and release preparation. Keep the manual workflow available for those
checks when local tools are unavailable.

The download cases cover three different handoff risks: custom source and both
notice selectors; long French output; and saved-run review with warning findings.
Core covers other notice families. The project sample command runs once in the
customized English case, while the other cases compare their own native output.
Template helper unit tests are not repeated in Studio. Add another expensive
case only when it protects a boundary these checks do not cover.

## Python interface boundary

Studio uses Core's supported `immuknow.resources.resource_root()` and
`rendering_build_info()` for packaged resources and their identity, and
`immuknow.orchestrator.run_pipeline()` for complete native runs.
`scripts/examples.py` calls internal preparation functions against the
locked Core commit. Those calls intentionally stay internal; dependency updates
must pass example preparation and native/browser checks.

Core resources are copied into disposable `generated/core/` for browser builds.
Edit engine components in Core, starter content in Template, or the open
authored project. Never edit the installed package or generated copy. Builds and
imports check shared library file integrity.

## Update the project template

The starter project comes from the `immuknow-template-resources` distribution
built in ImmuKnow-Template's `package/` subdirectory. It packages the authored
allowlist, original hashes and source identity. The shared Typst library is
excluded and continues to come from Core. Studio commits only the dependency
pin and lock, with no copied scaffold under `assets/`.

After a Template change, update `immuknow-template-resources.rev` in
`pyproject.toml` to its full reviewed commit SHA, then:

```bash
uv lock --upgrade-package immuknow-template-resources
uv sync --locked
uv run --locked python -m scripts.project_template
npm run prepare:assets
```

A Core upgrade also requires a Template revision whose project lock selects
that Core commit. `scripts.project_template` verifies the installed package and
compatibility; it no longer refreshes files from a separate checkout. Never edit
installed resources. Root Template setup stays separate from its distribution
metadata, so downloaded projects install Core without a Template dependency.

Core and Template are public repositories, so dependency installation needs no
GitHub credentials. Dependencies stay locked and installed; ordinary builds
perform no ad hoc upstream fetches.

Run the browser/native downloaded-project checks after either dependency changes
to verify clean installation, setup, the sample, both native selectors and
saved-run rebundling. Template maintains its resource-wheel/source-archive and
helper tests in its own repository.
