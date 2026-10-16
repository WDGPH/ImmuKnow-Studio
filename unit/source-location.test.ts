import { expect, test } from "vitest";
import { sourceLocation } from "../src/source-location";
import type { Files } from "../src/types";

const template = "templates/notice.en.typ";
const files = (sources: Record<string, string>): Files =>
  Object.fromEntries(
    Object.entries(sources).map(([path, source]) => [path, new TextEncoder().encode(source)]),
  );

test("navigates a unique source match with its original text offsets", () => {
  const source = "#let title = [Unique marker]";
  expect(sourceLocation(files({ [template]: source }), template, "Unique marker")).toEqual({
    path: template,
    from: source.indexOf("Unique"),
    to: source.indexOf("marker") + "marker".length,
  });
});

test("refuses repeated matches within a file even when another file has one match", () => {
  expect(
    sourceLocation(
      files({
        [template]: "[Repeated marker] [Repeated marker]",
        "templates/other.en.typ": "[Repeated marker]",
      }),
      template,
      "Repeated marker",
    ),
  ).toBeUndefined();
});

test("refuses matches in multiple imported companion files", () => {
  expect(
    sourceLocation(
      files({
        [template]: '#import "companion.typ"\n[Shared marker]',
        "templates/companion.typ": "[Shared marker]",
      }),
      template,
      "Shared marker",
    ),
  ).toBeUndefined();
});

test("unrelated starter templates do not make an active notice match ambiguous", () => {
  const source = "[Shared marker]";
  expect(
    sourceLocation(
      files({ [template]: source, "templates/other.en.typ": source }),
      template,
      "Shared marker",
    ),
  ).toEqual({ path: template, from: 1, to: source.length - 1 });
});

test("generated headings prefer a unique literal over a mention in body text", () => {
  const source = '#notice-page("Immunization Record")[Please review the Immunization Record.]';
  expect(sourceLocation(files({ [template]: source }), template, "Immunization Record")).toEqual({
    path: template,
    from: source.indexOf('"') + 1,
    to: source.indexOf('"', source.indexOf('"') + 1),
  });
});

test("ignores comments when deciding whether a source match is unique", () => {
  const source = "// Unique marker\n[Unique marker] /* Unique marker */";
  expect(sourceLocation(files({ [template]: source }), template, "Unique marker")).toEqual({
    path: template,
    from: source.indexOf("Unique", source.indexOf("\n")),
    to: source.indexOf("marker", source.indexOf("\n")) + "marker".length,
  });
});

test("uses compiler byte spans to distinguish repeated accented wording after CRLF and emoji", () => {
  const phrase = "Même phrase répétée.",
    source = `Été 😀\r\n\r\n${phrase}\r\n\r\n${phrase}`;
  const from = source.lastIndexOf(phrase),
    encode = new TextEncoder();
  const origin = {
    path: `/${template}`,
    from: encode.encode(source.slice(0, from)).length,
    to: encode.encode(source).length,
  };
  expect(sourceLocation(files({ [template]: source }), template, phrase, origin)).toEqual({
    path: template,
    from,
    to: source.length,
  });
});

test("refuses invalid source spans instead of guessing a matching occurrence", () => {
  const source = "Été marker",
    project = files({ [template]: source });
  for (const [from, to] of [
    [1, 2],
    [-1, 5],
    [2, 100],
    [4, 4],
    [1.5, 5],
  ])
    expect(
      sourceLocation(project, template, "marker", { path: template, from, to }),
    ).toBeUndefined();
  expect(
    sourceLocation(project, template, "marker", { path: "missing.typ", from: 0, to: 5 }),
  ).toBeUndefined();
});

test("can locate generated text in its read-only shared source", () => {
  const path = "templates/lib/immuknow/lib.typ";
  expect(
    sourceLocation(files({ [path]: "Generated words" }), template, "Generated", {
      path,
      from: 0,
      to: 9,
    }),
  ).toEqual({ path, from: 0, to: 9 });
});
