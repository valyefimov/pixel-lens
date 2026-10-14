import { useEffect } from "react";
import { elementAt, isOverlayNode } from "@/lib/dom";
import { editTextInPlace } from "@/lib/edits";
import { preferences } from "@/lib/settings";
import { Dock, PANELS, TOOLS, setTool, togglePanel } from "./Dock";
import { InspectorCard, PinnedCards } from "./InspectorCard";
import { PanelHost } from "./Panels";
import { GridLayer } from "./layers/GridLayer";
import { ElementLayer } from "./layers/ElementLayer";
import { RulerLayer } from "./layers/RulerLayer";
import { pickColor } from "./panels/ColorsPanel";
import { loadDesign } from "./panels/SettingsPanel";
import { store, toast, useOverlay } from "./store";

/** True when the event comes from something the user is typing into (page or overlay). */
function isTyping(e: Event): boolean {
  const t = e.composedPath()[0] as HTMLElement | undefined;
  if (!t || !(t instanceof HTMLElement)) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

const fromOverlay = (e: Event) => e.composedPath().some((n) => isOverlayNode(n as Node));
const elementTool = () => ["inspect", "measure", "edit"].includes(store.get().tool);

function useXray() {
  const xray = useOverlay((s) => s.xray);
  const open = useOverlay((s) => s.open);
  useEffect(() => {
    if (!xray || !open) return;
    const style = document.createElement("style");
    style.dataset.pixelLens = "xray";
    style.textContent = `body *:not(pixel-lens-overlay):not(pixel-lens-design) { outline: 1px solid rgba(124, 92, 255, 0.45) !important; outline-offset: -1px !important; }`;
    document.head.append(style);
    return () => style.remove();
  }, [xray, open]);
}

function usePreferences() {
  useEffect(() => {
    void preferences.getValue().then((prefs) => store.set({ prefs }));
    return preferences.watch((prefs) => prefs && store.set({ prefs }));
  }, []);
}

function useGlobalEvents() {
  const open = useOverlay((s) => s.open);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => store.set((s) => ({ frame: s.frame + 1 })));
    };

    const onMove = (e: PointerEvent) => {
      if (!elementTool()) return;
      // Moving onto the dock or a panel hides the hover card so it doesn't cover the page.
      if (fromOverlay(e)) return store.set({ hovered: null });
      store.set({ hovered: elementAt(e.clientX, e.clientY), altDown: e.altKey, shiftDown: e.shiftKey });
    };

    // Swallow page interactions while an element tool is active so links and buttons don't fire.
    const block = (e: MouseEvent) => {
      if (!elementTool() || fromOverlay(e) || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const onClick = (e: MouseEvent) => {
      if (!elementTool() || fromOverlay(e) || (e.target as HTMLElement)?.isContentEditable) return;
      block(e);
      const el = elementAt(e.clientX, e.clientY);
      store.set({ selected: el, hovered: el });
    };

    const onDblClick = (e: MouseEvent) => {
      if (store.get().tool !== "edit" || fromOverlay(e)) return;
      block(e);
      const el = elementAt(e.clientX, e.clientY);
      if (el instanceof HTMLElement) editTextInPlace(el, () => toast("Text updated"));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      store.set({ altDown: e.altKey, shiftDown: e.shiftKey });
      if (isTyping(e) || e.metaKey || e.ctrlKey) return;
      const s = store.get();
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      let handled = true;

      const tool = TOOLS.find((t) => t.key === key);
      const panel = PANELS.find((p) => p.key === key);
      if (tool && !e.altKey) setTool(tool.id);
      else if (panel && !e.altKey) togglePanel(panel.id);
      else if (key === "K") void pickColor();
      else if (key === "G") store.set({ grid: !s.grid });
      else if (key === "X") store.set({ xray: !s.xray });
      else if (key === "O") store.set({ panel: "settings" });
      else if (key === "?") togglePanel("help");
      else if (key === "Escape") {
        if (s.rulers.length || s.rulerDraft) store.set({ rulers: [], rulerDraft: null });
        else if (s.selected) store.set({ selected: null });
        else if (s.panel) store.set({ panel: null });
        else store.set({ open: false });
      } else if (key === " " && s.selected) {
        store.set({ pinned: s.pinned.includes(s.selected) ? s.pinned : [...s.pinned, s.selected] });
      } else if (key.startsWith("Arrow") && s.design && !s.design.locked && !s.selected) {
        const step = e.shiftKey ? 10 : 1;
        const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
        const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
        store.set({ design: { ...s.design, x: s.design.x + dx, y: s.design.y + dy } });
      } else if (key.startsWith("Arrow") && s.selected) {
        const el = s.selected;
        const next =
          key === "ArrowUp"
            ? el.parentElement !== document.documentElement && el.parentElement
            : key === "ArrowDown"
              ? el.firstElementChild
              : key === "ArrowLeft"
                ? el.previousElementSibling
                : el.nextElementSibling;
        if (next && !isOverlayNode(next)) store.set({ selected: next, hovered: next });
      } else handled = false;

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => store.set({ altDown: e.altKey, shiftDown: e.shiftKey });

    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e)) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        loadDesign(file);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        loadDesign(file);
      }
    };

    const opts = { capture: true };
    addEventListener("pointermove", onMove, opts);
    addEventListener("pointerdown", block, opts);
    addEventListener("mousedown", block, opts);
    addEventListener("mouseup", block, opts);
    addEventListener("click", onClick, opts);
    addEventListener("dblclick", onDblClick, opts);
    addEventListener("keydown", onKeyDown, opts);
    addEventListener("keyup", onKeyUp, opts);
    addEventListener("scroll", bump, { capture: true, passive: true });
    addEventListener("resize", bump);
    addEventListener("paste", onPaste, opts);
    addEventListener("dragover", onDragOver, opts);
    addEventListener("drop", onDrop, opts);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove, opts);
      removeEventListener("pointerdown", block, opts);
      removeEventListener("mousedown", block, opts);
      removeEventListener("mouseup", block, opts);
      removeEventListener("click", onClick, opts);
      removeEventListener("dblclick", onDblClick, opts);
      removeEventListener("keydown", onKeyDown, opts);
      removeEventListener("keyup", onKeyUp, opts);
      removeEventListener("scroll", bump, opts);
      removeEventListener("resize", bump);
      removeEventListener("paste", onPaste, opts);
      removeEventListener("dragover", onDragOver, opts);
      removeEventListener("drop", onDrop, opts);
    };
  }, [open]);
}

function Toast() {
  const message = useOverlay((s) => s.toast);
  return message ? (
    <div className="pl-toast" role="status">
      {message}
    </div>
  ) : null;
}

export function App() {
  const open = useOverlay((s) => s.open);
  const tool = useOverlay((s) => s.tool);
  usePreferences();
  useGlobalEvents();
  useXray();

  if (!open) return null;
  return (
    <div className={`pl-root pl-tool-${tool}`}>
      <GridLayer />
      <svg className="pl-svg">
        <ElementLayer />
      </svg>
      <RulerLayer />
      <InspectorCard />
      <PinnedCards />
      <PanelHost />
      <Dock />
      <Toast />
    </div>
  );
}
