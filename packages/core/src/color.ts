/** RGBA with channels in 0..255 and alpha in 0..1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Parses the color formats that `getComputedStyle` and humans produce:
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()/rgba()` (comma or space syntax), `hsl()/hsla()`
 * and `transparent`. Returns `null` for anything else.
 */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  if (s.startsWith("#")) return parseHex(s.slice(1));

  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(s);
  if (!fn) return null;
  const [, name, body] = fn as unknown as [string, string, string];
  const parts = body
    .replace(/\s*\/\s*/, " / ")
    .split(/[\s,]+/)
    .filter((p) => p && p !== "/");
  if (parts.length < 3) return null;

  const alpha = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  if (Number.isNaN(alpha)) return null;

  if (name.startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map(parseRgbChannel) as [number, number, number];
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a: alpha };
  }

  const h = parseFloat(parts[0]!);
  const sat = parseFloat(parts[1]!) / 100;
  const light = parseFloat(parts[2]!) / 100;
  if ([h, sat, light].some(Number.isNaN)) return null;
  return { ...hslToRgb(h, sat, light), a: alpha };
}

function parseHex(hex: string): RGBA | null {
  if (!/^[0-9a-f]+$/.test(hex)) return null;
  let full = hex;
  if (hex.length === 3 || hex.length === 4) full = [...hex].map((c) => c + c).join("");
  if (full.length !== 6 && full.length !== 8) return null;
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? round(n(6) / 255, 3) : 1 };
}

function parseRgbChannel(v: string): number {
  return v.endsWith("%") ? clamp((parseFloat(v) / 100) * 255, 0, 255) : clamp(parseFloat(v), 0, 255);
}

function parseAlpha(v: string): number {
  return v.endsWith("%") ? clamp(parseFloat(v) / 100, 0, 1) : clamp(parseFloat(v), 0, 1);
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
}

const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export function toHex({ r, g, b, a }: RGBA): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
  return a < 1 ? base + hex2(a * 255).toUpperCase() : base;
}

export function toRgbString({ r, g, b, a }: RGBA): string {
  return a < 1 ? `rgb(${round(r)} ${round(g)} ${round(b)} / ${round(a, 2)})` : `rgb(${round(r)} ${round(g)} ${round(b)})`;
}

export function toHsl({ r, g, b, a }: RGBA): { h: number; s: number; l: number; a: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return { h: round((h + 360) % 360), s: round(s * 100), l: round(l * 100), a };
}

export function toHslString(c: RGBA): string {
  const { h, s, l, a } = toHsl(c);
  return a < 1 ? `hsl(${h} ${s}% ${l}% / ${round(a, 2)})` : `hsl(${h} ${s}% ${l}%)`;
}

/** Converts sRGB to OKLCH (CSS Color 4). Lightness 0..1, chroma ~0..0.4, hue in degrees. */
export function toOklch({ r, g, b }: RGBA): { l: number; c: number; h: number } {
  const lin = (v: number) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  const H = C < 1e-4 ? 0 : (Math.atan2(B, A) * 180) / Math.PI;
  return { l: round(L, 3), c: round(C, 3), h: round((H + 360) % 360, 1) };
}

export function toOklchString(c: RGBA): string {
  const { l, c: chroma, h } = toOklch(c);
  const base = `oklch(${round(l * 100, 1)}% ${chroma} ${h}`;
  return c.a < 1 ? `${base} / ${round(c.a, 2)})` : `${base})`;
}

/** Composites a (possibly translucent) foreground over an opaque background. */
export function blend(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

/** WCAG 2.x relative luminance. */
export function luminance({ r, g, b }: RGBA): number {
  const ch = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG 2.x contrast ratio, 1..21. Translucent foregrounds are blended over the background first. */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const solidBg = bg.a < 1 ? blend(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg;
  const solidFg = fg.a < 1 ? blend(fg, solidBg) : fg;
  const l1 = luminance(solidFg);
  const l2 = luminance(solidBg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return round((hi + 0.05) / (lo + 0.05), 2);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

/**
 * Grades a contrast ratio for a given text size.
 * "Large" text is >= 24px, or >= 18.66px (14pt) when bold (weight >= 700).
 */
export function wcagLevel(ratio: number, fontSizePx: number, fontWeight = 400): WcagLevel {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  if (large) {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA Large";
    return "Fail";
  }
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Fail";
}

/** Euclidean distance in RGB space; good enough to de-duplicate palettes. */
export function colorDistance(a: RGBA, b: RGBA): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}
