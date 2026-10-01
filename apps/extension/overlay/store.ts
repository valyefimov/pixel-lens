import { useSyncExternalStore } from "react";
import type { Point } from "@pixel-lens/core";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/settings";

export type Tool = "inspect" | "measure" | "ruler" | "edit";
export type Panel = "colors" | "fonts" | "assets" | "audit" | "page" | "edits" | "settings" | "help";

export interface Guide {
  id: number;
  axis: "x" | "y";
  /** Viewport position in CSS px. */
  pos: number;
}

export interface DesignOverlay {
  src: string;
  name: string;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  difference: boolean;
  locked: boolean;
  /** Scroll with the page instead of sticking to the viewport. */
  attachToPage: boolean;
}

export interface PickedColor {
  hex: string;
  at: number;
}

export interface OverlayState {
  open: boolean;
  tool: Tool;
  panel: Panel | null;
  hovered: Element | null;
  selected: Element | null;
  pinned: Element[];
  altDown: boolean;
  shiftDown: boolean;
  grid: boolean;
  xray: boolean;
  guides: Guide[];
  rulerDraft: { from: Point; to: Point } | null;
  rulers: { from: Point; to: Point }[];
  design: DesignOverlay | null;
  picked: PickedColor[];
  toast: string | null;
  prefs: Preferences;
  /** Bumped on scroll/resize so layers re-read element rects. */
  frame: number;
}

const initial: OverlayState = {
  open: true,
  tool: "inspect",
  panel: null,
  hovered: null,
  selected: null,
  pinned: [],
  altDown: false,
  shiftDown: false,
  grid: false,
  xray: false,
  guides: [],
  rulerDraft: null,
  rulers: [],
  design: null,
  picked: [],
  toast: null,
  prefs: DEFAULT_PREFERENCES,
  frame: 0,
};

type Listener = () => void;

/** A minimal external store. React subscribes with useSyncExternalStore; event handlers call `set`. */
function createStore<T extends object>(init: T) {
  let state = init;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof patch === "function" ? patch(state) : patch;
      let changed = false;
      for (const k in next) if (next[k] !== state[k]) changed = true;
      if (!changed) return;
      state = { ...state, ...next };
      for (const l of listeners) l();
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const store = createStore(initial);

export function useOverlay<S>(selector: (s: OverlayState) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  store.set({ toast: message });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => store.set({ toast: null }), 1600);
}

export async function copy(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast("Clipboard blocked by this page");
  }
}

let guideId = 0;
export const nextGuideId = () => ++guideId;
