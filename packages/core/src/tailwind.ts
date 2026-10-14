/**
 * Translates computed CSS values into Tailwind v4 utility classes.
 * Values that fall on the default scale map to named utilities (`p-4`),
 * everything else falls back to arbitrary values (`p-[13px]`).
 */

const SPACING_UNIT = 4; // Tailwind v4: --spacing = 0.25rem = 4px

const FONT_SIZES: Record<string, number> = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36,
  "5xl": 48, "6xl": 60, "7xl": 72, "8xl": 96, "9xl": 128,
};

const RADII: Record<string, number> = {
  "xs": 2, "sm": 4, "md": 6, "lg": 8, "xl": 12, "2xl": 16, "3xl": 24, "4xl": 32,
};

const WEIGHTS: Record<number, string> = {
  100: "thin", 200: "extralight", 300: "light", 400: "normal", 500: "medium",
  600: "semibold", 700: "bold", 800: "extrabold", 900: "black",
};

const px = (v: string) => parseFloat(v);

/** `16px` -> `4`, `2px` -> `0.5`, `13px` -> `[13px]`. Returns null for `auto`/non-px values. */
export function spacingToken(value: string): string | null {
  if (value === "auto") return "auto";
  if (!value.endsWith("px")) return null;
  const n = px(value);
  if (n === 0) return "0";
  if (n === 1) return "px";
  const steps = n / SPACING_UNIT;
  // v4 technically accepts any multiple, but half steps are what people actually write.
  if (Number.isInteger(steps * 2)) return String(steps);
  return `[${value}]`;
}

function withSign(prefix: string, value: string): string | null {
  const neg = value.startsWith("-");
  const token = spacingToken(neg ? value.slice(1) : value);
  if (token === null) return null;
  if (token === "0" && neg) return `${prefix}-0`;
  return `${neg ? "-" : ""}${prefix}-${token}`;
}

/** Collapses four sides into the shortest Tailwind form: `p-4`, `px-4 py-2`, or per-side utilities. */
export function boxSides(prefix: "p" | "m", sides: [string, string, string, string]): string[] {
  const [t, r, b, l] = sides;
  if (t === r && r === b && b === l) return compact([withSign(prefix, t)]);
  if (t === b && l === r) return compact([withSign(`${prefix}x`, l), withSign(`${prefix}y`, t)]);
  return compact([
    withSign(`${prefix}t`, t),
    withSign(`${prefix}r`, r),
    withSign(`${prefix}b`, b),
    withSign(`${prefix}l`, l),
  ]);
}

export function fontSizeClass(value: string): string {
  const n = px(value);
  for (const [name, size] of Object.entries(FONT_SIZES)) if (size === n) return `text-${name}`;
  return `text-[${value}]`;
}

export function fontWeightClass(value: string): string {
  const n = parseInt(value, 10);
  return WEIGHTS[n] ? `font-${WEIGHTS[n]}` : `font-[${value}]`;
}

export function radiusClass(value: string): string | null {
  const n = px(value);
  if (!n) return null;
  if (n >= 9999) return "rounded-full";
  for (const [name, size] of Object.entries(RADII)) if (size === n) return `rounded-${name}`;
  return `rounded-[${value}]`;
}

/**
 * Builds a Tailwind class list from a subset of computed styles.
 * Accepts a plain record so it works with `CSSStyleDeclaration` and test fixtures alike.
 */
export function toTailwind(style: Record<string, string>): string[] {
  const out: string[] = [];
  const get = (k: string) => style[k] ?? "";

  const display = get("display");
  const displayMap: Record<string, string> = {
    flex: "flex", "inline-flex": "inline-flex", grid: "grid", "inline-grid": "inline-grid",
    block: "block", "inline-block": "inline-block", inline: "inline", none: "hidden",
  };
  if (displayMap[display]) out.push(displayMap[display]!);

  if (display.includes("flex")) {
    if (get("flex-direction") === "column") out.push("flex-col");
    if (get("flex-wrap") === "wrap") out.push("flex-wrap");
    const justify: Record<string, string> = {
      center: "justify-center", "space-between": "justify-between", "flex-end": "justify-end", "space-around": "justify-around",
    };
    if (justify[get("justify-content")]) out.push(justify[get("justify-content")]!);
    const align: Record<string, string> = { center: "items-center", "flex-start": "items-start", "flex-end": "items-end", baseline: "items-baseline" };
    if (align[get("align-items")]) out.push(align[get("align-items")]!);
  }
  if ((display.includes("flex") || display.includes("grid")) && get("gap") && get("gap") !== "normal" && get("gap") !== "0px") {
    const token = spacingToken(get("gap").split(" ")[0]!);
    if (token) out.push(`gap-${token}`);
  }

  const position = get("position");
  if (position && position !== "static") out.push(position);

  const pad = ["padding-top", "padding-right", "padding-bottom", "padding-left"].map(get) as [string, string, string, string];
  if (pad.every(Boolean) && !pad.every((v) => v === "0px")) out.push(...boxSides("p", pad));
  const mar = ["margin-top", "margin-right", "margin-bottom", "margin-left"].map(get) as [string, string, string, string];
  if (mar.every(Boolean) && !mar.every((v) => v === "0px")) out.push(...boxSides("m", mar));

  if (get("font-size")) out.push(fontSizeClass(get("font-size")));
  if (get("font-weight") && get("font-weight") !== "400") out.push(fontWeightClass(get("font-weight")));

  const radius = get("border-top-left-radius") || get("border-radius");
  if (radius) {
    const r = radiusClass(radius);
    if (r) out.push(r);
  }

  const opacity = get("opacity");
  if (opacity && opacity !== "1") out.push(`opacity-${Math.round(parseFloat(opacity) * 100)}`);

  return out;
}

function compact<T>(arr: (T | null)[]): T[] {
  return arr.filter((v): v is T => v !== null);
}
