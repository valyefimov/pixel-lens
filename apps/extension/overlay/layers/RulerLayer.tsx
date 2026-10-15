import { useRef, type PointerEvent as RPointerEvent, type ReactElement } from "react";
import { type Point, bottom, formatPx, rectFromPoints, right, snap } from "@pixel-lens/core";
import { elementAt, rectOf } from "@/lib/dom";
import { nextGuideId, store, useOverlay } from "../store";
import { COLORS, Label } from "../ui/svg";

const RULER = 18;

/** Edges of the element under the pointer and its ancestors, used for snapping. */
function snapEdges(p: Point): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  let el = elementAt(p.x, p.y);
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    const r = rectOf(el);
    xs.push(r.x, right(r));
    ys.push(r.y, bottom(r));
  }
  for (const g of store.get().guides) (g.axis === "x" ? xs : ys).push(g.pos);
  return { xs, ys };
}

function snapPoint(p: Point, enabled: boolean): Point {
  if (!enabled) return p;
  const { xs, ys } = snapEdges(p);
  return { x: snap(p.x, xs, 5).value, y: snap(p.y, ys, 5).value };
}

/** Canvas-free ruler strips along the top and left edges with tick marks every 10px. */
function Ticks({ axis }: { axis: "x" | "y" }) {
  const length = axis === "x" ? innerWidth : innerHeight;
  const offset = axis === "x" ? scrollX : scrollY;
  const ticks: ReactElement[] = [];
  const start = Math.floor(offset / 10) * 10;
  for (let v = start; v - offset < length; v += 10) {
    const pos = v - offset;
    const major = v % 100 === 0;
    const size = major ? RULER : v % 50 === 0 ? 8 : 4;
    ticks.push(
      axis === "x" ? (
        <g key={v}>
          <line x1={pos} y1={RULER - size} x2={pos} y2={RULER} />
          {major && <text x={pos + 3} y={9}>{v}</text>}
        </g>
      ) : (
        <g key={v}>
          <line y1={pos} x1={RULER - size} y2={pos} x2={RULER} />
          {major && (
            <text x={9} y={pos + 3} transform={`rotate(-90 9 ${pos + 3})`} textAnchor="end">
              {v}
            </text>
          )}
        </g>
      ),
    );
  }
  return <g className="pl-ticks">{ticks}</g>;
}

