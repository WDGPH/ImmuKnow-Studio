import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { functionCatalog } from "../src/typst-catalog";
import { typstCompletion } from "../src/typst-completion";
import { functionHelp } from "../src/typst-help";
import { typst } from "../src/typst-language";

function complete(source: string, explicit = false) {
  const position = source.indexOf("|");
  const state = EditorState.create({ doc: source.replace("|", ""), extensions: [typst] });
  return typstCompletion(new CompletionContext(state, position, explicit));
}
function labels(source: string, explicit = false) {
  return complete(source, explicit)?.options.map((option) => option.label) ?? [];
}

describe("Typst coding suggestions", () => {
  it("offers useful Typst, Core and Settings functions after a hash", () => {
    const options = labels("#|");
    expect(options).toEqual(
      expect.arrayContaining([
        "text",
        "grid",
        "table",
        "immuknow.notice-page",
        "immuknow.immunization-history",
        "immuknow.overdue-diseases",
        "immuknow.signature-block",
        "immuknow.query-url",
      ]),
    );
    expect(Object.keys(functionCatalog).length).toBeGreaterThan(45);
  });

  it("replaces a qualified function name without removing its hash", () => {
    expect(complete("#immuknow.qr-|")?.from).toBe(1);
    expect(labels("#immuknow.qr-|")).toContain("immuknow.qr-code");
    expect(labels("#let body = text|")).toContain("text");
  });

  it("offers named options for direct and multiline function calls", () => {
    expect(labels("#text(si|)")).toContain("size");
    expect(labels("#immuknow.qr-code(\nwi|)")).toContain("width");
    expect(labels("#show: immuknow.letter.with(pa|)")).toContain("paper");
    expect(labels("#immuknow.immunization-history(sh|)")).toContain("show-validity");
  });

  it("inserts named option punctuation and omits options already supplied", () => {
    const options = complete("#text(size: 12pt, fi|)")?.options;
    expect(options?.some((option) => option.label === "size")).toBe(false);
    expect(options?.find((option) => option.label === "fill")?.apply).toBe("fill: ");
  });

  it("keeps nested calls, dictionaries, content and quoted commas distinct", () => {
    expect(labels('#text(font: "Example, Font", fill: rgb("#abc"), si|)')).toContain("size");
    expect(labels("#grid(columns: (1fr, 1fr), [Text], gu|)")).toContain("gutter");
    expect(labels("#text(fill: rgb(|))", true)).toContain("rgb");
    expect(labels("#text(size: |)", true)).toContain("text");
    expect(labels("#text([plain wording|])")).toEqual([]);
    expect(labels("#text(size: fo|)")).toContain("text");
    expect(labels("#text(size: fo|)")).not.toContain("size");
    expect(labels("#text(st|)")).toContain("str");
  });

  it("does not suggest code in prose, comments, raw blocks or quoted strings", () => {
    for (const source of [
      "Plain te|xt",
      "// #te|",
      "/* #te| */",
      "`#te|`",
      "```typst\n#te|\n```",
      '#link("https://te|")',
      "\\#te|",
    ]) {
      expect(labels(source, true), source).toEqual([]);
    }
  });

  it("does not offer edits in read-only sources", () => {
    const state = EditorState.create({
      doc: "#te",
      extensions: [typst, EditorState.readOnly.of(true)],
    });
    expect(typstCompletion(new CompletionContext(state, 3, true))).toBeNull();
  });
});

describe("function hover help", () => {
  it("shows help for qualified table helpers and function references", () => {
    for (const source of [
      "#table.header([Date])",
      "#show: immuknow.letter",
      "#immuknow.immunization-history()",
    ]) {
      const name = source.startsWith("#show") ? "immuknow.letter" : source.slice(1).split("(")[0];
      const state = EditorState.create({ doc: source, extensions: [typst] });
      expect(functionHelp(state, source.indexOf(name) + 2)?.name).toBe(name);
    }
  });
  it("does not show help for function names in strings, comments or prose", () => {
    for (const source of ["// #text()", "`#text()`", '#let x = "text()"', "ordinary text()"]) {
      const state = EditorState.create({ doc: source, extensions: [typst] });
      expect(functionHelp(state, source.indexOf("text") + 1)).toBeUndefined();
    }
  });
});
