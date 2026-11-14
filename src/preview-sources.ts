import { decoder, encoder } from "./project";
import { sourceLocation } from "./source-location";
import { sourceCode } from "./source-text";
import type { Files, Preview, PreviewText, RenderSummary } from "./types";

function callOrigin(files: Files, path: string, names: string[]): PreviewText["origin"] {
  if (!files[path]) return;
  const source = decoder.decode(files[path]);
  const code = sourceCode(source, true);
  const calls = [...code.matchAll(/(?<![\w.-])([\w-]+(?:\.[\w-]+)?)\s*\(/g)].filter((match) =>
    names.includes(match[1]),
  );
  if (calls.length !== 1) return;
  const call = calls[0];
  let end = call.index + call[0].length;
  let depth = 1;
  while (end < code.length && depth) {
    if (code[end] === "(") depth++;
    if (code[end] === ")") depth--;
    end++;
  }
  if (depth) return;
  return {
    path,
    from: encoder.encode(source.slice(0, call.index)).length,
    to: encoder.encode(source.slice(0, end)).length,
  };
}

// Compiler spans remain authoritative for authored text. ImmuKnow's measured client
// boxes and prepared facts supply conservative targets for generated content.
export function previewSources(
  preview: Preview,
  files: Files,
  template: string,
  summary?: RenderSummary,
): Preview {
  if (!summary) return preview;
  const client = callOrigin(files, template, ["immuknow.client-block"]);
  const history = callOrigin(files, template, ["immuknow.immunization-history"]);
  const diseases = callOrigin(files, template, ["immuknow.overdue-diseases"]);
  const agents = callOrigin(files, template, ["immuknow.overdue-agents"]);
  const overdueDiseases = Array.isArray(summary.notice.overdue_diseases)
    ? (summary.notice.overdue_diseases as { disease: string }[])
    : [];
  const overdueAgents = Array.isArray(summary.notice.overdue_agents)
    ? (summary.notice.overdue_agents as string[])
    : [];
  const overdueLabels = new Set(overdueDiseases.map((item) => item.disease));
  const labelPaths = Object.keys(files).filter((path) =>
    path.endsWith(`/${summary.notice.language}_diseases_overdue.json`),
  );
  const authoredLabels = labelPaths.filter((path) => !path.startsWith("templates/lib/"));
  for (const path of authoredLabels.length ? authoredLabels : labelPaths) {
    try {
      const labels = JSON.parse(decoder.decode(files[path]));
      for (const item of overdueDiseases)
        if (typeof labels?.[item.disease] === "string") overdueLabels.add(labels[item.disease]);
    } catch {
      /* Edited translations may be incomplete while the preview is stale. */
    }
  }
  const matches = new Map<string, ReturnType<typeof sourceLocation>>();
  const authored = (text: string) => {
    if (!matches.has(text)) matches.set(text, sourceLocation(files, template, text));
    return matches.get(text);
  };
  const measured = summary.measurements;
  return {
    ...preview,
    pages: preview.pages.map((page, index) => {
      const pageNumber = index + 1;
      const targets: NonNullable<typeof page.targets> = [];
      if (client) {
        for (const measurement of [...(measured.address ?? []), ...(measured.client ?? [])]) {
          const {
            page: number,
            x_pt: x,
            y_pt: y,
            width_pt: width,
            height_pt: height,
          } = measurement;
          if (
            number === pageNumber &&
            [x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n))
          )
            targets.push({
              x: x as number,
              y: y as number,
              width: width as number,
              height: height as number,
              origin: client,
            });
        }
      }
      const historyPage = measured.history?.some(
        (item) =>
          item.page === pageNumber ||
          (typeof item.page === "number" &&
            item.page < pageNumber &&
            measured.section?.some(
              (section) =>
                typeof section.first_page === "number" &&
                typeof section.last_page === "number" &&
                section.first_page <= (item.page as number) &&
                section.last_page >= pageNumber,
            )),
      );
      const heading = measured.section?.find((item) => item.first_page === pageNumber)?.title;
      const headingLocation = typeof heading === "string" ? authored(heading) : undefined;
      const headingOrigin = headingLocation
        ? {
            path: headingLocation.path,
            from: encoder.encode(
              decoder.decode(files[headingLocation.path]).slice(0, headingLocation.from),
            ).length,
            to: encoder.encode(
              decoder.decode(files[headingLocation.path]).slice(0, headingLocation.to),
            ).length,
          }
        : undefined;
      let headingRemaining = typeof heading === "string" ? heading : "";
      return {
        ...page,
        targets,
        text: page.text.map((text) => {
          if (text.origin && !text.origin.path.startsWith("templates/lib/")) return text;
          if (!text.origin && headingOrigin && headingRemaining.startsWith(text.text.trim())) {
            headingRemaining = headingRemaining.slice(text.text.trim().length).trimStart();
            return { ...text, origin: headingOrigin };
          }
          const box = targets.find(
            (target) =>
              text.x >= target.x - 1 &&
              text.y >= target.y - 1 &&
              text.x <= target.x + target.width + 1 &&
              text.y <= target.y + target.height + 1,
          );
          if (box) return { ...text, origin: box.origin };
          // This also resolves split generated links/signature names to Settings.
          const wording = text.text.trim();
          const origin =
            !historyPage && overdueLabels.has(wording)
              ? diseases
              : !historyPage && overdueAgents.includes(wording)
                ? agents
                : authored(text.text)
                  ? undefined
                  : !text.origin && historyPage
                    ? history
                    : undefined;
          return origin ? { ...text, origin } : text;
        }),
      };
    }),
  };
}
