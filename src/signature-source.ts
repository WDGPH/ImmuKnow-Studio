import { decoder, encoder } from "./project";
import { sourceCode } from "./source-text";

type QuotedValue = { value: string; from: number; to: number };

// Support one signature block. Ambiguous calls and incomplete source stay under
// the author's control; comments and strings retain their original offsets.
function signatureArgument(bytes: Uint8Array, field: string) {
  const source = decoder.decode(bytes);
  const code = sourceCode(source, true);
  const calls = [...code.matchAll(/\b(?:immuknow\.)?signature-block\s*\(/g)];
  if (calls.length !== 1) return;
  const start = calls[0].index + calls[0][0].length;
  const stack = ["("];
  const candidates: number[] = [];
  let end = start;
  for (; end < code.length && stack.length; end++) {
    if (stack.length === 1 && (end === start || !/[\w-]/.test(code[end - 1]))) {
      const match = new RegExp(`^${field}\\s*:\\s*`).exec(code.slice(end));
      if (match) candidates.push(end + match[0].trimEnd().length);
    }
    const char = code[end];
    if ("([{".includes(char)) stack.push(char);
    else if (")]}".includes(char)) {
      if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[char]) return;
    }
  }
  if (stack.length || candidates.length !== 1) return;
  return { source, code, from: candidates[0], end };
}

function quotedValue(source: string, from: number, end: number): QuotedValue | undefined {
  const code = sourceCode(source);
  const match = /^(\s*)("(?:[^"\\]|\\.)*")/.exec(code.slice(from, end));
  if (!match) return;
  const to = from + match[0].length;
  const suffix = code.slice(to, end).trimStart();
  if (suffix && !/^[,)]/.test(suffix)) return;
  try {
    return { value: JSON.parse(match[2]), from: from + match[1].length, to };
  } catch {
    return;
  }
}

export function inlineSignatureImage(bytes: Uint8Array) {
  const argument = signatureArgument(bytes, "signature");
  if (!argument) return;
  const match = /^\s*image\s*\(/.exec(argument.code.slice(argument.from));
  if (!match) return;
  const image = quotedValue(argument.source, argument.from + match[0].length, argument.end);
  if (image) return { relative: image.value, from: image.from, to: image.to };
}

export function inlineSignatureName(bytes: Uint8Array): QuotedValue | undefined {
  const argument = signatureArgument(bytes, "name");
  if (!argument) return;
  const direct = quotedValue(argument.source, argument.from, argument.end);
  if (direct) return direct;
  if (!/^\s*signature-name\s*[,)]/.test(argument.code.slice(argument.from))) return;
  const bindings = [...argument.code.matchAll(/^[ \t\ufeff]*#let signature-name\s*=/gm)];
  if (bindings.length !== 1) return;
  const from = bindings[0].index + bindings[0][0].length;
  const newline = argument.source.indexOf("\n", from);
  return quotedValue(argument.source, from, newline < 0 ? argument.source.length : newline);
}

export function orderSignatoryName(bytes: Uint8Array): QuotedValue | undefined {
  const source = decoder.decode(bytes);
  const bindings = [
    ...sourceCode(source, true).matchAll(/^[ \t\ufeff]*#let order-signatory-name\s*=/gm),
  ];
  if (bindings.length !== 1) return;
  const from = bindings[0].index + bindings[0][0].length;
  const newline = source.indexOf("\n", from);
  return quotedValue(source, from, newline < 0 ? source.length : newline);
}

function replace(
  bytes: Uint8Array,
  range: { from: number; to: number } | undefined,
  value: string,
) {
  if (!range) throw new Error("Edit the signature in Template.");
  const source = decoder.decode(bytes);
  return encoder.encode(
    source.slice(0, range.from) + JSON.stringify(value) + source.slice(range.to),
  );
}

export function updateInlineSignatureImage(bytes: Uint8Array, relative: string): Uint8Array {
  return replace(bytes, inlineSignatureImage(bytes), relative);
}

export function updateInlineSignatureName(bytes: Uint8Array, name: string): Uint8Array {
  return replace(bytes, inlineSignatureName(bytes), name);
}

export function updateOrderSignatoryName(bytes: Uint8Array, name: string): Uint8Array {
  return replace(bytes, orderSignatoryName(bytes), name);
}
