import { type Rect, formatPx, measureBetween } from "@pixel-lens/core";
import { boxModel, rectOf, shortLabel } from "@/lib/dom";
import { useOverlay } from "../store";
import { Box, COLORS, Frame, Label } from "../ui/svg";

function inset(r: Rect, [t, rt, b, l]: [number, number, number, number]): Rect {
  return { x: r.x + l, y: r.y + t, width: Math.max(0, r.width - l - rt), height: Math.max(0, r.height - t - b) };
}
function outset(r: Rect, [t, rt, b, l]: [number, number, number, number]): Rect {
  return { x: r.x - l, y: r.y - t, width: r.width + l + rt, height: r.height + t + b };
}

/** DevTools-style box model shading: margin, border, padding, content. */
function BoxModelShading({ el }: { el: Element }) {
  const border = rectOf(el);
  const box = boxModel(el);
  const margin = outset(border, box.margin);
  const padding = inset(border, box.border);
  const content = inset(padding, box.padding);
  return (
    <g>
      <Frame outer={margin} inner={border} fill={COLORS.margin} />
      <Frame outer={border} inner={padding} fill={COLORS.border} />
      <Frame outer={padding} inner={content} fill={COLORS.padding} />
      <Box rect={content} fill={COLORS.content} />
    </g>
  );
}

function SizeBadge({ el, color }: { el: Element; color: string }) {
  const r = rectOf(el);
  const text = `${shortLabel(el)}  ${formatPx(r.width)} × ${formatPx(r.height)}`;
  const below = r.y < 24;
  return <Label x={r.x} y={below ? r.y + r.height + 12 : r.y - 12} text={text} color={color} anchor="start" />;
}

/** Red measurement lines between the selected element and the hovered one. */
function Distances({ a, b }: { a: Element; b: Element }) {
  const ra = rectOf(a);
  const rb = rectOf(b);
  const spans = measureBetween(ra, rb);
  return (
    <g>
      <Box rect={rb} stroke={COLORS.measure} dash />
      {spans.map((s, i) => {
        const mx = (s.from.x + s.to.x) / 2;
        const my = (s.from.y + s.to.y) / 2;
        return (
          <g key={i}>
            <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke={COLORS.measure} strokeWidth={1} shapeRendering="crispEdges" />
            {/* end caps */}
            {s.axis === "x" ? (
              <>
                <line x1={s.from.x} y1={s.from.y - 4} x2={s.from.x} y2={s.from.y + 4} stroke={COLORS.measure} />
                <line x1={s.to.x} y1={s.to.y - 4} x2={s.to.x} y2={s.to.y + 4} stroke={COLORS.measure} />
              </>
            ) : (
              <>
                <line x1={s.from.x - 4} y1={s.from.y} x2={s.from.x + 4} y2={s.from.y} stroke={COLORS.measure} />
                <line x1={s.to.x - 4} y1={s.to.y} x2={s.to.x + 4} y2={s.to.y} stroke={COLORS.measure} />
              </>
            )}
            <Label x={s.axis === "x" ? mx : mx + 6} y={s.axis === "x" ? my - 12 : my} text={formatPx(s.length)} anchor={s.axis === "x" ? "middle" : "start"} />
          </g>
        );
      })}
    </g>
  );
}

export function ElementLayer() {
  const hovered = useOverlay((s) => s.hovered);
  const selected = useOverlay((s) => s.selected);
  const pinned = useOverlay((s) => s.pinned);
  const tool = useOverlay((s) => s.tool);
  const altDown = useOverlay((s) => s.altDown);
  useOverlay((s) => s.frame); // re-render on scroll/resize

  const elementTool = tool === "inspect" || tool === "measure" || tool === "edit";
  if (!elementTool) return null;

  // Measure tool: always show distances (to the parent when nothing is selected).
  // Inspect/edit: hold Alt, like Figma.
  const anchor = selected ?? (tool === "measure" ? (hovered?.parentElement ?? null) : null);
  const showDistances = anchor && hovered && hovered !== anchor && (tool === "measure" || altDown);

  return (
    <g>
      {pinned.map((el, i) => (
        <Box key={i} rect={rectOf(el)} stroke={COLORS.accent} dash />
      ))}
      {hovered && hovered !== selected && !showDistances && (
        <>
          <BoxModelShading el={hovered} />
          <SizeBadge el={hovered} color={COLORS.accent} />
        </>
      )}
      {selected && (
        <>
          <Box rect={rectOf(selected)} stroke={COLORS.accent} />
          <SizeBadge el={selected} color={COLORS.accent} />
        </>
      )}
      {showDistances && <Distances a={anchor} b={hovered} />}
    </g>
  );
}
