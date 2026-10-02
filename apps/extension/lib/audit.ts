import { type ContrastIssue, contrastRatio, parseColor, toHex, wcagLevel } from "@pixel-lens/core";
import { allElements, effectiveBackground, isVisible, ownText, selectorFor } from "./dom";

/**
 * Scans visible text for WCAG contrast problems.
 * `minLevel: "AA"` reports failures only; `"AAA"` also reports elements that pass AA but miss AAA.
 */
export function auditContrast(minLevel: "AA" | "AAA" = "AA"): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (const el of allElements()) {
    const text = ownText(el);
    if (!text || !isVisible(el)) continue;
    const s = getComputedStyle(el);
    const fg = parseColor(s.color);
    if (!fg) continue;
    const bg = effectiveBackground(el);
    const ratio = contrastRatio(fg, bg);
    const size = parseFloat(s.fontSize);
    const level = wcagLevel(ratio, size, parseInt(s.fontWeight, 10));
    const bad = minLevel === "AAA" ? level !== "AAA" : level === "Fail";
    if (!bad) continue;
    issues.push({
      selector: selectorFor(el),
      text: text.slice(0, 80),
      ratio,
      level,
      foreground: toHex(fg),
      background: toHex(bg),
      fontSize: size,
    });
  }
  return issues.sort((a, b) => a.ratio - b.ratio);
}

export type SeoSeverity = "error" | "warning" | "ok";

export interface SeoCheck {
  id: string;
  label: string;
  severity: SeoSeverity;
  detail: string;
}

export function auditSeo(): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, severity: SeoSeverity, detail: string) =>
    checks.push({ id, label, severity, detail });
  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`)?.content?.trim() ?? "";

  const title = document.title.trim();
  add("title", "Title", !title ? "error" : title.length > 60 ? "warning" : "ok", title ? `${title.length} chars: “${title}”` : "Missing <title>");

  const desc = meta("description");
  add(
    "description",
    "Meta description",
    !desc ? "error" : desc.length < 50 || desc.length > 160 ? "warning" : "ok",
    desc ? `${desc.length} chars` : "Missing meta description",
  );

  const h1s = document.querySelectorAll("h1").length;
  add("h1", "Single H1", h1s === 1 ? "ok" : h1s === 0 ? "error" : "warning", `${h1s} <h1> on the page`);

  const lang = document.documentElement.lang;
  add("lang", "Document language", lang ? "ok" : "warning", lang ? `lang="${lang}"` : "Missing lang attribute on <html>");

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  add("canonical", "Canonical URL", canonical ? "ok" : "warning", canonical ?? "No canonical link");

  const imgs = [...document.images];
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
  add("alt", "Image alt text", noAlt ? "error" : "ok", noAlt ? `${noAlt} of ${imgs.length} images have no alt` : `${imgs.length} images, all have alt`);

  const viewport = meta("viewport");
  add("viewport", "Mobile viewport", viewport ? "ok" : "error", viewport || "Missing viewport meta");

  const og = meta("og:image");
  add("og", "Open Graph image", og ? "ok" : "warning", og || "No og:image for social previews");

  // Heading order: no skipping from h2 to h4, etc.
  let prev = 0;
  let skips = 0;
  for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) skips++;
    prev = level;
  }
  add("headings", "Heading order", skips ? "warning" : "ok", skips ? `${skips} skipped heading level(s)` : "Headings are in order");

  return checks;
}
