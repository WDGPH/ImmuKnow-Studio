# Example notices

These fictional clients help you develop notice wording and layout. They include
short and long histories, English/French notices, an up-to-date notice and a
suspension order. An older student has an explicit `intended_reader=guardian` choice,
which keeps their age facts and directs ordinary and suspension wording to a
guardian. They contain no real client information and do not describe a
vaccination schedule.

`scenarios.json` owns one source record per client, the maintained notice
filenames and fixed dates. Every client is available in every supplied notice,
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
`scenarios.json` and the locked Core package are its inputs. The project JSON
contains unchanged native Typst/project files and verified SHA-256 hashes. All supported native
preview fonts are web assets copied separately to `generated/fonts/`; the JSON embeds
only their catalogs and license metadata. The generated `build.json` identifies
the shared native resources and Studio compiler; native package build details
remain separate.

Each example's `inputs` maps an entry basename to the exact source CSV and
assignment file included in the project. Each client has one CSV shared by
all notices, with a separate assignment file for each notice. Those files
reproduce the selected preview through either native selector. With ImmuKnow installed, run
from the generated/exported project root:

```bash
immuknow examples/clients/short.csv --config config \
  --template templates/overdue_diseases_v1.en.typ --output runs
immuknow examples/clients/short.csv --config config \
  --notice-assignments examples/assignments/short.overdue_agents_v1.fr.json \
  --templates templates --output runs
immuknow examples/clients/source-warnings.csv --config config \
  --notice-assignments examples/assignments/source-warnings.overdue_diseases_v1.en.json \
  --templates templates --output runs
```

The no-records client previews the bilingual request for records. The 2009/2010
varicella clients demonstrate the ISPA birth-year boundary. Some clients include
a fictional OIID with leading zeros; enable `show-oiid` in Settings to show it.
Each downloaded client CSV is a one-client cohort, so enabling OIID display for
a client without an OIID raises the all-absent error. In a production mixed
cohort, `missing-oiid` controls omitted, blank or unavailable text.

Warning clients retain source findings such as an absent birth date. Their
history entries all have validity flags, so the default validity display remains
usable. Combining examples creates a different input cohort. The long-history example intentionally permits reviewers to
see content continuation and findings. The suspension example has valid source
history but places no history component or display checks.

Preview facts are fixed for each generated build. Edit `scenarios.json` and
restart the dev server or rebuild to change them. Edit the native Settings file
to change presentation. Production source preparation, assessment responsibilities
and delivery behavior are explained in the package guides.
