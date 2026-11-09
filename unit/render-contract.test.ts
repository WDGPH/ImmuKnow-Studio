import { expect, test } from "vitest";
import cases from "./fixtures/render-contract.json";
import { validateNotice, validateSummary } from "../src/render-contract";

for (const sample of cases.cases) {
  test(`shared rendering contract: ${sample.name}`, () => {
    const values = structuredClone({ payload: cases.payload, report: cases.report });
    for (const change of sample.changes) {
      let target: unknown = values[change.target as keyof typeof values];
      for (const key of change.path.slice(0, -1))
        target = (target as Record<string | number, unknown>)[key];
      const key = change.path.at(-1) as string | number;
      if ("remove" in change && change.remove) {
        if (Array.isArray(target)) target.splice(Number(key), 1);
        else delete (target as Record<string | number, unknown>)[key];
      } else if ("value" in change)
        (target as Record<string | number, unknown>)[key] = change.value;
    }
    const validate = () => {
      validateNotice(values.payload);
      validateSummary(values.report, values.payload);
    };
    if (sample.valid) expect(validate).not.toThrow();
    else expect(validate).toThrow();
  });
}

test("nonfinite measurements are refused", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const report = structuredClone(cases.report);
    report.measurements.header[0].title_height_pt = value;
    validateNotice(cases.payload);
    expect(() => validateSummary(report, cases.payload)).toThrow();
    const changedSource = structuredClone(cases.report);
    changedSource.notice.client_data.age = value;
    expect(() => validateSummary(changedSource, cases.payload)).toThrow();
  }
});

test("preview facts accept client initials", () => {
  const payload = structuredClone(cases.payload);
  Object.assign(payload.client_data, { first_initial: "É", last_initial: "L" });
  expect(() => validateNotice(payload)).not.toThrow();
});

// The same complete evidence cases run against Core's native validator.
import requirementCases from "./fixtures/requirements-contract.json";
for (const sample of requirementCases.cases) {
  test(`notice requirements evidence: ${sample.name}`, () => {
    const validate = () => {
      validateNotice(sample.payload);
      validateSummary(sample.report, sample.payload);
    };
    if (sample.expect.evidence_valid) expect(validate).not.toThrow();
    else expect(validate).toThrow();
  });
}

test("agent exclusions use Unicode scalar ordering", () => {
  const sample = requirementCases.cases.find((item) => item.name === "all_excluded_duplicate");
  if (!sample) throw new Error("Missing agent fixture");
  const { payload, report } = structuredClone(sample);
  const agents = ["\uE000", "😀"];
  payload.overdue_agents = agents;
  report.notice.overdue_agents = agents;
  const measurement = report.measurements.overdue_agents[0];
  measurement.source_agents = agents;
  measurement.excluded_agents = agents;
  expect(() => {
    validateNotice(payload);
    validateSummary(report, payload);
  }).not.toThrow();
  measurement.excluded_agents = [...agents].reverse();
  expect(() => validateSummary(report, payload)).toThrow();
});
