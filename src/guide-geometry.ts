import type { RenderSummary } from "./types";

// Only validated report evidence can describe the pages being displayed.
export function guideGeometry(
  summary: RenderSummary | undefined,
  pages: number,
): Record<string, number> {
  const address = summary?.measurements.address?.[0];
  if (
    !address ||
    !Number.isInteger(address.page) ||
    Number(address.page) < 1 ||
    Number(address.page) > pages
  )
    return {};
  const fields = {
    PAGE: "page",
    WINDOW_X: "window_x_pt",
    WINDOW_Y: "window_y_pt",
    WINDOW_WIDTH: "window_width_pt",
    WINDOW_HEIGHT: "window_height_pt",
    WINDOW_PADDING: "window_padding_pt",
    ADDRESS_X: "x_pt",
    ADDRESS_Y: "y_pt",
    ADDRESS_WIDTH: "width_pt",
    ADDRESS_HEIGHT: "height_pt",
  };
  const geometry: Record<string, number> = {};
  for (const [target, source] of Object.entries(fields)) {
    const value = address[source];
    if (typeof value !== "number" || !Number.isFinite(value)) return {};
    geometry[target] = value;
  }
  return geometry;
}
