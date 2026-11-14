import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
import { healthUnits, themedSettings } from "../src/health-units";
import { decoder, encoder } from "../src/project";
import {
  resetSettingsKeepingTheme,
  settingValue,
  updateQRStyle,
  updateThemeSettings,
} from "../src/theme-settings";

const bytes = (source: string) => encoder.encode(source);
const maintainedSettings = execFileSync("uv", [
  "run",
  "--locked",
  "python",
  "-c",
  'from scripts.project_template import scaffold_files; import sys; sys.stdout.buffer.write(scaffold_files()["templates/settings.typ"])',
]);

test("reads and edits the active value while preserving nested comments, BOM and CRLF", () => {
  const source =
    '\ufeff/*\r\n#let body-font = "Commented"\r\n/* nested */\r\n*/\r\n' +
    '// #let body-font = "Also commented"\r\n' +
    '#let body-font = "FreeSerif" /* Keep this explanation */ // And this one\r\n';
  expect(settingValue(bytes(source), "body-font")).toBe('"FreeSerif"');
  expect(updateThemeSettings(bytes(source), { "body-font": '"FreeSans"' })).toEqual(
    bytes(source.replace('= "FreeSerif"', '= "FreeSans"')),
  );
});

test("quoted comment marks and escaped quotes remain part of the value", () => {
  const value = JSON.stringify('Dr. "Annie" // /* Name */');
  const source = `#let signature-name = ${value} // Keep\n#let records-url = "https://example.org/a//b"\n`;
  expect(settingValue(bytes(source), "signature-name")).toBe(value);
  expect(settingValue(bytes(source), "records-url")).toBe('"https://example.org/a//b"');
  expect(
    decoder.decode(updateThemeSettings(bytes(source), { "signature-name": '"Dr. Next"' })),
  ).toBe(source.replace(value, '"Dr. Next"'));
});

test("nested declarations do not replace the top-level setting", () => {
  const source = '#let sample = [\n#let body-font = "Nested"\n]\n#let body-font = "FreeSans"\n';
  expect(settingValue(bytes(source), "body-font")).toBe('"FreeSans"');
  expect(decoder.decode(updateThemeSettings(bytes(source), { "body-font": '"FreeSerif"' }))).toBe(
    source.replace('= "FreeSans"', '= "FreeSerif"'),
  );
});

test("ambiguous, calculated, multiline and incomplete values require source editing", () => {
  for (const source of [
    '#let body-font = "One"\n#let body-font = "Two"\n',
    '#let body-font = if true { "One" } else { "Two" }\n',
    "#let body-font = font-name\n",
    '#let body-font = (\n "FreeSans"\n)\n',
    '#let body-font = "One" + "Two"\n',
    '#let body-font = "FreeSans\n',
    '/*\n#let body-font = "FreeSans"\n',
    '```typ\n#let body-font = "Raw example"\n```\n#let body-font = "FreeSans"\n',
    '#let body-font = "FreeSans"; #let other = true\n',
  ]) {
    const original = bytes(source);
    expect(settingValue(original, "body-font"), source).toBeUndefined();
    expect(() => updateThemeSettings(original, { "body-font": '"FreeSerif"' }), source).toThrow(
      "Edit body-font in Settings",
    );
    expect(original).toEqual(bytes(source));
  }
});

test("comments inside a value are retained by refusing an automatic replacement", () => {
  const original = bytes('#let link-color = rgb(/* brand */ "#112233")\n');
  expect(settingValue(original, "link-color")).toBeUndefined();
  expect(() => updateThemeSettings(original, { "link-color": 'rgb("#445566")' })).toThrow(
    "Edit link-color in Settings",
  );
});

