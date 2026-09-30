import {
  type BoxModel,
  type ElementSnapshot,
  type RGBA,
  type Rect,
  blend,
  cssEscape,
  isStableClass,
  parseColor,
  toRect,
  toTailwind,
} from "@pixel-lens/core";

/** Tag name of the custom element that hosts the overlay's shadow root. */
export const OVERLAY_TAG = "pixel-lens-overlay";
/** Light-DOM host for the design comparison image (needs to blend with the page). */
export const DESIGN_TAG = "pixel-lens-design";

export function isOverlayNode(node: Node | null): boolean {
  return !!node && node instanceof Element && !!node.closest(`${OVERLAY_TAG}, ${DESIGN_TAG}`);
}

/** The element under the pointer, ignoring our own overlay. */
export function elementAt(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  return stack.find((el) => !isOverlayNode(el) && el !== document.documentElement) ?? null;
}

export function rectOf(el: Element): Rect {
  return toRect(el.getBoundingClientRect());
}

const px = (v: string) => parseFloat(v) || 0;

export function boxModel(el: Element): BoxModel {
  const s = getComputedStyle(el);
  const four = (p: string, suffix = "") =>
    ["top", "right", "bottom", "left"].map((side) => px(s.getPropertyValue(`${p}-${side}${suffix}`))) as [
      number,
      number,
      number,
      number,
    ];
  return { margin: four("margin"), border: four("border", "-width"), padding: four("padding") };
}

/**
 * Builds a short, reasonably stable CSS selector for an element.
 * Prefers ids, then stable class names, then `:nth-of-type` and stops as soon as the selector is unique.
 */
export function selectorFor(el: Element): string {
  if (el.id && document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) return `#${cssEscape(el.id)}`;

  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${cssEscape(node.id)}`);
      break;
    }
    const classes = [...node.classList].filter(isStableClass).slice(0, 2);
    if (classes.length) part += classes.map((c) => `.${cssEscape(c)}`).join("");

    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((c) => c.tagName === node!.tagName);
      if (siblings.length > 1 && !classes.length) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(part);

    const candidate = parts.join(" > ");
    try {
      if (document.querySelectorAll(candidate).length === 1) return candidate;
    } catch {
      /* invalid intermediate selector, keep walking */
    }
    node = parent;
  }
  return parts.join(" > ");
}

/** A compact label like `button.hero__cta` for headers and tooltips. */
export function shortLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = [...el.classList].filter(isStableClass)[0];
  return cls ? `${tag}.${cls}` : tag;
}

/** Properties shown in the inspector and returned to agents. Ordered roughly by usefulness. */
export const KEY_PROPERTIES = [
  "display", "position", "box-sizing", "width", "height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "text-transform",
  "color", "background-color", "background-image",
  "border-top-width", "border-top-style", "border-top-color", "border-radius", "border-top-left-radius",
  "box-shadow", "opacity", "z-index", "overflow",
  "flex-direction", "flex-wrap", "justify-content", "align-items", "gap",
  "grid-template-columns", "grid-template-rows",
  "transform", "transition", "cursor",
] as const;

export function keyStyles(el: Element): Record<string, string> {
  const s = getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const p of KEY_PROPERTIES) out[p] = s.getPropertyValue(p);
  return out;
}

/**
 * Resolves the color actually painted behind an element by compositing the
 * background colors of its ancestors. Background images are ignored (we can't know their pixels).
 */
export function effectiveBackground(el: Element): RGBA {
  const layers: RGBA[] = [];
  let node: Element | null = el;
  while (node) {
    const c = parseColor(getComputedStyle(node).backgroundColor);
    if (c && c.a > 0) {
      layers.push(c);
      if (c.a >= 1) break;
    }
    node = node.parentElement;
  }
  let result: RGBA = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) result = blend(layers[i]!, result);
  return result;
}

/** Direct text content of an element (not its descendants), trimmed. */
export function ownText(el: Element): string {
  let text = "";
  for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE) text += n.textContent ?? "";
  return text.replace(/\s+/g, " ").trim();
}

export function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const s = getComputedStyle(el);
  return s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0;
}

export function snapshot(el: Element): ElementSnapshot {
  const styles = keyStyles(el);
  return {
    selector: selectorFor(el),
    tag: el.tagName.toLowerCase(),
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
    rect: rectOf(el),
    box: boxModel(el),
    styles,
    tailwind: toTailwind(styles),
  };
}

/** Walks every element in the document (light DOM only), skipping our overlay. */
export function* allElements(root: ParentNode = document.body): Generator<Element> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) =>
      isOverlayNode(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let n = walker.nextNode();
  while (n) {
    yield n as Element;
    n = walker.nextNode();
  }
}

export function querySafe(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    throw new Error(`Invalid selector: ${selector}`);
  }
}

export function mustQuery(selector: string): Element {
  const el = querySafe(selector);
  if (!el) throw new Error(`No element matches ${selector}`);
  return el;
}
