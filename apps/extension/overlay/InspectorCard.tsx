import { useLayoutEffect, useRef, useState } from "react";
import { contrastRatio, formatPx, parseColor, shorthand, splitFontFamily, toTailwind, wcagLevel } from "@pixel-lens/core";
import { boxModel, effectiveBackground, keyStyles, ownText, rectOf, selectorFor, shortLabel } from "@/lib/dom";
import { copy, store, useOverlay } from "./store";
import { cssBlock, formatColor, num } from "./ui/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pl-row">
      <span className="pl-row-label">{label}</span>
      <span className="pl-row-value">{children}</span>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  const fmt = useOverlay((s) => s.prefs.colorFormat);
  const value = formatColor(color, fmt);
  return (
    <button className="pl-swatch-btn" onClick={() => copy(value, `Copied ${value}`)} title="Copy color">
      <span className="pl-swatch" style={{ background: color }} />
      <span className="pl-mono">{value}</span>
    </button>
  );
}

function BoxDiagram({ el }: { el: Element }) {
  const b = boxModel(el);
  const r = rectOf(el);
  const cw = r.width - b.border[1] - b.border[3] - b.padding[1] - b.padding[3];
  const ch = r.height - b.border[0] - b.border[2] - b.padding[0] - b.padding[2];
  const v = (n: number) => (n ? formatPx(n) : "–");
  const Sides = ({ s }: { s: [number, number, number, number] }) => (
    <>
      <span className="pl-bm-t">{v(s[0])}</span>
      <span className="pl-bm-r">{v(s[1])}</span>
      <span className="pl-bm-b">{v(s[2])}</span>
      <span className="pl-bm-l">{v(s[3])}</span>
    </>
  );
  return (
    <div className="pl-bm pl-bm-margin">
      <span className="pl-bm-name">margin</span>
      <Sides s={b.margin} />
      <div className="pl-bm pl-bm-border">
        <span className="pl-bm-name">border</span>
        <Sides s={b.border} />
        <div className="pl-bm pl-bm-padding">
          <span className="pl-bm-name">padding</span>
          <Sides s={b.padding} />
          <div className="pl-bm-content">
            {formatPx(cw)} × {formatPx(ch)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBody({ el }: { el: Element }) {
  const showTailwind = useOverlay((s) => s.prefs.showTailwind);
  const s = keyStyles(el);
  const r = rectOf(el);
  const hasText = !!ownText(el);
  const fg = parseColor(s.color ?? "");
  const bg = effectiveBackground(el);
  const ratio = fg ? contrastRatio(fg, bg) : 0;
  const level = wcagLevel(ratio, parseFloat(s["font-size"] ?? "16"), parseInt(s["font-weight"] ?? "400", 10));
  const tw = toTailwind(s);
  const isFlex = s.display?.includes("flex");
  const isGrid = s.display?.includes("grid");
  const shadow = s["box-shadow"] !== "none" ? s["box-shadow"] : null;
  const selector = selectorFor(el);

  return (
    <>
      <div className="pl-card-head">
        <div className="pl-card-title">
          <span className="pl-tag">{shortLabel(el)}</span>
          <span className="pl-dim">
            {formatPx(r.width)} × {formatPx(r.height)}
          </span>
        </div>
        <button className="pl-selector" onClick={() => copy(selector, "Selector copied")} title="Copy selector">
          {selector}
        </button>
      </div>

      {hasText && (
        <section>
          <h4>Typography</h4>
          <Row label="Font">{splitFontFamily(s["font-family"]!)[0]}</Row>
          <Row label="Size / LH">
            {num(s["font-size"]!)} / {num(s["line-height"]!)}
          </Row>
          <Row label="Weight">{s["font-weight"]}</Row>
          {s["letter-spacing"] !== "normal" && <Row label="Tracking">{s["letter-spacing"]}</Row>}
          <Row label="Color">
            <Swatch color={s.color!} />
          </Row>
          <Row label="Contrast">
            <span className={`pl-badge pl-badge-${level === "Fail" ? "bad" : "ok"}`}>
              {ratio.toFixed(2)} · {level}
            </span>
          </Row>
        </section>
      )}

      <section>
        <h4>Box</h4>
        <BoxDiagram el={el} />
      </section>

      <section>
        <h4>Layout</h4>
        <Row label="Display">{s.display}</Row>
        {s.position !== "static" && <Row label="Position">{s.position}</Row>}
        {isFlex && (
          <Row label="Flex">
            {s["flex-direction"]} · {s["justify-content"]} · {s["align-items"]}
          </Row>
        )}
        {isGrid && <Row label="Columns">{s["grid-template-columns"]}</Row>}
        {(isFlex || isGrid) && s.gap !== "normal" && <Row label="Gap">{s.gap}</Row>}
        {s["z-index"] !== "auto" && <Row label="Z-index">{s["z-index"]}</Row>}
      </section>

      <section>
        <h4>Visual</h4>
        {parseColor(s["background-color"]!)?.a ? (
          <Row label="Background">
            <Swatch color={s["background-color"]!} />
          </Row>
        ) : null}
        {s["background-image"] !== "none" && <Row label="Image">{s["background-image"]!.slice(0, 60)}</Row>}
        {s["border-radius"] !== "0px" && <Row label="Radius">{s["border-radius"]}</Row>}
        {s["border-top-style"] !== "none" && (
          <Row label="Border">
            {s["border-top-width"]} {s["border-top-style"]} <Swatch color={s["border-top-color"]!} />
          </Row>
        )}
        {shadow && <Row label="Shadow">{shadow}</Row>}
        {s.opacity !== "1" && <Row label="Opacity">{s.opacity}</Row>}
        <Row label="Padding">{shorthand(...(["top", "right", "bottom", "left"].map((x) => s[`padding-${x}`]!) as [string, string, string, string]))}</Row>
        <Row label="Margin">{shorthand(...(["top", "right", "bottom", "left"].map((x) => s[`margin-${x}`]!) as [string, string, string, string]))}</Row>
      </section>

      {showTailwind && tw.length > 0 && (
        <section>
          <h4>Tailwind</h4>
          <button className="pl-code" onClick={() => copy(tw.join(" "), "Tailwind classes copied")}>
            {tw.join(" ")}
          </button>
        </section>
      )}

      <div className="pl-card-actions">
        <button onClick={() => copy(cssBlock(selector, s), "CSS copied")}>Copy CSS</button>
        <button
          onClick={() => el.parentElement && el.parentElement !== document.documentElement && store.set({ selected: el.parentElement })}
          title="Select parent (↑)"
        >
          Parent ↑
        </button>
        <button onClick={() => store.set((st) => ({ pinned: st.pinned.includes(el) ? st.pinned : [...st.pinned, el] }))} title="Pin (Space)">
          Pin
        </button>
      </div>
    </>
  );
}

/** Floating inspector that follows the hovered element, or sticks to the selected one. */
export function InspectorCard() {
  const tool = useOverlay((s) => s.tool);
  const hovered = useOverlay((s) => s.hovered);
  const selected = useOverlay((s) => s.selected);
  const altDown = useOverlay((s) => s.altDown);
  const panel = useOverlay((s) => s.panel);
  useOverlay((s) => s.frame);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const el = selected ?? hovered;
  const show = (tool === "inspect" || tool === "edit") && el && !altDown;

  useLayoutEffect(() => {
    if (!show || !ref.current || !el) return;
    const card = ref.current.getBoundingClientRect();
    const r = rectOf(el);
    const gap = 12;
    const rightLimit = innerWidth - (panel ? 360 : 0);
    let left = r.x + r.width + gap;
    if (left + card.width > rightLimit - 8) left = r.x - card.width - gap;
    if (left < 8) left = Math.min(Math.max(8, r.x), rightLimit - card.width - 8);
    let top = Math.max(8, Math.min(r.y, innerHeight - card.height - 72));
    if (left === r.x) top = r.y + r.height + gap > innerHeight - card.height ? r.y - card.height - gap : r.y + r.height + gap;
    const next = { left: Math.round(left), top: Math.round(Math.max(8, top)) };
    // Runs after every render, so only update when the position actually moved.
    setPos((prev) => (prev.left === next.left && prev.top === next.top ? prev : next));
  });

  if (!show) return null;
  return (
    <div ref={ref} className={`pl-card ${selected ? "pl-card-selected" : ""}`} style={pos}>
      <CardBody el={el} />
    </div>
  );
}

/** Small cards for pinned elements, laid out in a column so they can be compared side by side. */
export function PinnedCards() {
  const pinned = useOverlay((s) => s.pinned);
  useOverlay((s) => s.frame);
  if (!pinned.length) return null;
  return (
    <div className="pl-pinned">
      {pinned.map((el, i) => (
        <div key={i} className="pl-card pl-card-pinned">
          <button className="pl-close" onClick={() => store.set((s) => ({ pinned: s.pinned.filter((p) => p !== el) }))} aria-label="Unpin">
            ×
          </button>
          <CardBody el={el} />
        </div>
      ))}
    </div>
  );
}
