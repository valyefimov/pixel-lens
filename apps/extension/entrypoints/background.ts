import { browser, type Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeMethod,
  type BridgeRequest,
  type BridgeResponse,
  isBridgeMessage,
} from "@pixel-lens/core";
import type { BridgeCallResult, BridgeStatus, ToBackground, ToContent } from "@/lib/messages";
import { bridgeEnabled, bridgePort } from "@/lib/settings";

const OVERLAY_SCRIPT = "/content-scripts/overlay.js";

export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => void toggleOverlay(tab));
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "toggle-overlay") return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab) await toggleOverlay(tab);
  });

  browser.runtime.onMessage.addListener((msg: ToBackground, sender, sendResponse) => {
    switch (msg.kind) {
      case "screenshot:visible":
        browser.tabs
          .captureVisibleTab(sender.tab?.windowId ?? browser.windows.WINDOW_ID_CURRENT, { format: "png" })
          .then(sendResponse, (e: Error) => sendResponse({ error: e.message }));
        return true;
      case "options:open":
        void browser.runtime.openOptionsPage();
        return false;
      case "bridge:status":
        sendResponse(bridge.status);
        return false;
      case "bridge:reconnect":
        void bridge.sync();
        return false;
    }
  });

  bridgeEnabled.watch(() => void bridge.sync());
  bridgePort.watch(() => void bridge.sync());
  // MV3 workers get suspended; the alarm wakes us up so the bridge can reconnect.
  browser.alarms.create("bridge-keepalive", { periodInMinutes: 0.5 });
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === "bridge-keepalive") void bridge.sync();
  });
  void bridge.sync();
});

/**
 * Injects the overlay script if it is not already running in the tab.
 * Returns true when it was already there. `silent` injects it without opening the UI
 * (used when an agent talks to the page).
 */
async function ensureInjected(tabId: number, silent = false): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { kind: "overlay:ping" } satisfies ToContent);
    return true;
  } catch {
    if (silent) {
      await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          window.__pixelLensSilent = true;
        },
      });
    }
    await browser.scripting.executeScript({ target: { tabId }, files: [OVERLAY_SCRIPT] });
    return false;
  }
}

async function toggleOverlay(tab: Browser.tabs.Tab) {
  if (!tab.id || !tab.url || /^(chrome|edge|about|chrome-extension|devtools):/.test(tab.url)) return;
  try {
    const wasInjected = await ensureInjected(tab.id);
    // A freshly injected script opens itself; only toggle an existing one.
    if (wasInjected) await browser.tabs.sendMessage(tab.id, { kind: "overlay:toggle" } satisfies ToContent);
  } catch (e) {
    console.warn("[pixel-lens] cannot run on this page", e);
  }
}

/**
 * WebSocket client that connects the extension to the local MCP server.
 * The MCP server is the WebSocket *server*; we dial out to 127.0.0.1 only.
 */
class Bridge {
  status: BridgeStatus = "disabled";
  private ws: WebSocket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  async sync() {
    const enabled = await bridgeEnabled.getValue();
    if (!enabled) return this.close("disabled");
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    this.connect(await bridgePort.getValue());
  }

  private connect(port: number) {
    this.status = "connecting";
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    this.ws = ws;
    ws.onopen = () => {
      this.status = "connected";
      ws.send(JSON.stringify({ type: "hello", version: BRIDGE_PROTOCOL_VERSION, client: "extension", agent: navigator.userAgent }));
      // Chrome keeps a service worker alive while a WebSocket exchanges messages.
      this.heartbeat = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"type":"ping"}'), 20_000);
    };
    ws.onmessage = (ev) => void this.onMessage(ev.data);
    ws.onerror = () => {
      this.status = "error";
    };
    ws.onclose = () => {
      if (this.heartbeat) clearInterval(this.heartbeat);
      if (this.ws === ws) this.ws = null;
      if (this.status !== "disabled") this.status = "error";
    };
  }

  private close(status: BridgeStatus) {
    this.status = status;
    this.ws?.close();
    this.ws = null;
  }

  private async onMessage(raw: unknown) {
    let msg: unknown;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!isBridgeMessage(msg) || msg.type !== "request") return;
    const reply = await this.handle(msg).then(
      (result): BridgeResponse => ({ type: "response", id: msg.id, ok: true, result }) as BridgeResponse,
      (e: Error): BridgeResponse => ({ type: "response", id: msg.id, ok: false, error: e.message ?? String(e) }),
    );
    this.ws?.send(JSON.stringify(reply));
  }

  private async handle(req: BridgeRequest): Promise<unknown> {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !tab.url) throw new Error("No active tab");
    const allowed = await browser.permissions.contains({ origins: ["<all_urls>"] });
    if (!allowed) throw new Error("Pixel Lens needs site access for the Agent Bridge. Enable it in the extension options.");

    if (req.method === "page.screenshot") return this.screenshot(tab, (req.params as { selector?: string }).selector);

    await ensureInjected(tab.id, true);
    const res = (await browser.tabs.sendMessage(tab.id, {
      kind: "bridge:call",
      method: req.method as BridgeMethod,
      params: req.params,
    } satisfies ToContent)) as BridgeCallResult;
    if (!res.ok) throw new Error(res.error);
    return res.result;
  }

  private async screenshot(tab: Browser.tabs.Tab, selector?: string) {
    const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId!, { format: "png" });
    if (!selector) return { dataUrl };
    await ensureInjected(tab.id!, true);
    const res = (await browser.tabs.sendMessage(tab.id!, {
      kind: "bridge:call",
      method: "element.inspect",
      params: { selector },
    } satisfies ToContent)) as BridgeCallResult<"element.inspect">;
    if (!res.ok) throw new Error(res.error);
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => devicePixelRatio,
    });
    const dpr = injection?.result ?? 1;
    return { dataUrl: await crop(dataUrl, res.result.rect, dpr) };
  }
}

async function crop(dataUrl: string, rect: { x: number; y: number; width: number; height: number }, dpr: number) {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const w = Math.max(1, Math.min(bitmap.width - sx, Math.round(rect.width * dpr)));
  const h = Math.max(1, Math.min(bitmap.height - sy, Math.round(rect.height * dpr)));
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, w, h, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:image/png;base64,${btoa(bin)}`;
}

const bridge = new Bridge();
