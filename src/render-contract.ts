import schema from "../generated/immuknow/typst/report.json";
import validators from "../generated/render-contract.js";
import type { Notice, RenderSummary } from "./types";

const { validatePayload, validateReport } = validators;

function sameData(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)
  )
    return false;
  const fields = Object.entries(left);
  return (
    fields.length === Object.keys(right).length &&
    fields.every(
      ([key, value]) =>
        Object.hasOwn(right, key) && sameData(value, (right as Record<string, unknown>)[key]),
    )
  );
}

// Match Rust and Typst's Unicode scalar ordering, including astral characters.
function scalarLess(left: string, right: string): boolean {
  const a = Array.from(left, (character) => character.codePointAt(0)!);
  const b = Array.from(right, (character) => character.codePointAt(0)!);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    if (a[index] !== b[index]) return a[index] < b[index];
  }
  return a.length < b.length;
}

export function validateNotice(value: unknown): asserts value is Notice {
  if (!validatePayload(value))
    throw new Error(
      `Notice data has an invalid field: ${validatePayload.errors?.[0]?.instancePath || "notice"}`,
    );
  const notice = value as Notice;
  if (notice.template !== `${notice.version_id}.${notice.language}.typ`)
    throw new Error("Notice filename differs from its version or language.");
}

export function validateSummary(value: unknown, notice: Notice): asserts value is RenderSummary {
  if (!validateReport(value))
    throw new Error(
      `Render evidence has an invalid field: ${validateReport.errors?.[0]?.instancePath || "report"}`,
    );
  const summary = value as RenderSummary;
  validateNotice(summary.notice);
  if (Object.entries(summary.identity).some(([key, value]) => value !== notice[key]))
    throw new Error("Render evidence does not belong to the selected source row and notice");
  if (!sameData(summary.notice, notice))
    throw new Error("Render evidence used data that differs from the prepared notice");
  if (summary.requirements.state === "valid") {
    const declaration = summary.requirements.declaration;
    for (const key of ["row_key", "client_id", "template", "version_id", "language"])
      if (declaration[key] !== notice[key])
        throw new Error("Requirements belong to another source row");
    const coverage = summary.checks.find((check) => check.code === "data.forecast_coverage");
    if (!coverage || !sameData(coverage.measurements, notice.forecast_coverage))
      throw new Error("Coverage finding differs from prepared measurements");
    if (declaration.coverage === "agents" && summary.measurements.overdue_agents?.length !== 1)
      throw new Error("Agent requirements need exactly one placed agent component or alternative");
  } else {
    const expected = ["notice.eligibility", "data.forecast_coverage", "content.agent_display"];
    if (
      !sameData(
        summary.blocked_checks.map((check) => check.code),
        expected,
      )
    )
      throw new Error("Incorrect blocked-check order");
  }
  function bounds(value: Record<string, unknown>) {
    for (const [key, number] of Object.entries(value))
      if ((key === "page" || key.endsWith("_page")) && Number(number) > summary.page_count)
        throw new Error("Render evidence refers to a page outside this notice");
    if (Number(value.first_page ?? 0) > Number(value.last_page ?? summary.page_count))
      throw new Error("Render evidence has a reversed page range");
  }
  const rules = new Map(schema.$defs.check.properties.code.oneOf.map((item) => [item.const, item]));
  for (const [name, placed] of Object.entries(summary.components)) {
    const measurements = summary.measurements[name] ?? [];
    const absent = summary.checks.filter((item) => item.code === `component.${name}.absent`);
    if (Boolean(measurements.length) !== placed || absent.length !== (placed ? 0 : 1))
      throw new Error(`Render evidence contradicts the placed ${name} component`);
    for (const value of measurements) {
      bounds(value);
      if (
        "row_key" in value &&
        (value.client_id !== notice.client_id || value.row_key !== notice.row_key)
      )
        throw new Error(`Placed ${name} evidence belongs to a different source row`);
      if ("source_matches" in value && !value.source_matches)
        throw new Error(`Placed ${name} content used changed notice data`);
      if (name === "overdue_agents") {
        const source = notice.overdue_agents as string[];
        const excluded = value.excluded_agents as string[];
        const displayed = value.displayed_agents as string[];
        if (
          !Number.isInteger(value.page) ||
          Number(value.page) < 1 ||
          Number(value.page) > summary.page_count
        )
          throw new Error("Agent component page outside notice");
        if (
          !sameData(value.source_agents, source) ||
          value.source_count !== source.length ||
          value.displayed_count !== displayed.length
        )
          throw new Error("Agent component source or displayed count differs");
        if (
          excluded.some(
            (item, index) =>
              !source.includes(item) || (index > 0 && !scalarLess(excluded[index - 1], item)),
          )
        )
          throw new Error("Agent exclusions are not sorted unique source values");
        if (value.replacement === "none") {
          const expected = [...new Set(source.filter((agent) => !excluded.includes(agent)))];
          if (value.replacement_visible || !sameData(displayed, expected))
            throw new Error("Agent display differs from filtered source");
        } else if (
          !value.replacement_visible ||
          displayed.length ||
          (value.replacement === "no_records" && notice.has_immunization_records !== false)
        ) {
          throw new Error("Agent replacement contradicts the prepared notice");
        }
      }
    }
  }
  for (const check of summary.checks) {
    bounds({ ...check });
    bounds(check.measurements ?? {});
    const allowed = rules.get(check.code)?.["x-components"] ?? [];
    if (
      (allowed.length && !allowed.includes(check.component ?? "")) ||
      (!allowed.length && check.component !== undefined)
    )
      throw new Error("Render check names the wrong component");
    if (check.code.startsWith("component.")) {
      if (check.status !== "not_applicable" || check.page !== undefined)
        throw new Error("An absent component must be reported as not applicable");
    } else if (
      allowed.length &&
      (!summary.components[check.component as string] || check.page === undefined)
    )
      throw new Error("Render check is missing its placed component or page");
  }
}