test("QR changes ignore commented examples and nested dictionary fields", () => {
  const source =
    '\ufeff/*\r\n#let qr = (\r\n  module-shape: "commented",\r\n  corner-style: "commented",\r\n)\r\n*/\r\n' +
    "#let qr = (\r\n" +
    '  url: notice => link("https://example.org", (\r\n    module-shape: "nested",\r\n  )),\r\n' +
    '  /* module-shape: "ignored", */\r\n' +
    '  module-shape: "square", /* Keep this */\r\n' +
    '  corner-style: "square", // Keep too\r\n)\r\n';
  expect(updateQRStyle(bytes(source), "dots")).toEqual(
    bytes(
      source
        .replace('module-shape: "square"', 'module-shape: "dots"')
        .replace('corner-style: "square"', 'corner-style: "rounded"'),
    ),
  );
});

test("QR overrides, repeated fields and computed style values are left to source editing", () => {
  const qr = '#let qr = (\n  module-shape: "square",\n  corner-style: "square",\n)\n';
  for (const source of [
    qr + qr,
    qr.replace("  corner-style:", '  module-shape: "duplicate",\n  corner-style:'),
    qr.replace('"square",', 'if true { "square" } else { "dots" },'),
    qr.replace("\n)", "\n  ..other,\n)"),
    qr.replace("\n)", "\n  enabled: true, ..other,\n)"),
    qr.replace("#let qr = (", "#let qr = style.with("),
  ])
    expect(() => updateQRStyle(bytes(source), "dots")).toThrow("in Settings");
});

test("maintained Settings keep every byte outside the requested values", () => {
  const original = maintainedSettings;
  const source = decoder.decode(original);
  const changes = {
    "body-font": '"FreeSerif"',
    "link-color": 'rgb("#123456")',
    logo: 'image("assets/edited.png", width: logo-width)',
  };
  let expected = source;
  for (const [name, value] of Object.entries(changes)) {
    const previous = settingValue(original, name);
    expect(previous, name).toBeDefined();
    expected = expected.replace(`#let ${name} = ${previous}`, `#let ${name} = ${value}`);
  }
  expect(updateThemeSettings(original, changes)).toEqual(bytes(expected));
  expect(decoder.decode(updateQRStyle(original, "dots"))).toBe(
    source
      .replace('module-shape: "square"', 'module-shape: "dots"')
      .replace('corner-style: "square"', 'corner-style: "rounded"'),
  );
});

test("image paths requiring escapes or calculations stay in source editing", () => {
  for (const value of [
    'image("a\\"b.png", width: 1cm)',
    "image(path, width: 1cm)",
    'image("assets/" + "logo.png", width: 1cm)',
    'image("assets/logo.png",\n width: 1cm)',
  ]) {
    const original = bytes(`#let logo = ${value}\n`);
    expect(settingValue(original, "logo")).toBeUndefined();
    expect(() => updateThemeSettings(original, { logo: 'image("new.png")' })).toThrow(
      "Edit logo in Settings",
    );
  }
});

test("calculated colours are not rewritten by a theme change", () => {
  const source = bytes('#let accent-color = rgb("#" + colour-code)\n');
  expect(settingValue(source, "accent-color")).toBeUndefined();
  expect(() => updateThemeSettings(source, { "accent-color": 'rgb("#001122")' })).toThrow(
    "Edit accent-color in Settings",
  );
});

test("title alignment can be edited and survives Settings-only reset", () => {
  const baseline = bytes('#let title-align = center // Keep\n#let paper-size = "a4"\n');
  const current = updateThemeSettings(baseline, { "title-align": "right" });
  expect(settingValue(current, "title-align")).toBe("right");
  const changed = bytes(
    decoder.decode(current).replace('paper-size = "a4"', 'paper-size = "us-letter"'),
  );
  expect(decoder.decode(resetSettingsKeepingTheme(baseline, changed))).toBe(
    '#let title-align = right // Keep\n#let paper-size = "a4"\n',
  );
  const computed = bytes("#let title-align = if true { left } else { right }\n");
  expect(settingValue(computed, "title-align")).toBeUndefined();
  expect(() => updateThemeSettings(computed, { "title-align": "center" })).toThrow(
    "Edit title-align in Settings",
  );
});

