import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { App } from "@/overlay/App";
import { DesignLayer } from "@/overlay/layers/DesignLayer";
import { store } from "@/overlay/store";
import { runBridgeCall } from "@/lib/bridge-handlers";
import { DESIGN_TAG, OVERLAY_TAG } from "@/lib/dom";
import { editStore } from "@/lib/edits";
import type { BridgeCallResult, ToContent } from "@/lib/messages";
import css from "./style.css?inline";

declare global {
  interface Window {
    /** Set by the background worker when the script is injected only to answer agent calls. */
    __pixelLensSilent?: boolean;
  }
}

export default defineContentScript({
  // Injected on demand by the background worker (activeTab), never declared in the manifest.
  registration: "runtime",
  matches: ["<all_urls>"],
  cssInjectionMode: "manual",

  async main(ctx) {
    store.set({ open: !window.__pixelLensSilent });
    window.__pixelLensSilent = false;

    const ui = await createShadowRootUi(ctx, {
      name: OVERLAY_TAG,
      // Full-viewport fixed layer; pointer events are re-enabled per element in CSS.
      position: "modal",
      anchor: "html",
      zIndex: 2147483646,
      css,
      // Keep keyboard events typed into our inputs from reaching page shortcuts.
      isolateEvents: ["keydown", "keyup", "keypress", "paste"],
      onMount(container) {
        // WXT wraps the container in a full-viewport element; make the whole chain click-through
        // so only our own interactive pieces (dock, panels, cards) receive pointer events.
        // WXT's shadow reset (`:host { all: initial }`) also wipes the host's z-index, so the
        // fixed wrapper carries it instead, otherwise positioned page content paints over us.
        for (let el: HTMLElement | null = container; el; el = el.parentElement) {
          el.style.pointerEvents = "none";
          if (!el.parentElement) el.style.zIndex = "2147483646";
        }
        const root = createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();

    // The design overlay lives in the light DOM so mix-blend-mode can see the page.
    const designHost = document.createElement(DESIGN_TAG);
    Object.assign(designHost.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483645",
      pointerEvents: "none",
      display: "none",
      overflow: "hidden",
    });
    document.documentElement.append(designHost);
    const designRoot = createRoot(designHost);
    designRoot.render(<DesignLayer host={designHost} />);
    ctx.onInvalidated(() => {
      designRoot.unmount();
      designHost.remove();
    });

    // Re-apply edits saved for this page.
    await editStore.restore();

    browser.runtime.onMessage.addListener((msg: ToContent, _sender, sendResponse) => {
      switch (msg.kind) {
        case "overlay:ping":
          sendResponse(true);
          return false;
        case "overlay:toggle":
          store.set((s) => ({ open: !s.open }));
          return false;
        case "bridge:call":
          runBridgeCall(msg.method, msg.params).then(
            (result) => sendResponse({ ok: true, result } as BridgeCallResult),
            (e: Error) => sendResponse({ ok: false, error: e.message } satisfies BridgeCallResult),
          );
          return true;
      }
    });
  },
});
