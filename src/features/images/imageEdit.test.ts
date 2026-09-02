import { describe, expect, it } from "vitest";
import { FULL_CROP, cropFromPoints, orientedDimensions, previewDimensions, validCrop } from "./imageEdit";

describe("image edit geometry", () => {
  it("builds a normalized crop regardless of drag direction", () => {
    expect(cropFromPoints({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 })).toEqual({
      x: 0.2, y: 0.1, width: 0.6000000000000001, height: 0.6,
    });
  });

  it("clamps crop points to the image", () => {
    expect(cropFromPoints({ x: -1, y: 0.25 }, { x: 2, y: 0.75 }))
      .toEqual({ x: 0, y: 0.25, width: 1, height: 0.5 });
    expect(validCrop({ x: 0.2, y: 0.2, width: 0.001, height: 0.5 })).toBe(FULL_CROP);
  });

  it("swaps dimensions after a quarter turn and bounds previews", () => {
    expect(orientedDimensions(1200, 800, 1)).toEqual({ width: 800, height: 1200 });
    expect(orientedDimensions(1200, 800, 2)).toEqual({ width: 1200, height: 800 });
    expect(previewDimensions(2400, 1200, 0)).toEqual({ width: 960, height: 480 });
  });
});
