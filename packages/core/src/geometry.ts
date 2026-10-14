/** An axis-aligned rectangle in CSS pixels, relative to the viewport. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A single measured span between two edges, ready to be drawn as a line + label. */
export interface Span {
  axis: "x" | "y";
  /** Start point of the line. */
  from: Point;
  /** End point of the line. */
  to: Point;
  /** Length in CSS pixels (always >= 0). */
  length: number;
}

export const right = (r: Rect) => r.x + r.width;
export const bottom = (r: Rect) => r.y + r.height;
export const centerX = (r: Rect) => r.x + r.width / 2;
export const centerY = (r: Rect) => r.y + r.height / 2;

export function toRect(r: { left: number; top: number; width: number; height: number }): Rect {
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    right(inner) <= right(outer) &&
    bottom(inner) <= bottom(outer)
  );
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
}

export function overlapX(a: Rect, b: Rect): [number, number] | null {
  const start = Math.max(a.x, b.x);
  const end = Math.min(right(a), right(b));
  return end > start ? [start, end] : null;
}

export function overlapY(a: Rect, b: Rect): [number, number] | null {
  const start = Math.max(a.y, b.y);
  const end = Math.min(bottom(a), bottom(b));
  return end > start ? [start, end] : null;
}

/**
 * Measures the distances between a `selected` rect and a `target` rect,
 * the same way design tools do when you hold Alt:
 *
 * - If one rect contains the other, returns the four inner gaps (top/right/bottom/left).
 * - Otherwise returns the horizontal and/or vertical gaps between their closest edges.
 *   Lines are anchored to the middle of the overlapping range when the rects overlap
 *   on the opposite axis, or to the selected rect's centre otherwise.
 */
export function measureBetween(selected: Rect, target: Rect): Span[] {
  const spans: Span[] = [];

  const outer = contains(target, selected) ? target : contains(selected, target) ? selected : null;
  if (outer) {
    const inner = outer === target ? selected : target;
    const cx = centerX(inner);
    const cy = centerY(inner);
    pushSpan(spans, "y", { x: cx, y: outer.y }, { x: cx, y: inner.y });
    pushSpan(spans, "y", { x: cx, y: bottom(inner) }, { x: cx, y: bottom(outer) });
    pushSpan(spans, "x", { x: outer.x, y: cy }, { x: inner.x, y: cy });
    pushSpan(spans, "x", { x: right(inner), y: cy }, { x: right(outer), y: cy });
    return spans;
  }

  // Horizontal gap
  const oy = overlapY(selected, target);
  const lineY = oy ? (oy[0] + oy[1]) / 2 : centerY(selected);
  if (right(selected) <= target.x) {
    pushSpan(spans, "x", { x: right(selected), y: lineY }, { x: target.x, y: lineY });
  } else if (right(target) <= selected.x) {
    pushSpan(spans, "x", { x: right(target), y: lineY }, { x: selected.x, y: lineY });
  }

  // Vertical gap
  const ox = overlapX(selected, target);
  const lineX = ox ? (ox[0] + ox[1]) / 2 : centerX(selected);
  if (bottom(selected) <= target.y) {
    pushSpan(spans, "y", { x: lineX, y: bottom(selected) }, { x: lineX, y: target.y });
  } else if (bottom(target) <= selected.y) {
    pushSpan(spans, "y", { x: lineX, y: bottom(target) }, { x: lineX, y: selected.y });
  }

  // Overlapping, non-nested rects: report edge offsets instead.
  if (spans.length === 0) {
    const cx = ox ? (ox[0] + ox[1]) / 2 : centerX(selected);
    const cy = oy ? (oy[0] + oy[1]) / 2 : centerY(selected);
    pushSpan(spans, "x", { x: Math.min(selected.x, target.x), y: cy }, { x: Math.max(selected.x, target.x), y: cy });
    pushSpan(spans, "y", { x: cx, y: Math.min(selected.y, target.y) }, { x: cx, y: Math.max(selected.y, target.y) });
  }

  return spans;
}

function pushSpan(spans: Span[], axis: "x" | "y", from: Point, to: Point) {
  const length = axis === "x" ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
  if (length > 0.01) spans.push({ axis, from, to, length });
}

/** Rounds to at most `digits` decimals and drops trailing zeros: 12.50 -> "12.5". */
export function formatPx(value: number, digits = 1): string {
  const f = 10 ** digits;
  return String(Math.round(value * f) / f);
}

/** Snaps `value` to the nearest candidate within `threshold`, otherwise returns it unchanged. */
export function snap(value: number, candidates: readonly number[], threshold = 4): { value: number; snapped: boolean } {
  let best = value;
  let bestDist = threshold + 1;
  for (const c of candidates) {
    const d = Math.abs(c - value);
    if (d <= threshold && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return { value: best, snapped: bestDist <= threshold };
}
