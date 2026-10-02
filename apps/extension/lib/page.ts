import { type PageSummary, type RGBA, colorDistance, parseColor, splitFontFamily, toHex } from "@pixel-lens/core";
import { allElements, isVisible, ownText } from "./dom";

export interface FontUsage {
  family: string;
  /** Distinct size/weight combinations, most used first. */
  styles: { size: string; weight: string; lineHeight: string; count: number }[];
  count: number;
}

/** Groups visible text by the font that is actually first in its stack. */
export function collectFonts(): FontUsage[] {
  const map = new Map<string, Map<string, { size: string; weight: string; lineHeight: string; count: number }>>();
  for (const el of allElements()) {
    if (!ownText(el) || !isVisible(el)) continue;
    const s = getComputedStyle(el);
    const family = splitFontFamily(s.fontFamily)[0] ?? "inherit";
    const key = `${s.fontSize}|${s.fontWeight}|${s.lineHeight}`;
    const styles = map.get(family) ?? new Map();
    const entry = styles.get(key) ?? { size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, count: 0 };
    entry.count++;
    styles.set(key, entry);
    map.set(family, styles);
  }
  return [...map]
    .map(([family, styles]) => {
      const list = [...styles.values()].sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
      return { family, styles: list, count: list.reduce((n, s) => n + s.count, 0) };
    })
    .sort((a, b) => b.count - a.count);
}

export interface PaletteColor {
  hex: string;
  rgba: RGBA;
  count: number;
  usage: Set<"text" | "background" | "border">;
}

/** Extracts the page palette, merging near-identical colors (distance < 6 in RGB space). */
export function collectPalette(): PaletteColor[] {
  const palette: PaletteColor[] = [];
  const add = (value: string, usage: "text" | "background" | "border") => {
    const c = parseColor(value);
    if (!c || c.a === 0) return;
    const existing = palette.find((p) => colorDistance(p.rgba, c) < 6 && Math.abs(p.rgba.a - c.a) < 0.05);
    if (existing) {
      existing.count++;
      existing.usage.add(usage);
    } else {
      palette.push({ hex: toHex(c), rgba: c, count: 1, usage: new Set([usage]) });
    }
  };
  for (const el of allElements()) {
    if (!isVisible(el)) continue;
    const s = getComputedStyle(el);
    if (ownText(el)) add(s.color, "text");
    add(s.backgroundColor, "background");
    if (parseFloat(s.borderTopWidth) > 0) add(s.borderTopColor, "border");
  }
  return palette.sort((a, b) => b.count - a.count);
}

/** Gradients used anywhere in background-image. */
export function collectGradients(): string[] {
  const set = new Set<string>();
  for (const el of allElements()) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg.includes("gradient(")) set.add(bg);
  }
  return [...set];
}

export interface Asset {
  kind: "img" | "svg" | "background" | "video";
  src: string;
  width: number;
  height: number;
  alt?: string;
  /** Inline SVG markup, when the asset is an inline <svg>. */
  markup?: string;
}

export function collectAssets(): Asset[] {
  const seen = new Set<string>();
  const out: Asset[] = [];
  const push = (a: Asset) => {
    const key = a.markup ?? a.src;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };

  for (const img of document.images) {
    push({ kind: "img", src: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight, alt: img.alt });
  }
  for (const svg of document.querySelectorAll("svg")) {
    const r = svg.getBoundingClientRect();
    if (r.width < 4 || svg.closest("pixel-lens-overlay")) continue;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const markup = clone.outerHTML;
    push({
      kind: "svg",
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`,
      width: Math.round(r.width),
      height: Math.round(r.height),
      markup,
    });
  }
  for (const el of allElements()) {
    const bg = getComputedStyle(el).backgroundImage;
    for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const r = el.getBoundingClientRect();
      push({ kind: "background", src: new URL(m[1]!, location.href).href, width: Math.round(r.width), height: Math.round(r.height) });
    }
  }
  for (const v of document.querySelectorAll("video")) {
    push({ kind: "video", src: v.currentSrc || v.src, width: v.videoWidth, height: v.videoHeight });
  }
  return out;
}

export interface PageWeight {
  total: number;
  byType: Record<string, { bytes: number; count: number }>;
  requests: number;
}

/** Transfer size by resource type, from the Resource Timing API (cross-origin entries may report 0). */
export function pageWeight(): PageWeight {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const byType: PageWeight["byType"] = {};
  const add = (type: string, bytes: number) => {
    const t = (byType[type] ??= { bytes: 0, count: 0 });
    t.bytes += bytes;
    t.count++;
  };
  if (nav) add("document", nav.transferSize || nav.encodedBodySize);
  for (const e of entries) {
    const type =
      e.initiatorType === "img" || /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/.test(e.name)
        ? "image"
        : e.initiatorType === "script"
          ? "script"
          : e.initiatorType === "css" || e.initiatorType === "link"
            ? /\.woff2?(\?|$)/.test(e.name)
              ? "font"
              : "stylesheet"
            : /\.woff2?(\?|$)/.test(e.name)
              ? "font"
              : e.initiatorType === "fetch" || e.initiatorType === "xmlhttprequest"
                ? "xhr"
                : "other";
    add(type, e.transferSize || e.encodedBodySize);
  }
  const total = Object.values(byType).reduce((n, t) => n + t.bytes, 0);
  return { total, byType, requests: entries.length + (nav ? 1 : 0) };
}

/** Best-effort technology fingerprinting from globals and DOM markers. */
export function detectTechnologies(): string[] {
  const w = window as unknown as Record<string, unknown>;
  const found = new Set<string>();
  const has = (sel: string) => !!document.querySelector(sel);
  if (w.__NEXT_DATA__ || has("#__next")) found.add("Next.js");
  if (w.__NUXT__ || has("#__nuxt")) found.add("Nuxt");
  if (has("[data-astro-cid], astro-island")) found.add("Astro");
  if (has("[data-reactroot]") || has("#root") || w.React) found.add("React");
  if (has("[data-v-app]") || w.Vue) found.add("Vue");
  if (has("[ng-version]")) found.add("Angular");
  if (has("[class*='svelte-']")) found.add("Svelte");
  if (w.jQuery) found.add("jQuery");
  if (has("[class*='wp-']") || has("link[href*='wp-content']")) found.add("WordPress");
  if (has("[data-wf-page]")) found.add("Webflow");
  if (has("[data-framer-name], [class*='framer-']")) found.add("Framer");
  if (w.Shopify) found.add("Shopify");
  if (w.gtag || w.dataLayer) found.add("Google Tag Manager");
  if (has("link[href*='fonts.googleapis.com']")) found.add("Google Fonts");
  // Tailwind leaves a recognisable fingerprint of custom properties.
  if (getComputedStyle(document.documentElement).getPropertyValue("--tw-ring-color") || has("[class*='md\\:']"))
    found.add("Tailwind CSS");
  const gen = document.querySelector<HTMLMetaElement>('meta[name="generator"]')?.content;
  if (gen) found.add(gen);
  return [...found];
}

export function pageSummary(): PageSummary {
  return {
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    fonts: collectFonts().map((f) => ({ family: f.family, count: f.count })),
    colors: collectPalette()
      .slice(0, 24)
      .map((c) => ({ hex: c.hex, count: c.count })),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}
