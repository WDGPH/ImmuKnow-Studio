import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { hoverTooltip } from "@codemirror/view";

import { functionCatalog } from "./typst-catalog";

export function functionHelp(state: EditorState, position: number) {
  const line = state.doc.lineAt(position);
  for (const match of line.text.matchAll(
    /#?(?:[a-zA-Z][\w-]*\.)*[a-zA-Z][\w-]*(?=\s*(?:[([]|$))/g,
  )) {
    const from = line.from + match.index,
      to = from + match[0].length;
    if (position < from || position > to) continue;
    const name = match[0].replace(/^#/, "").replace(/\.with$/, "");
    if (!Object.hasOwn(functionCatalog, name)) continue;
    const node = syntaxTree(state).resolveInner(from + 1, 1);
    if (!/^(variableName(?:\.function)?|namespace|keyword)$/i.test(node.name)) return;
    return { from, to, name, help: functionCatalog[name] };
  }
}

export const typstHelp = hoverTooltip(
  (view, position, side) => {
    const found = functionHelp(view.state, position);
    if (!found || (position === found.from && side < 0) || (position === found.to && side > 0))
      return null;
    return {
      pos: found.from,
      end: found.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "function-help";
        dom.setAttribute("role", "tooltip");
        const title = document.createElement("code");
        title.textContent = `#${found.name}`;
        const description = document.createElement("p");
        description.textContent = found.help.description;
        dom.append(title, description);
        const parameters = document.createElement("dl");
        for (const [name, explanation] of found.help.parameters) {
          const label = document.createElement("dt"),
            detail = document.createElement("dd");
          label.textContent = name;
          detail.textContent = explanation;
          parameters.append(label, detail);
        }
        const example = document.createElement("pre");
        example.textContent = found.help.example;
        dom.append(parameters, example);
        if (found.help.reference) {
          const reference = document.createElement("a");
          reference.textContent = "Typst reference";
          reference.href = `https://typst.app/docs/reference/${found.help.reference}`;
          reference.target = "_blank";
          reference.rel = "noopener noreferrer";
          dom.append(reference);
        }
        return { dom };
      },
    };
  },
  { hoverTime: 350 },
);
