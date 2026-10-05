import { type BridgeCommands, type BridgeMethod, measureBetween } from "@pixel-lens/core";
import { auditContrast } from "./audit";
import { mustQuery, rectOf, snapshot } from "./dom";
import { editStore } from "./edits";
import { pageSummary } from "./page";

type Handlers = {
  [M in BridgeMethod]: (params: BridgeCommands[M]["params"]) => BridgeCommands[M]["result"] | Promise<BridgeCommands[M]["result"]>;
};

/**
 * Content-script side of the Agent Bridge. Every handler runs inside the page
 * and returns plain JSON. `page.screenshot` is handled by the background worker.
 */
export const bridgeHandlers: Omit<Handlers, "page.screenshot"> = {
  "page.summary": () => pageSummary(),

  "element.inspect": ({ selector }) => snapshot(mustQuery(selector)),

  "element.query": ({ selector, limit = 20 }) =>
    [...document.querySelectorAll(selector)].slice(0, Math.min(limit, 100)).map(snapshot),

  "element.distance": ({ from, to }) => {
    const spans = measureBetween(rectOf(mustQuery(from)), rectOf(mustQuery(to)));
    return { from, to, spans: spans.map((s) => ({ axis: s.axis, length: Math.round(s.length * 10) / 10 })) };
  },

  "element.setStyle": ({ selector, styles }) => {
    mustQuery(selector);
    let applied = 0;
    for (const [prop, value] of Object.entries(styles)) {
      editStore.set(selector, prop, value);
      applied++;
    }
    return { applied, diff: editStore.diff() };
  },

  "element.setText": ({ selector, text }) => {
    const el = mustQuery(selector) as HTMLElement;
    el.textContent = text;
    return { ok: true as const };
  },

  "edits.diff": () => ({ diff: editStore.diff(), css: editStore.css() }),

  "edits.revert": () => {
    const reverted = editStore.net.length;
    editStore.revertAll();
    return { reverted };
  },

  "audit.contrast": ({ minLevel }) => auditContrast(minLevel),
};

export async function runBridgeCall(method: BridgeMethod, params: unknown) {
  const handler = (bridgeHandlers as Record<string, (p: unknown) => unknown>)[method];
  if (!handler) throw new Error(`Unsupported method in content script: ${method}`);
  return await handler(params ?? {});
}
