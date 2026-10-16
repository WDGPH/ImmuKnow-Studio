import { decoder } from "./project";
import type { Files, PreviewText } from "./types";
import { referencedFiles } from "./project-actions";
import { sourceCode } from "./source-text";

type Location = { path: string; from: number; to: number };
function normalized(source: string) {
  let text = "";
  const offsets: number[] = [];
  for (let i = 0; i < source.length; i++) {
    const char = source[i].normalize("NFKC").toLowerCase();
    for (const c of char) {
      if (!/[\p{L}\p{N}]/u.test(c)) continue;
      text += c;
      offsets.push(i);
    }
  }
  return { text, offsets };
}

export function sourceLocation(
  files: Files,
  template: string,
  text: string,
  origin?: PreviewText["origin"],
): Location | undefined {
  if (origin) {
    const path = origin.path.replace(/^\//, "");
    const bytes = files[path];
    if (
      !bytes ||
      !Number.isSafeInteger(origin.from) ||
      !Number.isSafeInteger(origin.to) ||
      origin.from < 0 ||
      origin.to <= origin.from ||
      origin.to > bytes.length
    )
      return;
    // Decode prefixes strictly so an invalid byte boundary cannot shift the highlight.
    try {
      const utf8 = new TextDecoder("utf-8", { fatal: true });
      const prefix = utf8.decode(bytes.subarray(0, origin.from));
      const through = utf8.decode(bytes.subarray(0, origin.to));
      // Generated links and labels often inherit a shared implementation span.
      // Prefer an unambiguous authored value when it exists in this notice.
      const authored = path.startsWith("templates/lib/")
        ? sourceLocation(files, template, text)
        : undefined;
      return authored ?? { path, from: prefix.length, to: through.length };
    } catch {
      return;
    }
  }
  const needle = normalized(text).text;
  if (needle.length < 5) return;
  const paths = [...referencedFiles(files, template)].filter(
    (p) => !p.startsWith("templates/lib/") && p.endsWith(".typ"),
  );
  // Literal heading strings take precedence over mentions in body paragraphs.
  const literals: Location[] = [];
  for (const path of paths) {
    const visible = sourceCode(decoder.decode(files[path]));
    for (const match of visible.matchAll(/"(?:\\.|[^"\\])*"/g)) {
      try {
        if (normalized(JSON.parse(match[0])).text === needle)
          literals.push({ path, from: match.index + 1, to: match.index + match[0].length - 1 });
      } catch {
        /* Typst string escapes may differ from JSON. */
      }
    }
  }
  if (literals.length === 1) return literals[0];
  let location: Location | undefined;
  for (const path of paths) {
    const bytes = files[path];
    if (!bytes) continue;
    const source = decoder.decode(bytes);
    // Preserve offsets while excluding comments from matching.
    const visible = sourceCode(source);
    const haystack = normalized(visible);
    const at = haystack.text.indexOf(needle);
    if (at < 0) continue;
    if (location || haystack.text.indexOf(needle, at + 1) >= 0) return;
    location = {
      path,
      from: haystack.offsets[at],
      to: haystack.offsets[at + needle.length - 1] + 1,
    };
  }
  return location;
}
