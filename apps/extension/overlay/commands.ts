import { pickColor } from "./panels/ColorsPanel";
import { type OverlayState, type Panel, type Tool, store } from "./store";
import type { IconName } from "./ui/icons";

export const TOOLS: { id: Tool; icon: IconName; label: string; key: string }[] = [
  { id: "inspect", icon: "inspect", label: "Inspect", key: "I" },
  { id: "measure", icon: "measure", label: "Measure distances", key: "M" },
  { id: "ruler", icon: "ruler", label: "Ruler & guides", key: "R" },
  { id: "edit", icon: "edit", label: "Live edit", key: "E" },
];

export const PANELS: { id: Panel; icon: IconName; label: string; key: string }[] = [
  { id: "colors", icon: "colors", label: "Colors", key: "C" },
  { id: "fonts", icon: "fonts", label: "Typography", key: "T" },
  { id: "assets", icon: "assets", label: "Assets", key: "A" },
  { id: "audit", icon: "audit", label: "Audit", key: "U" },
  { id: "page", icon: "page", label: "Page report", key: "P" },
  { id: "edits", icon: "edits", label: "Changes", key: "D" },
];

export function setTool(tool: Tool) {
  store.set((s) => ({ tool, rulerDraft: null, panel: tool === "edit" ? "edits" : s.panel }));
}

export function togglePanel(panel: Panel) {
  store.set((s) => ({ panel: s.panel === panel ? null : panel }));
}

export type CommandGroup = "Tools" | "Panels" | "Overlays" | "Session";

export interface Command {
  id: string;
  label: string;
  icon: IconName;
  group: CommandGroup;
  /** Single-key shortcut shown next to the command. */
  key?: string;
  /** Extra search terms, so "spacing" finds Measure and "palette" finds Colors. */
  keywords?: string;
  run: () => void;
  active?: (s: OverlayState) => boolean;
}

const KEYWORDS: Record<string, string> = {
  inspect: "hover css styles element box model",
  measure: "distance spacing gap margin padding",
  ruler: "guides area snap pixels",
  edit: "css text change live",
  colors: "palette eyedropper picker gradients",
  fonts: "typography type scale font family",
  assets: "images svg download",
  audit: "contrast wcag accessibility seo",
  page: "weight technologies social preview report",
  edits: "diff changes copy prompt revert",
};

/** Everything the command palette can run. Order is the order shown when the query is empty. */
export const COMMANDS: Command[] = [
  ...TOOLS.map<Command>((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
    group: "Tools",
    key: t.key,
    keywords: KEYWORDS[t.id],
    run: () => setTool(t.id),
    active: (s) => s.tool === t.id,
  })),
  { id: "eyedropper", label: "Eyedropper", icon: "color", group: "Tools", key: "K", keywords: "pick color pixel", run: () => void pickColor() },
  ...PANELS.map<Command>((p) => ({
    id: p.id,
    label: p.label,
    icon: p.icon,
    group: "Panels",
    key: p.key,
    keywords: KEYWORDS[p.id],
    run: () => togglePanel(p.id),
    active: (s) => s.panel === p.id,
  })),
  {
    id: "grid",
    label: "Layout grid",
    icon: "grid",
    group: "Overlays",
    key: "G",
    keywords: "columns gutter",
    run: () => store.set((s) => ({ grid: !s.grid })),
    active: (s) => s.grid,
  },
  {
    id: "outlines",
    label: "Outlines on every element",
    icon: "outlines",
    group: "Overlays",
    key: "X",
    keywords: "structure boxes debug",
    run: () => store.set((s) => ({ outlines: !s.outlines })),
    active: (s) => s.outlines,
  },
  {
    id: "design",
    label: "Design overlay",
    icon: "design",
    group: "Overlays",
    key: "O",
    keywords: "mockup compare figma image difference",
    run: () => store.set({ panel: "settings" }),
    active: (s) => !!s.design,
  },
  { id: "settings", label: "Settings", icon: "settings", group: "Session", run: () => togglePanel("settings"), active: (s) => s.panel === "settings" },
  { id: "help", label: "Keyboard shortcuts", icon: "help", group: "Session", key: "?", run: () => togglePanel("help"), active: (s) => s.panel === "help" },
  { id: "close", label: "Close Pixel Lens", icon: "close", group: "Session", key: "Esc", keywords: "exit quit", run: () => store.set({ open: false }) },
];

/** Case-insensitive match on label, shortcut and keywords. Every word of the query must match. */
export function searchCommands(query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return COMMANDS;
  const scored: { c: Command; score: number }[] = [];
  for (const c of COMMANDS) {
    const label = c.label.toLowerCase();
    const hay = `${label} ${c.keywords ?? ""} ${c.key?.toLowerCase() ?? ""}`;
    if (!words.every((w) => hay.includes(w))) continue;
    // Label prefix beats label substring beats keyword-only matches.
    const score = words.reduce((n, w) => n + (label.startsWith(w) ? 0 : label.includes(w) ? 1 : 2), 0);
    scored.push({ c, score });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.c);
}
