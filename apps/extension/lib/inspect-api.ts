import type { ContrastIssue } from "@pixel-lens/core";
import { type SeoCheck, auditContrast, auditSeo } from "./audit";
import {
  type FontUsage,
  type PageWeight,
  collectFonts,
  collectGradients,
  collectPalette,
  detectTechnologies,
  pageWeight,
} from "./page";

/**
 * Read-only data API for the DevTools panel.
 *
 * It is bundled as a separate script (`inspect.js`) that the panel evaluates inside the inspected
 * page through `chrome.devtools.inspectedWindow.eval`. Opening DevTools on a page is the user's
 * explicit action, so this needs no host permission and no content script. Everything returned is
 * plain JSON because it crosses the DevTools protocol.
 */

export interface ColorsResult {
  palette: { hex: string; count: number; usage: string[] }[];
  gradients: string[];
}

export interface AuditResult {
  level: "AA" | "AAA";
  contrast: ContrastIssue[];
  seo: SeoCheck[];
}

export interface PageResult {
  url: string;
  title: string;
  lang: string;
  weight: PageWeight;
  technologies: string[];
  social: { title: string; description: string; image: string; site: string };
  viewport: { width: number; height: number; dpr: number };
  document: { width: number; height: number };
}

export interface InspectApi {
  colors(): ColorsResult;
  fonts(): FontUsage[];
  audit(level?: "AA" | "AAA"): AuditResult;
  page(): PageResult;
}

const meta = (name: string) =>
  document.querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)?.content ?? "";

export const inspectApi: InspectApi = {
  colors: () => ({
    palette: collectPalette().map((c) => ({ hex: c.hex, count: c.count, usage: [...c.usage] })),
    gradients: collectGradients(),
  }),

  fonts: () => collectFonts(),

  audit: (level = "AA") => ({ level, contrast: auditContrast(level), seo: auditSeo() }),

  page: () => ({
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang,
    weight: pageWeight(),
    technologies: detectTechnologies(),
    social: {
      title: meta("og:title") || document.title,
      description: meta("og:description") || meta("description"),
      image: meta("og:image"),
      site: meta("og:site_name") || location.hostname,
    },
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
  }),
};

/** Where the API lives on the page's `window`. A symbol key keeps it out of enumeration and name clashes. */
export const INSPECT_KEY = "pixel-lens.inspect";
