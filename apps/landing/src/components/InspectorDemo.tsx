import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { type Rect, contrastRatio, formatPx, measureBetween, parseColor, wcagLevel } from "@pixel-lens/core";

/**
 * A miniature, working copy of the extension's overlay: the floating card next to the
 * element, measurement lines and the lens button with its command palette. It runs on a sample page and
 * uses the same measurement code (`@pixel-lens/core`) as the extension.
 */

type Mode = "inspect" | "measure";

interface Picked {
  el: HTMLElement;
  rect: Rect;
}

const CARD_WIDTH = 208;

const relRect = (el: Element, root: Element): Rect => {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height };
};

/** Nearest painted background behind an element, so the contrast ratio matches what you see. */
function backgroundOf(el: HTMLElement): string {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    const c = parseColor(bg);
    if (c && c.a > 0) return bg;
  }
  return "rgb(255, 255, 255)";
}

function describe(el: HTMLElement) {
  const s = getComputedStyle(el);
  const fg = parseColor(s.color);
  const bg = parseColor(backgroundOf(el));
  const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
  return {
    name: el.dataset.name ?? el.tagName.toLowerCase(),
    font: `${parseFloat(s.fontSize)} / ${s.lineHeight === "normal" ? "auto" : parseFloat(s.lineHeight)} · ${s.fontWeight}`,
    color: s.color,
    ratio,
    level: wcagLevel(ratio, parseFloat(s.fontSize), parseInt(s.fontWeight, 10)),
    // Tailwind's rounded-full resolves to an enormous px value.
    radius: parseFloat(s.borderTopLeftRadius) >= 9999 ? "full" : s.borderTopLeftRadius,
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((v) => parseFloat(v)).join(" "),
  };
}