test("Settings reset preserves branding and QR style while restoring layout and contacts", () => {
  const baseline = maintainedSettings;
  const source = decoder.decode(baseline);
  const current = bytes(
    source
      .replace('paper-size = "us-letter"', 'paper-size = "a4"')
      .replace('records-email = "records@example.org"', 'records-email = "changed@example.org"')
      .replace('body-font = "FreeSans"', 'body-font = "FreeSerif"')
      .replace('module-shape: "square"', 'module-shape: "separated"')
      .replace("corner-foreground: auto", 'corner-foreground: rgb("176b78")')
      .replace("alignment-foreground: auto", 'alignment-foreground: rgb("7a2048")')
      .replace('signature-name = "Dr. Annie Body"', 'signature-name = "Dr. Changed"')
      .replace('image("assets/logo.png"', 'image("assets/studio-logo.svg"'),
  );
  const expected = source
    .replace('body-font = "FreeSans"', 'body-font = "FreeSerif"')
    .replace('module-shape: "square"', 'module-shape: "separated"')
    .replace("corner-foreground: auto", 'corner-foreground: rgb("176b78")')
    .replace("alignment-foreground: auto", 'alignment-foreground: rgb("7a2048")')
    .replace('signature-name = "Dr. Annie Body"', 'signature-name = "Dr. Changed"')
    .replace('image("assets/logo.png"', 'image("assets/studio-logo.svg"');
  expect(resetSettingsKeepingTheme(baseline, current)).toEqual(bytes(expected));
});

test("theme preservation retains calculated multiline values and starting CRLF comments", () => {
  const baseline = bytes(
    '\ufeff// Keep\r\n#let body-font = "FreeSans" // Typeface\r\n#let paper-size = "a4"\r\n',
  );
  const current = bytes(
    '#let body-font = if true {\r\n "FreeSerif"\r\n} else { "FreeSans" }\r\n#let paper-size = "us-letter"\r\n',
  );
  expect(decoder.decode(resetSettingsKeepingTheme(baseline, current))).toBe(
    '\ufeff// Keep\r\n#let body-font = if true {\r\n "FreeSerif"\r\n} else { "FreeSans" } // Typeface\r\n#let paper-size = "a4"\r\n',
  );
});

test("refuses ambiguous theme separation without mutating either source", () => {
  const baseline = bytes('#let body-font = "FreeSans"\n');
  const current = bytes('#let body-font = "One"\n#let body-font = "Two"\n');
  expect(() => resetSettingsKeepingTheme(baseline, current)).toThrow(
    "Cannot safely separate Theme",
  );
  expect(decoder.decode(baseline)).toBe('#let body-font = "FreeSans"\n');
});

test("refuses to preserve theme expressions whose dependencies would be removed", () => {
  const baseline = bytes('#let body-font = "FreeSans"\n');
  for (const source of [
    '#let my-font = "FreeSerif"\n#let body-font = my-font\n',
    '#let body-font = "FreeSerif"; #let layout = "changed"\n',
  ])
    expect(() => resetSettingsKeepingTheme(baseline, bytes(source))).toThrow(
      "Cannot safely separate Theme",
    );
});

test("theme starters work when organization and signature wording live in Template", () => {
  const source = maintainedSettings.toString("utf8").replace(/^#let health-unit-name = .*\n/m, "");
  const result = themedSettings(bytes(source), healthUnits[1], true, true);
  expect(settingValue(result, "body-font")).toBe('"FreeSans"');
  expect(settingValue(result, "heading-color")).toBe('rgb("#034770")');
  expect(settingValue(result, "health-unit-name")).toBeUndefined();
});

test("Settings reset supports projects without explicit marker colours", () => {
  const baseline = decoder
    .decode(maintainedSettings)
    .replace(/^  (corner|alignment)-foreground:.*\n/gm, "");
  const current = baseline.replace('module-shape: "square"', 'module-shape: "separated"');
  expect(resetSettingsKeepingTheme(bytes(baseline), bytes(current))).toEqual(bytes(current));
});