export function RulerLayer() {
  const tool = useOverlay((s) => s.tool);
  const guides = useOverlay((s) => s.guides);
  const draft = useOverlay((s) => s.rulerDraft);
  const rulers = useOverlay((s) => s.rulers);
  const snapOn = useOverlay((s) => s.prefs.snapToElements);
  useOverlay((s) => s.frame);
  const dragging = useRef<{ kind: "rect" } | { kind: "guide"; id: number } | null>(null);

  const active = tool === "ruler";
  if (!active && guides.length === 0 && rulers.length === 0) return null;

  const onDown = (e: RPointerEvent) => {
    if (!active || e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = snapPoint({ x: e.clientX, y: e.clientY }, snapOn && !e.altKey);
    // Clicking on a ruler strip spawns a guide.
    if (e.clientY < RULER || e.clientX < RULER) {
      const axis = e.clientY < RULER ? "y" : "x";
      const id = nextGuideId();
      store.set((s) => ({ guides: [...s.guides, { id, axis, pos: axis === "x" ? p.x : p.y }] }));
      dragging.current = { kind: "guide", id };
      return;
    }
    dragging.current = { kind: "rect" };
    store.set({ rulerDraft: { from: p, to: p } });
  };

  const onMove = (e: RPointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const p = snapPoint({ x: e.clientX, y: e.clientY }, snapOn && !e.altKey);
    if (d.kind === "guide") {
      store.set((s) => ({ guides: s.guides.map((g) => (g.id === d.id ? { ...g, pos: g.axis === "x" ? p.x : p.y } : g)) }));
    } else {
      const from = store.get().rulerDraft?.from ?? p;
      // Shift constrains to a square.
      let to = p;
      if (e.shiftKey) {
        const size = Math.max(Math.abs(p.x - from.x), Math.abs(p.y - from.y));
        to = { x: from.x + Math.sign(p.x - from.x || 1) * size, y: from.y + Math.sign(p.y - from.y || 1) * size };
      }
      store.set({ rulerDraft: { from, to } });
    }
  };

  const onUp = (e: RPointerEvent) => {
    // Browsers may coalesce the last pointermoves into the release, so apply the final position first.
    onMove(e);
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    if (d.kind === "guide") {
      // Dropping a guide back on a ruler removes it.
      if (e.clientY < RULER || e.clientX < RULER) store.set((s) => ({ guides: s.guides.filter((g) => g.id !== d.id) }));
      return;
    }
    const draftNow = store.get().rulerDraft;
    store.set({ rulerDraft: null });
    if (!draftNow) return;
    const r = rectFromPoints(draftNow.from, draftNow.to);
    if (r.width < 2 && r.height < 2) return;
    // Keep up to 8 measurements on screen; Shift adds, otherwise replace.
    store.set((s) => ({ rulers: e.shiftKey ? [...s.rulers, draftNow].slice(-8) : [draftNow] }));
  };

  const onGuideDown = (id: number) => (e: RPointerEvent) => {
    if (!active) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragging.current = { kind: "guide", id };
  };

  const xs = guides.filter((g) => g.axis === "x").sort((a, b) => a.pos - b.pos);
  const ys = guides.filter((g) => g.axis === "y").sort((a, b) => a.pos - b.pos);

  return (
    <svg
      className={`pl-svg ${active ? "pl-interactive pl-crosshair" : ""}`}
      onPointerDown={onDown}
      // Without this the browser may start a native text selection or drag and cancel the pointer mid-gesture.
      onMouseDown={(e) => active && e.preventDefault()}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {[...rulers, ...(draft ? [draft] : [])].map((m, i) => {
        const r = rectFromPoints(m.from, m.to);
        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.width} height={r.height} fill="rgba(255,45,120,0.08)" stroke={COLORS.measure} shapeRendering="crispEdges" />
            <Label x={r.x + r.width / 2} y={r.y + r.height + 14} text={`${formatPx(r.width)} × ${formatPx(r.height)}`} />
          </g>
        );
      })}

      {guides.map((g) => (
        <g key={g.id} className={active ? "pl-guide" : undefined} onPointerDown={onGuideDown(g.id)}>
          {g.axis === "x" ? (
            <>
              <line x1={g.pos} y1={0} x2={g.pos} y2={innerHeight} stroke="transparent" strokeWidth={9} />
              <line x1={g.pos} y1={0} x2={g.pos} y2={innerHeight} stroke={COLORS.guide} shapeRendering="crispEdges" />
            </>
          ) : (
            <>
              <line x1={0} y1={g.pos} x2={innerWidth} y2={g.pos} stroke="transparent" strokeWidth={9} />
              <line x1={0} y1={g.pos} x2={innerWidth} y2={g.pos} stroke={COLORS.guide} shapeRendering="crispEdges" />
            </>
          )}
        </g>
      ))}
      {/* Distances between neighbouring guides */}
      {xs.slice(1).map((g, i) => (
        <Label key={`dx${g.id}`} x={(xs[i]!.pos + g.pos) / 2} y={RULER + 16} text={formatPx(g.pos - xs[i]!.pos)} color={COLORS.guide} />
      ))}
      {ys.slice(1).map((g, i) => (
        <Label key={`dy${g.id}`} x={RULER + 8} y={(ys[i]!.pos + g.pos) / 2} text={formatPx(g.pos - ys[i]!.pos)} color={COLORS.guide} anchor="start" />
      ))}

      {active && (
        <g className="pl-rulers">
          <rect x={0} y={0} width={innerWidth} height={RULER} />
          <rect x={0} y={0} width={RULER} height={innerHeight} />
          <g transform="translate(0,0)">
            <Ticks axis="x" />
            <Ticks axis="y" />
          </g>
          <rect x={0} y={0} width={RULER} height={RULER} className="pl-ruler-corner" />
        </g>
      )}
    </svg>
  );
}
