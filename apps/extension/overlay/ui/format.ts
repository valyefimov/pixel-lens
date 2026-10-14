import { parseColor, toHex, toHslString, toOklchString, toRgbString } from "@pixel-lens/core";
import type { ColorFormat } from "@/lib/settings";

export function formatColor(value: string, format: ColorFormat): string {
  const c = parseColor(value);
  if (!c) return value;
  switch (format) {
    case "hex":
      return toHex(c);
    case "rgb":
      return toRgbString(c);
    case "hsl":
      return toHslString(c);
    case "oklch":
      return toOklchString(c);
  }
}

/** `16px` -> `16`, keeps non-px values as-is. */
export const num = (v: string) => (v.endsWith("px") ? String(Math.round(parseFloat(v) * 10) / 10) : v);

/** Serialises the meaningful (non-default) styles of an element as a CSS block. */
export function cssBlock(selector: string, styles: Record<string, string>): string {
  const defaults: Record<string, string[]> = {
    "box-shadow": ["none"],
    transform: ["none"],
    opacity: ["1"],
    "z-index": ["auto"],
    "background-image": ["none"],
    "letter-spacing": ["normal"],
    "text-transform": ["none"],
    "border-top-width": ["0px"],
    "border-top-style": ["none"],
    "border-radius": ["0px"],
    "border-top-left-radius": ["0px"],
    transition: ["all", "all 0s ease 0s", "none 0s ease 0s"],
    cursor: ["auto"],
    overflow: ["visible"],
    position: ["static"],
    "grid-template-columns": ["none"],
    "grid-template-rows": ["none"],
    gap: ["normal"],
    "background-color": ["rgba(0, 0, 0, 0)"],
  };
  const lines = Object.entries(styles)
    .filter(([k, v]) => v && !defaults[k]?.includes(v))
    .filter(([k]) => !(k.startsWith("flex") || k === "justify-content" || k === "align-items") || styles.display?.includes("flex"))
    .filter(([k]) => !k.startsWith("border-top-") || styles["border-top-style"] !== "none")
    .map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}