function toHex(rgb: string) {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m) return rgb;
  return `#${m
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function Pill({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-measure px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-white"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

const ICONS = {
  inspect: "M4 4l5 12 2-5 5-2L4 4z",
  measure: "M3 10h14M3 7v6M17 7v6M7 9v2M10 9v2M13 9v2",
  ruler: "M3 14L14 3l3 3L6 17l-3-3zM6 11l1.5 1.5M8.5 8.5l1.5 1.5M11 6l1.5 1.5",
  edit: "M4 16h3l8.5-8.5-3-3L4 13v3zM11 6l3 3",
  colors: "M10 3a7 7 0 100 14c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.3-1-2.3 0-.8.7-1.2 1.5-1.2H14a3 3 0 003-3c0-3.3-3.1-6-7-6z",
  audit: "M10 3l6 3v4c0 3.5-2.5 6.3-6 7-3.5-.7-6-3.5-6-7V6l6-3z",
};

const COMMANDS: { label: string; icon: string; key: string; mode?: Mode }[] = [
  { label: "Inspect", icon: ICONS.inspect, key: "I", mode: "inspect" },
  { label: "Measure distances", icon: ICONS.measure, key: "M", mode: "measure" },
  { label: "Ruler & guides", icon: ICONS.ruler, key: "R" },
  { label: "Live edit", icon: ICONS.edit, key: "E" },
  { label: "Colors", icon: ICONS.colors, key: "C" },
  { label: "Audit", icon: ICONS.audit, key: "U" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Floating card placed beside the element, like the extension's hover card. */
function Card({ target, rootSize }: { target: Picked; rootSize: { w: number; h: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const info = describe(target.el);

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 160;
    const r = target.rect;
    const gap = 10;
    let left = r.x + r.width + gap;
    if (left + CARD_WIDTH > rootSize.w - 8) left = r.x - CARD_WIDTH - gap;
    if (left < 8) left = Math.min(Math.max(8, r.x), rootSize.w - CARD_WIDTH - 8);
    let top = Math.min(Math.max(8, r.y), rootSize.h - h - 64);
    if (left === r.x || (left < r.x + r.width && left + CARD_WIDTH > r.x)) top = r.y + r.height + gap;
    const next = { left: Math.round(left), top: Math.round(Math.max(8, top)) };
    setPos((p) => (p.left === next.left && p.top === next.top ? p : next));
  });

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-ink-900/95 p-3 font-mono text-[11px] text-ink-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur"
      style={{ ...pos, width: CARD_WIDTH }}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
        <span className="truncate font-semibold text-lens-300">{info.name}</span>
        <span className="text-ink-300">
          {formatPx(target.rect.width)}×{formatPx(target.rect.height)}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="font-sans text-ink-400">Font</dt>
        <dd className="text-right">{info.font}</dd>
        <dt className="font-sans text-ink-400">Color</dt>
        <dd className="flex items-center justify-end gap-1.5">
          <span className="size-2.5 rounded-sm ring-1 ring-white/25" style={{ background: info.color }} />
          {toHex(info.color)}
        </dd>
        <dt className="font-sans text-ink-400">Contrast</dt>
        <dd className="text-right">
          <span className={info.level === "Fail" ? "text-[#ff6b7a]" : "text-ok"}>
            {info.ratio.toFixed(2)} {info.level}
          </span>
        </dd>
        <dt className="font-sans text-ink-400">Padding</dt>
        <dd className="text-right">{info.padding}</dd>
        <dt className="font-sans text-ink-400">Radius</dt>
        <dd className="text-right">{info.radius}</dd>
      </dl>
    </div>
  );
}

export default function InspectorDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("measure");
  const [hover, setHover] = useState<Picked | null>(null);
  const [selected, setSelected] = useState<Picked | null>(null);
  const [touched, setTouched] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [size, setSize] = useState({ w: 600, h: 440 });

  const pick = useCallback((target: EventTarget | null): Picked | null => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-name]");
    if (!el || !root.current || !root.current.contains(el)) return null;
    return { el, rect: relRect(el, root.current) };
  }, []);

  // Start mid-measurement so the demo explains itself before anyone touches it.
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const measure = () => {
      setSize({ w: r.clientWidth, h: r.clientHeight });
      const cta = r.querySelector<HTMLElement>('[data-name="a.btn-primary"]');
      const ghost = r.querySelector<HTMLElement>('[data-name="a.btn-ghost"]');
      if (cta) setSelected({ el: cta, rect: relRect(cta, r) });
      if (ghost) setHover({ el: ghost, rect: relRect(ghost, r) });
    };
    measure();
    const ro = new ResizeObserver(() => {
      setSize({ w: r.clientWidth, h: r.clientHeight });
      setSelected((s) => s && { ...s, rect: relRect(s.el, r) });
      setHover((h) => h && { ...h, rect: relRect(h.el, r) });
    });
    ro.observe(r);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
      if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement).tagName) && el.matches(":hover")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const spans = selected && hover && hover.el !== selected.el && mode === "measure" ? measureBetween(selected.rect, hover.rect) : [];
  const cardTarget = mode === "inspect" ? (hover ?? selected) : spans.length ? null : (selected ?? hover);

  return (
    <div className="card relative overflow-hidden shadow-[0_40px_120px_-40px_rgba(124,92,255,0.45)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-ink-850 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <div className="mx-auto w-full max-w-[220px] rounded-md bg-white/[0.05] px-3 py-1 text-center font-mono text-[11px] text-ink-300">
          driftwood.example
        </div>
      </div>

      {/* Sample page */}
      <div
        ref={root}
        className="relative min-h-[440px] cursor-crosshair bg-[#f7f4ee] px-6 pt-6 pb-20 text-[#1c1b19] select-none sm:px-8"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const p = pick(e.target);
          if (p) setHover(p);
          setTouched(true);
        }}
        onClick={(e) => {
          const p = pick(e.target);
          if (!p) return;
          setTouched(true);
          // Touch: first tap selects, a tap on another element measures.
          if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== "mouse" && selected && p.el !== selected.el) {
            setHover(p);
            return;
          }
          setSelected(p);
        }}
        aria-label="Interactive demo: hover elements to inspect them, click one to select it, then hover another to measure the distance"
        role="application"
      >
        <div data-name="nav" className="flex items-center gap-5 text-[12px] text-[#5f5b54]">
          <span data-name="div.logo" className="text-[15px] font-extrabold tracking-tight text-[#1c1b19]">
            drift<span className="text-[#e2603a]">wood</span>
          </span>
          <span>Trips</span>
          <span>Guides</span>
        </div>

        <div data-name="section.hero" className="mt-7 grid grid-cols-[1fr_auto] items-end gap-5">
          <div className="flex flex-col items-start gap-3.5">
            <span data-name="span.eyebrow" className="rounded-full bg-[#ffe3d6] px-2.5 py-0.5 text-[11px] font-bold text-[#b8441f]">
              Shared itineraries
            </span>
            <h3 data-name="h1" className="max-w-[16ch] text-[30px] leading-[33px] font-extrabold tracking-[-0.03em]">
              Plan trips together
            </h3>
            <p data-name="p.lead" className="max-w-[30ch] text-[13px] leading-[20px] text-[#6b665e]">
              One itinerary for everyone, with bookings, maps and budgets.
            </p>
            <div data-name="div.actions" className="flex gap-2.5">
              <span data-name="a.btn-primary" className="rounded-full bg-[#e2603a] px-[18px] py-2.5 text-[12px] font-bold text-white">
                Start planning
              </span>
              <span data-name="a.btn-ghost" className="rounded-full border-[1.5px] border-[#d8d2c6] px-[18px] py-2.5 text-[12px] font-bold">
                See an example
              </span>
            </div>
            <p data-name="p.note" className="text-[11px] text-[#b3ada3]">
              Free for up to 4 travellers
            </p>
          </div>
          <div
            data-name="div.visual"
            className="relative hidden h-[180px] w-[150px] overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#ffb48f,#e2603a_55%,#8f3b6e)] sm:block"
          >
            <span className="absolute top-5 right-5 size-12 rounded-full bg-[#ffe7b8]" />
            <span className="absolute -right-6 -bottom-16 -left-6 h-28 rounded-[50%] bg-[#3d2147]" />
          </div>
        </div>

        <div data-name="div.features" className="mt-6 grid grid-cols-2 gap-3">
          <div data-name="div.feature" className="rounded-2xl bg-white p-3.5">
            <div data-name="div.icon" className="mb-2 size-7 rounded-lg bg-[#ffe3d6]" />
            <p data-name="h3" className="text-[12px] font-bold">One shared plan</p>
          </div>
          <div data-name="div.feature" className="rounded-2xl bg-white p-3.5">
            <div data-name="div.icon" className="mb-2 size-7 rounded-lg bg-[#dff1ea]" />
            <p data-name="h3" className="text-[12px] font-bold">Split the budget</p>
          </div>
        </div>

        {/* Overlay */}
        <div className="pointer-events-none absolute inset-0">
          {hover && hover.el !== selected?.el && (
            <div
              className={`absolute border ${spans.length ? "border-dashed border-measure" : "border-lens-500 bg-[rgba(111,168,220,0.18)]"}`}
              style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.width, height: hover.rect.height }}
            />
          )}
          {selected && (
            <>
              <div
                className="absolute border-[1.5px] border-lens-500"
                style={{ left: selected.rect.x, top: selected.rect.y, width: selected.rect.width, height: selected.rect.height }}
              />
              <div
                className="absolute -translate-y-full rounded-t bg-lens-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-white"
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
            <Pill key={i} x={(s.from.x + s.to.x) / 2 + (s.axis === "y" ? 16 : 0)} y={(s.from.y + s.to.y) / 2 - (s.axis === "x" ? 13 : 0)}>
              {formatPx(s.length)}
            </Pill>
          ))}
          {cardTarget && <Card target={cardTarget} rootSize={size} />}
        </div>

        {/* Lens button: the only always-visible control in the extension */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          className="absolute right-4 bottom-4 z-20 flex h-10 items-center gap-2.5 rounded-full border border-white/10 bg-ink-900 py-0 pr-3 pl-1.5 text-[12px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-lens-500/60"
        >
          <span className="grid size-[30px] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#a18bff,#5534f0_70%)] shadow-[0_0_0_3px_rgba(124,92,255,0.22)]">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <rect x="7" y="7" width="4" height="4" fill="currentColor" />
            </svg>
          </span>
          {mode === "inspect" ? "Inspect" : "Measure distances"}
          <kbd className="rounded border border-white/10 bg-white/10 px-1.5 font-mono text-[10px] font-normal">/</kbd>
        </button>

        {paletteOpen && (
          <div className="absolute inset-0 z-30 bg-ink-950/40" onPointerDown={() => setPaletteOpen(false)}>
            <div
              role="dialog"
              aria-label="Command palette"
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute top-[14%] left-1/2 w-[min(400px,calc(100%-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-lens-500/50 bg-ink-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            >
              <div className="flex h-11 items-center gap-2.5 border-b border-white/10 px-3.5 text-ink-400">
                <Icon d="M9 15a6 6 0 100-12 6 6 0 000 12zM13.5 13.5L17 17" />
                <span className="flex-1 text-[13px] text-ink-300">Search tools, panels and overlays</span>
                <kbd className="rounded border border-white/10 bg-white/10 px-1.5 font-mono text-[10px]">Esc</kbd>
              </div>
              <ul className="p-1.5 text-[12.5px]">
                {COMMANDS.map((c) => (
                  <li key={c.label}>
                    <button
                      type="button"
                      disabled={!c.mode}
                      onClick={() => {
                        if (c.mode) {
                          setMode(c.mode);
                          setPaletteOpen(false);
                        }
                      }}
                      className={`flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left ${
                        c.mode ? (mode === c.mode ? "bg-lens-500/20 text-white" : "text-ink-100 hover:bg-white/[0.06]") : "text-ink-400"
                      }`}
                    >
                      <Icon d={c.icon} />
                      <span className="flex-1">{c.label}</span>
                      {!c.mode && <span className="text-[10.5px]">in the extension</span>}
                      <kbd className="rounded border border-white/10 bg-white/10 px-1.5 font-mono text-[10px]">{c.key}</kbd>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!touched && (
          <div className="pointer-events-none absolute top-5 right-5 hidden rounded-lg bg-[#1c1b19]/90 px-2.5 py-1.5 font-mono text-[10px] text-white sm:block">
            Try it: click, then hover
          </div>
        )}
      </div>
    </div>
  );
}
