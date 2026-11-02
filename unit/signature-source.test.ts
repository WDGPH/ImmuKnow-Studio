import { expect, test } from "vitest";
import { themeImage, updateThemeImage } from "../src/branding";
import { decoder, encoder } from "../src/project";
import { resetProject } from "../src/project-actions";
import { inlineSignatureImage, updateInlineSignatureImage } from "../src/signature-source";

const image = 'image("assets/signature.png", width: 4.5cm)';
const block = `#immuknow.signature-block(\n  signature: ${image},\n  name: signature-name,\n)`;

test("changing a signature image preserves its explicit width, comments and CRLF bytes", () => {
  const source =
    '\ufeff/* #immuknow.signature-block(signature: image("ignored.png")) */\r\n' +
    block.replaceAll("\n", "\r\n");
  const bytes = encoder.encode(source);
  expect(inlineSignatureImage(bytes)?.relative).toBe("assets/signature.png");
  expect(decoder.decode(updateInlineSignatureImage(bytes, "assets/new.svg"))).toBe(
    source.replace('"assets/signature.png"', '"assets/new.svg"'),
  );
});

test("ambiguous or calculated signature sources are left to the author", () => {
  for (const source of [
    `${block}\n${block}`,
    block.replace(image, 'image("assets/" + "signature.png")'),
    block.replace(image, "image(signature-path)"),
    block.replace(image, "signature"),
    block.slice(0, -1),
    `/* ${block} */`,
    `\`\`\`typ\n${block}\n\`\`\``,
  ]) {
    expect(inlineSignatureImage(encoder.encode(source)), source).toBeUndefined();
    expect(() => updateInlineSignatureImage(encoder.encode(source), "new.png")).toThrow(
      "in Template",
    );
  }
});

test("Theme updates an inline image relative to the Template and keeps it on a template-only reset", () => {
  const template = "templates/nested/notice.en.typ";
  const source = block.replace("assets/signature.png", "../assets/signature.png");
  const baseline = { [template]: encoder.encode(source) };
  expect(themeImage(baseline, template, "signature")).toMatchObject({
    path: template,
    relative: "../assets/signature.png",
    inline: true,
  });
  const changed = updateThemeImage(
    baseline,
    template,
    "signature",
    "templates/assets/uploaded.svg",
  );
  const edited = {
    ...changed,
    [template]: encoder.encode(decoder.decode(changed[template]).replace("4.5cm", "3cm")),
  };
  expect(decoder.decode(resetProject(edited, baseline, template, "template")[template])).toBe(
    source.replace("../assets/signature.png", "../assets/uploaded.svg"),
  );
});

test("older projects keep their signature image in Settings", () => {
  const template = "templates/notice.en.typ";
  const source = `// @immuknow-settings: settings.typ\n${block.replace(image, "signature")}`;
  const files = {
    [template]: encoder.encode(source),
    "templates/settings.typ": encoder.encode(`#let signature = ${image}\n`),
  };
  const changed = updateThemeImage(files, template, "signature", "templates/assets/new.svg");
  expect(changed[template]).toEqual(files[template]);
  expect(decoder.decode(changed["templates/settings.typ"])).toBe(
    `#let signature = ${image.replace("signature.png", "new.svg")}\n`,
  );
});
