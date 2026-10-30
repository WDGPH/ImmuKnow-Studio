# Documentation and releases

## Where documentation belongs

Studio owns its manual in this repository's `docs/`, its navigation in
`mkdocs.yml`, and its locked documentation dependencies in `pyproject.toml` and
`uv.lock`. Change these alongside the behavior they explain.

The [WDGPH/docs repository](https://github.com/WDGPH/docs) owns the shared PHIZ
presentation, project catalogue, release registry, search and one documentation
deployment at [docs.phiz.ca](https://docs.phiz.ca/). It builds each manual from
the source repository at the selected commit. Do not copy Studio's Markdown or
generated HTML into that repository.

Studio's application continues to be built and hosted by its **Studio Pages**
workflow. Documentation builds do not build the browser compiler, run the
application build or deploy the application.

## Write for readers

Explain the action and its result in plain language. Use the exact labels shown
in Studio and keep step-by-step user guidance separate from build instructions.
Explain technical terms where readers first need them. Use fictional records and
public assets in examples. Follow the [shared language and project responsibilities](https://github.com/WDGPH/ImmuKnow/blob/main/docs/developer_guide/documentation.md#shared-language-and-project-responsibilities).

Keep the relationship to Core explicit: Studio develops templates; local
ImmuKnow runs generate production notices. Link to Core's manual for input
validation, the facts contract and delivery review instead of duplicating it.
Keep Core’s configured Git reference and exact locked commit distinct from its
release tags.

## Check a documentation change

```bash
uv sync --locked --no-default-groups --group docs
uv run --locked --no-default-groups --group docs mkdocs build --strict
uv run --locked --no-default-groups --group docs mkdocs serve
```

Open the local address printed by MkDocs. Check navigation, links, commands and
rendered tables. The **Studio documentation** workflow runs the strict build on
pull requests and main pushes and retains the output for review. The local
Material preview checks source rendering; the hub supplies the public theme and
search.

For a shared-theme preview after Studio is registered, follow the
[hub's local source preview instructions](https://github.com/WDGPH/docs#preview-local-project-branches).
Supply `--source immuknow-studio=/path/to/ImmuKnow-Studio` to its preview build.
Stage new source files first so the snapshot includes them. Preview output stays
local and is never a publication artifact.

## Register and publish the manual

Register `WDGPH/ImmuKnow-Studio` with slug `immuknow-studio`, the `uv` adapter,
`mkdocs.yml` and `docs/` in the hub's `projects.json`. Add its release state to
`versions.lock.json` at the same time. Merge the source documentation before
the hub registration so a production build can find the configuration on main.
Run the hub's full build and browser checks before publication.

Before Studio's first tagged release, register no current release and no release
commit. The development manual is `/immuknow-studio/latest/`; project and stable
aliases lead there until a documented release is imported. Preparing this manual
for v0.1.0 does not create that tag.

After the reviewed v0.1.0 source is tagged, the hub's release refresh resolves
the tag to its actual commit and proposes the release-lock change. Review and
build that change before merging. The tagged manual belongs at
`/immuknow-studio/v0.1.0/`. Do not fill an earlier release with documentation from
a later commit.

The optional `docs-hub-notify.yml` workflow follows the hub's notification
contract. To enable it after registration, configure `DOCS_HUB_TRIGGER_TOKEN`
and `DOCS_HUB_NOTIFY_ENABLED` according to the
[hub's credential instructions](https://github.com/WDGPH/docs/blob/main/docs/source-projects.md#notification-credentials).
It requests a hub rebuild for main changes and a reviewed release refresh for
tag changes. It sends no generated HTML and is disabled until configured.

## Prepare Studio v0.1.0

Review the user journey from first edit through downloaded project and local
native run. Run the application checks in [Build and contribute](development.md)
and the strict documentation build. Verify the actual Core pin and the compiler
identity; selecting a Core release tag remains a separate dependency change
that must pass those checks. Keep package versions, release tag and release
description consistent, and record completed checks in the reviewing PR.
