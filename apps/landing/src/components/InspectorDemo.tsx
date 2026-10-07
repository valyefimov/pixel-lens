import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { type Rect, formatPx, measureBetween } from "@pixel-lens/core";

/**
 * A miniature, working version of the extension's inspector, running on a mock page.
 * It uses the exact same measurement code (`@pixel-lens/core`) as the real extension.
 */

type Mode = "inspect" | "measure";

interface Picked {
  el: HTMLElement;
  rect: Rect;
}

const relRect = (el: Element, root: Element): Rect => {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height };
};

function describe(el: HTMLElement) {
  const s = getComputedStyle(el);
  return {
    name: el.dataset.name ?? el.tagName.toLowerCase(),
    font: `${parseFloat(s.fontSize)} / ${s.lineHeight === "normal" ? "auto" : parseFloat(s.lineHeight)}`,
    weight: s.fontWeight,
    color: s.color,
    bg: s.backgroundColor,
    // Tailwind's rounded-full resolves to an enormous px value.
    radius: parseFloat(s.borderTopLeftRadius) >= 9999 ? "full" : s.borderTopLeftRadius,
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((v) => parseFloat(v)),
  };
}

function rgbToHex(rgb: string) {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || (m[3] !== undefined && Number(m[3]) === 0)) return "transparent";
  return `#${m
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function Pill({ x, y, children, color = "#ff2d78" }: { x: number; y: number; children: ReactNode; color?: string }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-white"
      style={{ left: x, top: y, background: color }}
    >
      {children}
    </div>
  );
}

export default function InspectorDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("inspect");
  const [hover, setHover] = useState<Picked | null>(null);
  const [selected, setSelected] = useState<Picked | null>(null);
  const [touched, setTouched] = useState(false);

  const pick = useCallback((target: EventTarget | null): Picked | null => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-name]");
    if (!el || !root.current || !root.current.contains(el)) return null;
    return { el, rect: relRect(el, root.current) };
  }, []);

  // Start with something selected so the demo is self-explanatory before anyone touches it.
  useEffect(() => {
    if (!root.current) return;
    const cta = root.current.querySelector<HTMLElement>('[data-name="button.cta"]');
    const card = root.current.querySelector<HTMLElement>('[data-name="div.card"]');
    if (cta) setSelected({ el: cta, rect: relRect(cta, root.current) });
    if (card) setHover({ el: card, rect: relRect(card, root.current) });
    setMode("measure");
    const onResize = () => {
      setSelected((s) => s && { ...s, rect: relRect(s.el, root.current!) });
      setHover(null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const spans = selected && hover && hover.el !== selected.el && mode === "measure" ? measureBetween(selected.rect, hover.rect) : [];
  const info = (selected ?? hover) && describe((selected ?? hover)!.el);

  return (
    <div className="card relative overflow-hidden shadow-[0_40px_120px_-40px_rgba(124,92,255,0.45)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-ink-850 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <div className="mx-auto w-full max-w-xs rounded-md bg-white/[0.05] px-3 py-1 text-center font-mono text-[11px] text-ink-300">
          acme.design/pricing
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px]">
        {/* Mock page */}
        <div
          ref={root}
          className="relative cursor-crosshair bg-[#f6f5f2] p-6 text-[#18181b] select-none sm:p-10"
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            setHover(pick(e.target));
            setTouched(true);
          }}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const p = pick(e.target);
            if (!p) return;
            setTouched(true);
            // Touch: first tap selects, second tap on another element measures.
            if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== "mouse" && selected && p.el !== selected.el) {
              setHover(p);
              return;
            }
            setSelected(p);
          }}
          aria-label="Interactive demo: hover elements to inspect them, click to select, then hover another element to measure the distance"
          role="application"
        >
          <div data-name="section.hero" className="flex flex-col items-start gap-5">
            <span data-name="span.badge" className="rounded-full bg-[#e9e4ff] px-3 py-1 text-[11px] font-semibold text-[#5b3df5]">
              New · Team plans
            </span>
            <h3 data-name="h1.title" className="max-w-sm text-[28px] leading-[34px] font-bold tracking-tight">
              Ship pixel-perfect interfaces
            </h3>
            <p data-name="p.lead" className="max-w-sm text-[14px] leading-[22px] text-[#5d5d66]">
              Every gap, radius and color, exactly as designed.
            </p>
            <div data-name="div.actions" className="flex gap-3">
              <button data-name="button.cta" className="rounded-full bg-[#18181b] px-5 py-2.5 text-[13px] font-semibold text-white">
                Start free trial
              </button>
              <button data-name="button.secondary" className="rounded-full border border-[#d8d6d0] px-5 py-2.5 text-[13px] font-semibold">
                Book a demo
              </button>
            </div>
          </div>
          <div data-name="div.cards" className="mt-8 grid grid-cols-2 gap-4">
            <div data-name="div.card" className="rounded-2xl bg-white p-4 shadow-sm">
              <div data-name="div.icon" className="mb-3 size-8 rounded-lg bg-[#ffe1ec]" />
              <p data-name="p.card-title" className="text-[13px] font-semibold">Measure</p>
              <p data-name="p.card-body" className="text-[12px] leading-[18px] text-[#77777f]">Distances in one hover.</p>
            </div>
            <div data-name="div.card" className="rounded-2xl bg-white p-4 shadow-sm">
              <div data-name="div.icon" className="mb-3 size-8 rounded-lg bg-[#dff3ff]" />
              <p data-name="p.card-title" className="text-[13px] font-semibold">Inspect</p>
              <p data-name="p.card-body" className="text-[12px] leading-[18px] text-[#77777f]">Real CSS, not guesses.</p>
            </div>
          </div>

          {/* Overlay */}
          <div className="pointer-events-none absolute inset-0">
            {hover && hover.el !== selected?.el && (
              <div
                className="absolute border border-[#7c5cff] bg-[rgba(111,168,220,0.18)]"
                style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.width, height: hover.rect.height }}
              />
            )}
            {selected && (
              <>
                <div
                  className="absolute border-[1.5px] border-[#7c5cff]"
                  style={{ left: selected.rect.x, top: selected.rect.y, width: selected.rect.width, height: selected.rect.height }}
                />
                <div
                  className="absolute -translate-y-full rounded-t bg-[#7c5cff] px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-white"
                  style={{ left: selected.rect.x, top: selected.rect.y - 2 }}
                >
                  {formatPx(selected.rect.width)} × {formatPx(selected.rect.height)}
                </div>
              </>
            )}
            <svg className="absolute inset-0 size-full overflow-visible">
              {spans.map((s, i) => (
                <line key={i} x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke="#ff2d78" strokeWidth={1.5} />
              ))}
            </svg>
            {spans.map((s, i) => (
              <Pill key={i} x={(s.from.x + s.to.x) / 2 + (s.axis === "y" ? 18 : 0)} y={(s.from.y + s.to.y) / 2 - (s.axis === "x" ? 12 : 0)}>
                {formatPx(s.length)}
              </Pill>
            ))}
          </div>

          {!touched && (
            <div className="pointer-events-none absolute right-4 bottom-4 hidden rounded-lg bg-[#18181b]/90 px-3 py-2 font-mono text-[11px] text-white sm:block">
              Try it: hover, click, hover again
            </div>
          )}
        </div>

        {/* Inspector panel */}
        <aside className="flex flex-col gap-4 border-t border-white/[0.06] bg-ink-900 p-5 text-[12px] lg:border-t-0 lg:border-l">
          <div className="flex rounded-lg bg-black/30 p-0.5 font-medium" role="radiogroup" aria-label="Tool">
            {(["inspect", "measure"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-3 py-1.5 capitalize transition ${mode === m ? "bg-white/10 text-white" : "text-ink-300 hover:text-white"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {info ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono">
              <dt className="font-sans text-ink-400">Element</dt>
              <dd className="truncate text-right text-lens-300">{info.name}</dd>
              <dt className="font-sans text-ink-400">Size</dt>
              <dd className="text-right">
                {formatPx((selected ?? hover)!.rect.width)} × {formatPx((selected ?? hover)!.rect.height)}
              </dd>
              <dt className="font-sans text-ink-400">Font</dt>
              <dd className="text-right">
                {info.font} · {info.weight}
              </dd>
              <dt className="font-sans text-ink-400">Color</dt>
              <dd className="flex items-center justify-end gap-2">
                <span className="size-3 rounded-sm ring-1 ring-white/20" style={{ background: info.color }} />
                {rgbToHex(info.color)}
              </dd>
              <dt className="font-sans text-ink-400">Fill</dt>
              <dd className="flex items-center justify-end gap-2">
                <span className="size-3 rounded-sm ring-1 ring-white/20" style={{ background: info.bg }} />
                {rgbToHex(info.bg)}
              </dd>
              <dt className="font-sans text-ink-400">Padding</dt>
              <dd className="text-right">{info.padding.join(" ")}</dd>
              <dt className="font-sans text-ink-400">Radius</dt>
              <dd className="text-right">{info.radius}</dd>
            </dl>
          ) : (
            <p className="text-ink-300">Hover or tap an element on the page.</p>
          )}
          <p className="mt-auto text-[11px] leading-5 text-ink-400">
            {mode === "measure"
              ? "Click (or tap) an element, then hover or tap another to see the distance. In the extension: hold Alt."
              : "Hover to inspect, click to pin. Same engine as the extension."}
          </p>
        </aside>
      </div>
    </div>
  );
}
