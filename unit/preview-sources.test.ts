import { expect, test } from "vitest";
import { previewSources } from "../src/preview-sources";
import { encoder } from "../src/project";
import { sourceLocation } from "../src/source-location";
import type { Preview, RenderSummary } from "../src/types";

const template = "templates/notice.en.typ";
const row = { text: "2020-05-01", x: 20, y: 100, width: 80, height: 12 };
const preview: Preview = {
  artifact: new Uint8Array(),
  pages: Array.from({ length: 3 }, () => ({
    width: 612,
    height: 792,
    text: [row],
    plainText: row.text,
  })),
};
const summary = {
  notice: {},
  measurements: {
    history: [{ page: 2 }],
    section: [{ title: "History", first_page: 2, last_page: 3 }],
  },
} as unknown as RenderSummary;

test("translated overdue labels follow the active editable component, including authored label overrides", () => {
  const source = "#immuknow.overdue-diseases(notice)";
  const files = {
    [template]: encoder.encode(source),
    "templates/translations/fr_diseases_overdue.json": encoder.encode(
      '{"Measles":"Rougeole locale"}',
    ),
  };
  const translated = {
    ...preview,
    pages: [{ ...preview.pages[0], text: [{ ...row, text: "Rougeole locale" }] }],
  };
  const facts = {
    ...summary,
    notice: { language: "fr", overdue_diseases: [{ disease: "Measles" }] },
    measurements: {},
  } as unknown as RenderSummary;
  const origin = previewSources(translated, files, template, facts).pages[0].text[0].origin;
  const target = sourceLocation(files, template, "Rougeole locale", origin);
  expect(source.slice(target?.from, target?.to)).toBe("immuknow.overdue-diseases(notice)");
});

test("history continuation pages navigate to the editable component call, ignoring commented calls", () => {
  const source =
    "// #immunization-history()\r\n/* nested /* #immunization-history() */ */\r\n#immunization-history()";
  const files = { [template]: encoder.encode(source) };
  const result = previewSources(preview, files, template, summary);
  expect(result.pages[0].text[0].origin).toBeUndefined();
  for (const page of result.pages.slice(1)) {
    const target = sourceLocation(files, template, row.text, page.text[0].origin);
    expect(source.slice(target?.from, target?.to)).toBe("immunization-history()");
    expect(target?.from).toBe(source.lastIndexOf("immunization-history"));
  }
});

test("multiple component calls refuse generated targets, and exact compiler origins are preserved", () => {
  const files = { [template]: encoder.encode("#immunization-history()\n#immunization-history()") };
  const result = previewSources(preview, files, template, summary);
  expect(result.pages[1].text[0].origin).toBeUndefined();
  const origin = { path: template, from: 1, to: 21 };
  const authored = { ...preview, pages: [{ ...preview.pages[0], text: [{ ...row, origin }] }] };
  expect(previewSources(authored, files, template, summary).pages[0].text[0].origin).toBe(origin);
});
