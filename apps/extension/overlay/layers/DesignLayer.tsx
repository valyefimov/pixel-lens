import { useEffect, useRef, type PointerEvent as RPointerEvent } from "react";
import { store, useOverlay } from "../store";

/**
 * Pixel-perfect comparison: lays a design export (PNG/JPG/SVG) over the live page.
 * Drag to align, nudge with arrow keys, toggle "difference" blending to see every
 * mismatched pixel light up.
 *
 * Rendered into its own light-DOM host (not the overlay's shadow root): the overlay host is a
 * stacking context, which would isolate `mix-blend-mode` from the page underneath.
 */
export function DesignLayer({ host }: { host: HTMLElement }) {
  const design = useOverlay((s) => s.design);
  const open = useOverlay((s) => s.open);
  useOverlay((s) => s.frame);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    host.style.mixBlendMode = design?.difference ? "difference" : "normal";
    host.style.display = design && open ? "block" : "none";
  }, [host, design?.difference, design, open]);

  if (!design) return null;

  const onDown = (e: RPointerEvent) => {
    if (design.locked || e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: design.x, oy: design.y };
  };
  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const cur = store.get().design;
    if (cur) store.set({ design: { ...cur, x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y } });
  };
  const onUp = () => {
    drag.current = null;
  };

  const top = design.attachToPage ? design.y - scrollY : design.y;
  const left = design.attachToPage ? design.x - scrollX : design.x;

  return (
    <img
      src={design.src}
      alt=""
      draggable={false}
      className="pl-design"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{
        position: "absolute",
        transformOrigin: "0 0",
        maxWidth: "none",
        pointerEvents: design.locked ? "none" : "auto",
        cursor: design.locked ? "default" : "grab",
        userSelect: "none",
        left,
        top,
        opacity: design.opacity,
        transform: `scale(${design.scale})`,
      }}
    />
  );
}
