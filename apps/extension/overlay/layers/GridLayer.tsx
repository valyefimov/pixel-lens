import { useOverlay } from "../store";

/** Column grid overlay, centred like a typical `max-width` container. */
export function GridLayer() {
  const on = useOverlay((s) => s.grid);
  const grid = useOverlay((s) => s.prefs.grid);
  useOverlay((s) => s.frame);
  if (!on) return null;

  const container = Math.min(grid.maxWidth, innerWidth) - grid.margin * 2;
  const left = (innerWidth - container) / 2;
  const col = (container - grid.gutter * (grid.columns - 1)) / grid.columns;

  return (
    <svg className="pl-svg">
      {Array.from({ length: grid.columns }, (_, i) => (
        <rect
          key={i}
          x={left + i * (col + grid.gutter)}
          y={0}
          width={Math.max(0, col)}
          height={innerHeight}
          fill={grid.color}
          fillOpacity={0.1}
          stroke={grid.color}
          strokeOpacity={0.35}
          shapeRendering="crispEdges"
        />
      ))}
    </svg>
  );
}
