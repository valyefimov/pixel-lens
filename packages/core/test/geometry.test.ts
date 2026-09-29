import { describe, expect, it } from "vitest";
import { formatPx, measureBetween, rectFromPoints, snap } from "../src/geometry";

describe("measureBetween", () => {
  it("measures a horizontal gap between side-by-side boxes", () => {
    const spans = measureBetween({ x: 0, y: 0, width: 100, height: 50 }, { x: 124, y: 10, width: 40, height: 20 });
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ axis: "x", length: 24 });
    // anchored in the middle of the vertical overlap (10..30)
    expect(spans[0]!.from.y).toBe(20);
  });

  it("measures both gaps for diagonal boxes", () => {
    const spans = measureBetween({ x: 0, y: 0, width: 10, height: 10 }, { x: 30, y: 50, width: 10, height: 10 });
    expect(spans.map((s) => [s.axis, s.length])).toEqual([
      ["x", 20],
      ["y", 40],
    ]);
  });

  it("measures inner offsets when one box contains the other", () => {
    const spans = measureBetween({ x: 10, y: 20, width: 80, height: 60 }, { x: 0, y: 0, width: 100, height: 100 });
    expect(spans.map((s) => s.length)).toEqual([20, 20, 10, 10]);
  });

  it("ignores zero-length edges", () => {
    const spans = measureBetween({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 50 });
    expect(spans.map((s) => s.length)).toEqual([50]);
  });
});

describe("helpers", () => {
  it("normalises rects drawn in any direction", () => {
    expect(rectFromPoints({ x: 50, y: 40 }, { x: 10, y: 0 })).toEqual({ x: 10, y: 0, width: 40, height: 40 });
  });

  it("formats pixels without trailing zeros", () => {
    expect(formatPx(12)).toBe("12");
    expect(formatPx(12.46)).toBe("12.5");
  });

  it("snaps to the closest candidate within the threshold", () => {
    expect(snap(103, [0, 100, 105])).toEqual({ value: 105, snapped: true });
    expect(snap(50, [0, 100])).toEqual({ value: 50, snapped: false });
  });
});
