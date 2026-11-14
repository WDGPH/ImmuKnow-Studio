import { expect, test } from "vitest";
import cases from "./fixtures/render-contract.json";
import { guideGeometry } from "../src/guide-geometry";
import { validateNotice, validateSummary } from "../src/render-contract";

function validatedReport() {
  const { payload, report } = structuredClone(cases);
  validateNotice(payload);
  validateSummary(report, payload);
  return report;
}

test("guide uses placed address geometry even when the passing check has no measurements", () => {
  const report = validatedReport();
  expect(
    report.checks.find((check) => check.code === "layout.address_outside_window")?.measurements,
  ).toBeUndefined();
  expect(guideGeometry(report, report.page_count)).toEqual({
    PAGE: 1,
    WINDOW_X: 63,
    WINDOW_Y: 120,
    WINDOW_WIDTH: 324,
    WINDOW_HEIGHT: 81,
    WINDOW_PADDING: 11,
    ADDRESS_X: 74,
    ADDRESS_Y: 131,
    ADDRESS_WIDTH: report.measurements.address[0].width_pt,
    ADDRESS_HEIGHT: report.measurements.address[0].height_pt,
  });
});

test("missing, invalid or out-of-page evidence clears the guide", () => {
  const report = validatedReport();
  expect(guideGeometry(undefined, report.page_count)).toEqual({});
  const withoutWindow = structuredClone(report);
  delete withoutWindow.measurements.address[0].window_x_pt;
  expect(guideGeometry(withoutWindow, report.page_count)).toEqual({});
  report.measurements.address[0].window_x_pt = Number.NaN;
  expect(guideGeometry(report, report.page_count)).toEqual({});
  report.measurements.address[0].window_x_pt = 63;
  report.measurements.address[0].page = report.page_count + 1;
  expect(guideGeometry(report, report.page_count)).toEqual({});
});

test("guide selects the measured address page", () => {
  const report = validatedReport();
  report.measurements.address[0].page = 2;
  expect(guideGeometry(report, 2).PAGE).toBe(2);
});
