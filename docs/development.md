# Build and contribute

Studio is the browser workspace for developing ImmuKnow templates. This guide
is for contributors building the application. For everyday use, start with
[Get started](getting-started.md); no development setup is needed for the hosted
application.

## Choose the right repository

Change the editor, browser previews, drafts, imports, exports, example presentation
and this manual here. Change the native pipeline, schemas and shared Typst
components in [ImmuKnow](https://docs.phiz.ca/immuknow/latest/). Change starter
letters, Settings, translations, example branding, project configuration,
reference lists and native project instructions in
[ImmuKnow Template](https://github.com/WDGPH/ImmuKnow-Template/blob/main/README.md), then refresh
its pinned resource dependency here. ImmuKnow ships no starter letters.
Change the shared documentation presentation and catalogue in
[WDGPH/docs](https://github.com/WDGPH/docs).

Read `AGENTS.md` before contributing. Use fictional data and public assets, make
small changes, and include the checks and any remaining limits in your PR.

## ImmuKnow dependency

`immuknow-revision.txt` pins standalone Rust ImmuKnow. Template's packaged
`immuknow-revision.txt` must match. `pyproject.toml` and `uv.lock` pin Template's
resource package and Python build tools, with no Python ImmuKnow dependency.

The [initial build](#install-and-build) installs the exact clean ImmuKnow source
recorded in that pin.

The installer builds the recorded commit and stores the executable, source
revision, Typst version and binary fingerprint under ignored `.immuknow/`.
Build commands verify those bytes; `immuknow --version` alone is not source
provenance. For a matching clean local checkout, add `--source /path/to/ImmuKnow`.
Only installation fetches/builds ImmuKnow; ordinary preparation uses the verified
local executable and public `prepare` and `resources` commands.

For dependency changes, follow [Update the project template](#update-the-project-template).
Browser compiler pins are separate; shared-resource updates do not require
rebuilding an unchanged browser compiler.

Template owns the fictional client CSV. Studio's `examples/previews.json` supplies
IDs and descriptions. Builds generate facts without changing clients to
fit a notice.

## GitHub Pages and dependency updates

The **Studio Pages** workflow builds and checks pull requests and pushes to
`main`. Successful builds on `main` deploy `dist/` through GitHub Pages after
the site build, Python checks, frontend type checks, lint and unit tests pass.
Playwright and native export tests run only when **full_tests** is selected
in a manual run; routine builds do not install Chromium or native Typst.
A passing routine build does not establish browser/native rendering parity.
Configure the Studio repository’s Pages source as
**Settings → Pages → Build and deployment → Source → GitHub Actions**. GitHub documents the required Pages configuration and
deployment permissions in its [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The manual **refresh_immuknow** option rebuilds the exact recorded native ImmuKnow
commit instead of reusing its verified cache. It does not change pins or the
lockfile. **full_tests** enables the browser/native suite; those checks must pass
before a selected main build deploys. Other branches perform checks without
deploying. Ordinary pull requests retain the existing cheaper check policy.

The run summary records ImmuKnow and Studio revisions. The **build-inputs** artifact
retains the effective lock, pins, native executable fingerprint and generated
build identity for 30 days. ImmuKnow and browser binaries use separate caches;
source revision and binary hashes are checked before reuse.

Compiler and renderer binaries, build metadata and Rust licence notices are
cached together and verified against their input fingerprints and file hashes.
The cache is saved immediately after preparation, before the site and test
checks. Ordinary UI, npm and ImmuKnow updates reuse it without Rust or compiler
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

Use Linux, Python 3.11 or later, uv, Node.js 24 or later and npm. The native
ImmuKnow build requires Rust 1.100 or later; install that toolchain with rustup.
Browser compiler builds separately need Git, Bash 4+, GNU sha256sum,
Rust/rustup, a native compiler/linker, pkg-config and OpenSSL development
headers. Browser pins are in `compiler-pins.json`:

```bash
rustup toolchain install 1.100.0 --profile minimal
rustup toolchain install 1.92.0 --profile minimal
cargo +1.92.0 install --locked wasm-bindgen-cli --version 0.2.118
uv sync --locked
uv run --locked python -m scripts.immuknow install
npm ci
npm run build:site
```

The build verifies or builds the pinned compiler and renderer, retains license
notices, prepares examples and fonts, generates validators from exported ImmuKnow
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
ImmuKnow revision comes from the verified ImmuKnow build and exported resources.
For example, an exact v0.1.0 release shows `v0.1.0`; later commits show
`v0.1.0+`. Before the first
version tag, only the Studio SHA is shown.
Restart `npm run dev` after ImmuKnow or example inputs change, or run
`npm run prepare:assets` to refresh the project data without restarting the server.
Type and unit commands also refresh the ImmuKnow resource copies and validators.
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
locked by the project. Change and check Template-owned packaging and checks in Template.

Install native Typst 0.15.1 for native/browser comparisons. The Playwright
configuration makes native test subprocesses use the same verified fonts in
`assets/fonts` as the browser, ignoring both system and embedded fallback fonts. This keeps comparisons
independent of the runner's font package; production ImmuKnow uses system
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
Downloaded-project checks extract the ZIP outside either checkout and run the
ImmuKnow executable directly with an empty command search path. They install no
Python environment or tools into the project. Python stays in the test harness
for PDF and QR inspection. Four cases cover a customized
English notice through single-template selection, long French output, saved-run review
for a French notice with warnings, and a guardian-directed suspension order for
a younger student. Template's maintainer tests run in its own
repository; fresh downloads contain native setup instructions and sample selections.
PDF reader checks use Studio's own example inputs.

Add or update example clients in Template. Aim for plausible records that help
people develop notice wording and layout. Use complete contact details,
consistent dates and notices that match the supplied facts. Keep deliberately
incomplete or conflicting data in separate test fixtures. ImmuKnow owns tests of
native validation and delivery decisions.

ImmuKnow maintains its separate native test fixtures. Studio's contract cases under
`unit/fixtures/` are a local snapshot, not imports from ImmuKnow's test package.

## Test scope and Actions minutes

Follow the [shared testing strategy](https://docs.phiz.ca/immuknow/latest/developer_guide/testing/#test-ownership-and-execution).
ImmuKnow tests native input rules, validation, notice families and delivery. Studio
tests the browser and the handoff from an authored project to native output.
The same contract cases run against the ImmuKnow and browser validators because
each implementation needs to accept and reject the right data.

Pull requests and main builds run the site build, type checks, lint and unit
tests. The full browser/native suite is deliberately manual to conserve GitHub
Actions minutes. Select **full_tests** in the **Studio Pages** manual workflow to
run it. Ordinary deployment does not require that manual run. Build summaries
record whether it ran, so a successful ordinary build should not be described
as a browser/native test pass.

Run relevant browser checks locally for editor, draft, import or download
changes. Run the full suite for ImmuKnow/compiler updates, changes to shared
contracts and release preparation. Keep the manual workflow available for those
checks when local tools are unavailable.

Downloaded-project tests cover representative native handoffs; ImmuKnow owns the
full persistence, input validation and encryption suites. Add an expensive
browser/native case when it protects an uncovered Studio boundary.

## Native interface boundary

`scripts/immuknow.py` owns executable installation, fingerprint verification
and public command calls. `prepare` returns row identity, facts and checks;
`resources` supplies unversioned `rendering.json`, `report.json`, the shared
library and its manifest. Build identity combines the verified source-build
record with those exported hashes and independent browser compiler pins.

Installed Template resources stay read-only. Copies belong in disposable
`generated/immuknow/`, browser output or downloaded projects. ImmuKnow owns validation;
Studio owns its browser validator and native handoff regressions. Browser reports
use render-report v4 with component geometry. Native saved-report contracts are
documented in [ImmuKnow's review guide](https://docs.phiz.ca/immuknow/latest/user_guide/pdf_validation/).

## Update the project template

Studio consumes the maintained `immuknow-template-resources` package. Its
[contributor guide](https://github.com/WDGPH/ImmuKnow-Template/blob/main/CONTRIBUTING.md)
owns packaging and Template verification. Studio copies the installed resources
before editing and gets the complete shared library from ImmuKnow.

For a ImmuKnow upgrade, first update and test Template against the intended clean
ImmuKnow commit. Update Studio's `immuknow-revision.txt` and Template pin together,
then reinstall the native executable with
`uv run --locked python -m scripts.immuknow install`.
After a Template change, update `immuknow-template-resources.rev` in
`pyproject.toml` to its full reviewed commit SHA, then:

```bash
uv lock --upgrade-package immuknow-template-resources
uv sync --locked
uv run --locked python -m scripts.project_template
npm run prepare:assets
```

A ImmuKnow upgrade also requires a Template revision whose immuknow-revision.txt selects
that ImmuKnow commit. `scripts.project_template` checks ImmuKnow compatibility and
Git source provenance from the installed package.
Never edit installed resources. The resource package excludes Python helpers,
Python environment files and maintainer tests from the exported scaffold.
Downloaded projects use native project commands; their standalone executable
is supplied separately. Python remains a Studio build/test/documentation
dependency, and is not required for production notice generation.

ImmuKnow and Template are public repositories, so dependency installation needs no
GitHub credentials. Dependencies stay locked and installed; ordinary builds
perform no ad hoc upstream fetches.

After either dependency changes, verify browser rendering, drafts and project
downloads. Run the browser/native downloaded-project checks to verify native
setup, the sample, both notice selectors and saved-run rebundling. Template maintains its resource-wheel/source-archive and
presentation and packaging tests in its own repository.
