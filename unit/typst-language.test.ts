import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, test } from "vitest";
import { typst, typstCodeAt } from "../src/typst-language";

function tokenAt(source: string, needle: string) {
  const state = EditorState.create({ doc: source, extensions: [typst] });
  return ensureSyntaxTree(state, source.length, 1000)?.resolveInner(source.indexOf(needle) + 1)
    .name;
}

test("recognizes string literals entered directly from markup", () => {
  expect(tokenAt('#"text(hello)"', "text")).toBe("string");
});

test("keeps a declaration in code after a multiline string or block comment", () => {
  expect(tokenAt('#let label = "first\nsecond" + text[Hello]', "text")).toBe(
    "variableName.function",
  );
  expect(tokenAt("#let label = /* first\nsecond */ text[Hello]", "text")).toBe(
    "variableName.function",
  );
});

test("recognizes accented helper names", () => {
  expect(tokenAt("#résumé[Hello]", "résumé")).toBe("variableName.function");
});

describe("code completion context", () => {
  test.each([
    "#",
    "#text",
    "#immuknow.",
    "#text(",
    "#text(size: 12pt, ",
    "#let title = ",
    "#let title = (\n  ",
    "#let title = /* first\nsecond */ ",
    "#text[Hello #",
    "#text[Hello #link(",
    '#let label = "first\nsecond" + ',
  ])("offers suggestions in unfinished code: %s", (source) => {
    expect(typstCodeAt(source, source.length)).toBe(true);
  });

  test.each([
    "Plain text",
    "#text[Hello ",
    "#text[Hello] ",
    '#text("quoted text',
    '#"quoted text',
    "// #text(",
    "#text( /* #link(",
    "/* outer /* nested */ #text(",
    "`#text(",
    "```typ\n#text(",
    "\\#text(",
    "#let title = 12pt\n",
  ])("hides suggestions in non-code: %s", (source) => {
    expect(typstCodeAt(source, source.length)).toBe(false);
  });

  test("uses the requested cursor position rather than the rest of the document", () => {
    expect(typstCodeAt("#text( // comment", 7)).toBe(true);
    expect(typstCodeAt('#text("hello")', 10)).toBe(false);
  });
});
