import { storage } from "wxt/utils/storage";
import { BRIDGE_DEFAULT_PORT, type StyleEdit } from "@pixel-lens/core";

export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

export interface GridSettings {
  columns: number;
  gutter: number;
  margin: number;
  maxWidth: number;
  color: string;
}

export interface Preferences {
  colorFormat: ColorFormat;
  showTailwind: boolean;
  snapToElements: boolean;
  grid: GridSettings;
}

export const DEFAULT_PREFERENCES: Preferences = {
  colorFormat: "hex",
  showTailwind: true,
  snapToElements: true,
  grid: { columns: 12, gutter: 24, margin: 24, maxWidth: 1200, color: "#FF3B6B" },
};

export const preferences = storage.defineItem<Preferences>("local:preferences", {
  fallback: DEFAULT_PREFERENCES,
});

export const bridgeEnabled = storage.defineItem<boolean>("local:bridgeEnabled", { fallback: false });
export const bridgePort = storage.defineItem<number>("local:bridgePort", { fallback: BRIDGE_DEFAULT_PORT });

/** Persisted live edits, keyed by origin + pathname so they come back when you revisit the page. */
export function editsItem(pageKey: string) {
  return storage.defineItem<StyleEdit[]>(`local:edits:${pageKey}`, { fallback: [] });
}

export const pageKey = () => location.origin + location.pathname;
