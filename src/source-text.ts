// Preserve UTF-16 offsets while hiding nested comments and, optionally, strings.
export function sourceCode(source: string, hideStrings = false): string {
  const code = source.split("");
  const hide = (from: number, to: number) => {
    for (let i = from; i < Math.min(to, code.length); i++)
      if (!/[\r\n]/.test(code[i])) code[i] = " ";
  };
  for (let i = 0; i < source.length; ) {
    const start = i;
    if (source.startsWith("//", i)) {
      while (i < source.length && !/[\r\n]/.test(source[i])) i++;
      hide(start, i);
    } else if (source.startsWith("/*", i)) {
      let depth = 1;
      i += 2;
      while (i < source.length && depth) {
        if (source.startsWith("/*", i)) {
          depth++;
          i += 2;
        } else if (source.startsWith("*/", i)) {
          depth--;
          i += 2;
        } else i++;
      }
      hide(start, i);
    } else if (source[i] === '"') {
      i++;
      while (i < source.length && source[i] !== '"') i += source[i] === "\\" ? 2 : 1;
      i++;
      if (hideStrings) hide(start, i);
    } else if (source[i] === "`") {
      const fence = source.slice(i).match(/^`+/)?.[0] ?? "`";
      const end = source.indexOf(fence, i + fence.length);
      i = end < 0 ? source.length : end + fence.length;
      hide(start, i);
    } else i++;
  }
  return code.join("");
}
