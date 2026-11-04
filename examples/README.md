# Example notices

These six fictional clients help you develop notice wording and layout. They
include short and long histories, English/French notices, an up-to-date notice
and a suspension order. An older student has an explicit
`intended_reader=guardian` choice, which keeps their age facts and directs
ordinary and suspension wording to a guardian. They contain no real client information and do not describe a
vaccination schedule.

[Template owns the fictional client CSV](https://github.com/WDGPH/ImmuKnow-Template/blob/main/input/sample/sample_students.csv).
`previews.json` selects its clients and records the Studio preview descriptions,
notice filenames and fixed dates. Its stable IDs keep the same person selected
when switching notices or reopening a draft. Every client is available in every supplied notice,
with the same name and facts in either language. The collection includes clients
with English and French names. History dates use Core's `YYYY-MM-DD` input format.

Dev startup and production builds generate preview facts through Core's source
preparation and notice assignment checks. Warnings remain beside each view,
including when the supplied facts do not fit the chosen notice. The affirmative
starter errors for overdue diseases; the suspension starter errors when no
birth-cohort ISPA disease is overdue. Select a suitable client or customize the
notice deliberately. Studio does not change facts to make them fit.

```bash
npm run prepare:assets
```

The generated bundle is `public/generated/project.json`. It is not committed;
`previews.json` and the locked Core and Template packages are its inputs. The project JSON
contains unchanged native Typst/project files and verified SHA-256 hashes. All
supported native preview fonts are web assets copied separately to
`generated/fonts/`; the JSON embeds only their catalogs and license metadata. The generated `build.json` identifies
the shared native resources and Studio compiler; native package build details
remain separate.

When you download a project with **Include fictional client data** checked,
Studio includes all six fictional clients, their notice assignments and the
notices needed for a local sample run. An imported project with its own sample
selection keeps that selection. After installing the project, run:

```bash
uv run python scripts/check.py --sample
uv run python scripts/run.py --sample
```

The no-records client previews the bilingual request for records or a suspension
notice. One client includes a fictional OIID with leading zeros; enable
`show-oiid` in Settings to show it. The longer history supports layout review;
the suspension notice places no history component.

Preview facts are fixed for each generated build. Update the example CSV in Template
and the pinned Template revision here to change client facts, then restart the dev
server or rebuild. Edit the native Settings file
to change presentation. Production source preparation, assessment responsibilities
and delivery behavior are explained in the package guides.
