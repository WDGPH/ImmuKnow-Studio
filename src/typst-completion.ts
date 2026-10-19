import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { functionCatalog } from "./typst-catalog";
import { typstCodeAt } from "./typst-language";

const functions: Completion[] = Object.entries(functionCatalog).map(([label, help]) => ({
  label,
  type: "function",
  detail: label.startsWith("immuknow.") ? "ImmuKnow" : help.reference ? "Typst" : "Settings helper",
  info: `${help.description}\n\n${help.example}`,
}));

// Ignore punctuation inside strings and comments when finding the enclosing call.
function callBefore(context: CompletionContext, position: number) {
  const source = context.state.doc.sliceString(0, position).split("");
  const tree = ensureSyntaxTree(context.state, position, 50) ?? syntaxTree(context.state);
  tree.iterate({
    to: position,
    enter(node) {
      if (!/^(string|comment)/i.test(node.name)) return;
      source.fill(" ", node.from, Math.min(node.to, position));
      return false;
    },
  });
  const code = source.join("");
  const openings: { char: string; position: number }[] = [];
  for (let index = 0; index < code.length; index++) {
    const char = code[index];
    if ("([{".includes(char)) openings.push({ char, position: index });
    else if ("])}".includes(char)) openings.pop();
  }
  const opening = openings.at(-1);
  if (opening?.char !== "(") return null;
  const name = /([a-zA-Z][\w-]*(?:\.[\w-]+)*)\s*$/.exec(code.slice(0, opening.position))?.[1];
  if (!name) return null;
  const base = name.replace(/\.with$/, "");
  if (!Object.hasOwn(functionCatalog, base)) return null;
  const used = new Set<string>();
  let depth = 0;
  let argumentStart = opening.position + 1;
  for (let index = argumentStart; index <= code.length; index++) {
    const char = code[index];
    if (index === code.length || (char === "," && depth === 0)) {
      const named = /^\s*([\w-]+)\s*:/.exec(code.slice(argumentStart, index));
      if (named) used.add(named[1]);
      if (index < code.length) argumentStart = index + 1;
    } else if ("([{".includes(char)) depth++;
    else if ("])}".includes(char)) depth--;
  }
  return { help: functionCatalog[base], used, argumentStart };
}

export function typstCompletion(context: CompletionContext): CompletionResult | null {
  if (context.state.readOnly) return null;
  const source = context.state.doc.toString();
  if (!typstCodeAt(source, context.pos)) return null;
  const word = context.matchBefore(/[a-zA-Z][\w-]*(?:\.[\w-]*)*/);
  const from = word?.from ?? context.pos;
  const call = callBefore(context, from);
  if (call && /^\s*$/.test(source.slice(call.argumentStart, from))) {
    const parameters: Completion[] = (call.help.namedParameters ?? [])
      .filter((name) => !call.used.has(name))
      .map((label) => ({
        label,
        apply: `${label}: `,
        type: "property",
        detail: "named option",
        boost: 1,
        info: call.help.parameters.find(([name]) => name === label)?.[1],
      }));
    // A new argument can also be a positional function call, such as text(str(42)).
    if (parameters.length)
      return { from, options: [...parameters, ...functions], validFor: /^[\w.-]*$/ };
  }
  if (!word && source[context.pos - 1] !== "#" && !context.explicit) return null;
  return { from, options: functions, validFor: /^[\w.-]*$/ };
}
