import { MAX_FILE, settingsPath } from "./project";
import {
  inlineSignatureImage,
  inlineSignatureName,
  updateInlineSignatureImage,
  updateInlineSignatureName,
} from "./signature-source";
import { settingValue, updateThemeSettings } from "./theme-settings";
import type { Files } from "./types";

export function signatureName(files: Files, template: string) {
  const inline = inlineSignatureName(files[template]);
  if (inline) return { path: template, value: inline.value, inline: true };
  const path = settingsPath(files, template);
  const value = path ? settingValue(files[path], "signature-name") : undefined;
  try {
    if (path && value?.startsWith('"'))
      return { path, value: JSON.parse(value) as string, inline: false };
  } catch {
    /* Calculated or incomplete names stay in source editing. */
  }
}

export function updateSignatureName(files: Files, template: string, name: string): Files {
  const reference = signatureName(files, template);
  if (!reference) throw new Error("Edit the printed signature name in Template or Settings.");
  return {
    ...files,
    [reference.path]: reference.inline
      ? updateInlineSignatureName(files[reference.path], name)
      : updateThemeSettings(files[reference.path], { "signature-name": JSON.stringify(name) }),
  };
}

export function themeImage(files: Files, template: string, kind: string) {
  const inline = kind === "signature" ? inlineSignatureImage(files[template]) : undefined;
  if (inline) return { path: template, relative: inline.relative, inline: true };
  const path = settingsPath(files, template);
  const expression = path ? settingValue(files[path], kind) : undefined;
  const relative = expression?.match(/^image\("([^"\r\n]+)"/)?.[1];
  return path && relative ? { path, relative, inline: false } : undefined;
}

export function updateThemeImage(
  files: Files,
  template: string,
  kind: string,
  asset: string,
): Files {
  const reference = themeImage(files, template, kind);
  if (!reference) throw new Error(`Edit the ${kind} image in Template or Settings.`);
  const relative = relativeImage(reference.path, asset);
  if (reference.inline)
    return {
      ...files,
      [reference.path]: updateInlineSignatureImage(files[reference.path], relative),
    };
  const expression = settingValue(files[reference.path], kind);
  if (!expression) throw new Error(`Edit ${kind} in Settings.`);
  return {
    ...files,
    [reference.path]: updateThemeSettings(files[reference.path], {
      [kind]: expression.replace(/^image\("[^"\r\n]+"/, `image(${JSON.stringify(relative)}`),
    }),
  };
}

export async function imageBytes(file: File): Promise<Uint8Array> {
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type))
    throw new Error("Choose a PNG, JPEG, WebP, or SVG image.");
  if (file.size > MAX_FILE) throw new Error("Images must be smaller than 12 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 16_000_000)
      throw new Error("Images must contain at most 16 megapixels.");
    return new Uint8Array(await file.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function relativeImage(settings: string, asset: string): string {
  const from = settings.split("/").slice(0, -1),
    to = asset.split("/");
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return [...from.map(() => ".."), ...to].join("/");
}
export function imagePath(settings: string, relative: string): string | undefined {
  const parts = relative.startsWith("/") ? [] : settings.split("/").slice(0, -1);
  for (const part of relative.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return undefined;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
