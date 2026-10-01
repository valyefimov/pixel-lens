import type { Rect } from "@pixel-lens/core";

export const COLORS = {
  accent: "#7C5CFF",
  measure: "#FF2D78",
  guide: "#00B3FF",
  margin: "rgba(246, 178, 107, 0.35)",
  border: "rgba(255, 229, 153, 0.45)",
  padding: "rgba(147, 196, 125, 0.4)",
  content: "rgba(111, 168, 220, 0.35)",
};

/** A pill-shaped label rendered in SVG, centred on (x, y). */
export function Label({
  x,
  y,
  text,
  color = COLORS.measure,
  anchor = "middle",
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  anchor?: "middle" | "start" | "end";
}) {
  const width = text.length * 6.6 + 10;
  const left = anchor === "middle" ? x - width / 2 : anchor === "start" ? x : x - width;
  // Keep labels on screen.
  const clampedLeft = Math.max(2, Math.min(innerWidth - width - 2, left));
  const top = Math.max(2, Math.min(innerHeight - 20, y - 9));
  return (
    <g className="pl-label">
      <rect x={clampedLeft} y={top} width={width} height={18} rx={4} fill={color} />
      <text x={clampedLeft + width / 2} y={top + 12.5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

export function Box({ rect, fill, stroke, dash }: { rect: Rect; fill?: string; stroke?: string; dash?: boolean }) {
  return (
    <rect
      x={rect.x + 0.5}
      y={rect.y + 0.5}
      width={Math.max(0, rect.width - 1)}
      height={Math.max(0, rect.height - 1)}
      fill={fill ?? "none"}
      stroke={stroke ?? "none"}
      strokeDasharray={dash ? "4 3" : undefined}
      shapeRendering="crispEdges"
    />
  );
}

/** Draws the area between an outer and inner rect (a "frame"), used for margin/padding shading. */
export function Frame({ outer, inner, fill }: { outer: Rect; inner: Rect; fill: string }) {
  const d = [
    `M${outer.x},${outer.y}h${outer.width}v${outer.height}h${-outer.width}z`,
    `M${inner.x},${inner.y}v${inner.height}h${inner.width}v${-inner.height}z`,
  ].join("");
  return <path d={d} fill={fill} fillRule="evenodd" />;
}
