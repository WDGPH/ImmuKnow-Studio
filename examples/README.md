# Example notices

These fictional clients help you develop notice wording and layout. They include
short and long histories, English/French notices, an up-to-date notice and a
suspension order. They contain no real client information and do not describe a
vaccination schedule.

`scenarios.json` owns one source record per client, the maintained notice
filenames and fixed dates. Every client is available in every supplied notice,
with the same name and facts in either language. The older French-name examples
are also available as individual choices. History dates use Core's `YYYY-MM-DD`
input format.

`prepared.json` is generated through Core's source preparation and notice
assignment checks. Warnings remain beside each view, including when the supplied
facts do not fit the chosen notice. Studio does not change facts to make them fit.

```bash
uv run --locked python -m scripts.examples
uv run --locked python -m scripts.examples --check
```

`--check` rejects stale committed facts and still assembles ignored browser
assets under `public/generated/`. The project JSON contains unchanged
native Typst/project files and verified SHA-256 hashes. All supported native
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
  --notice-assignments examples/assignments/source-warnings.affirmative_schedule_v1.en.json \
  --templates templates --output runs
```

Keep the warning source alone when reproducing its preview: validity coverage
is measured over the complete input cohort, so combining scenarios creates a
different cohort. The long-history example intentionally permits reviewers to
see content continuation and findings. The suspension example has valid source
history but places no history component or display checks.

Browser fixtures are fixed prepared facts. Edit `scenarios.json` and regenerate
to change them; edit the native Settings file to change presentation. Production
source preparation, assessment responsibilities and delivery behavior are
explained in the package guides.
