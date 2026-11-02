import { decoder, encoder } from "./project";
import { sourceCode } from "./source-text";

type SignatureImage = { relative: string; from: number; to: number };

// Support one direct image argument in one signature block. Calculated paths,
// multiple blocks and incomplete source remain under the author's control.
export function inlineSignatureImage(bytes: Uint8Array): SignatureImage | undefined {
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
      const match = /^signature\s*:\s*image\s*\(/.exec(code.slice(end));
      if (match) candidates.push(end + match[0].length);
    }
    const char = code[end];
    if ("([{".includes(char)) stack.push(char);
    else if (")]}".includes(char)) {
      if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[char]) return;
    }
  }
  if (stack.length || candidates.length !== 1) return;
  const fromImage = candidates[0];
  const match = /^(\s*)("(?:[^"\\]|\\.)*")\s*(?=[,)])/.exec(
    sourceCode(source).slice(fromImage, end),
  );
  if (!match) return;
  try {
    const relative: string = JSON.parse(match[2]);
    const from = fromImage + match[1].length;
    return { relative, from, to: from + match[2].length };
  } catch {
    return;
  }
}

export function updateInlineSignatureImage(bytes: Uint8Array, relative: string): Uint8Array {
  const image = inlineSignatureImage(bytes);
  if (!image) throw new Error("Edit the signature image path in Template.");
  const source = decoder.decode(bytes);
  return encoder.encode(
    source.slice(0, image.from) + JSON.stringify(relative) + source.slice(image.to),
  );
}
