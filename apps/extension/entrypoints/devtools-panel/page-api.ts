import { browser } from "wxt/browser";
import { INSPECT_KEY, type AuditResult, type ColorsResult, type InspectApi, type PageResult } from "@/lib/inspect-api";
import type { FontUsage } from "@/lib/page";

/**
 * Talks to the inspected page from the DevTools panel.
 *
 * Normal path: `chrome.devtools.inspectedWindow.eval`, which needs no host permission because the user
 * opened DevTools on that page. Test path: the panel page opened as a regular tab with `?tabId=<n>`
 * runs the same expressions through `scripting.executeScript`. That path only works when the
 * extension has host access, which is the case in the E2E build and nowhere else.
 */

const testTabId = Number(new URLSearchParams(location.search).get("tabId")) || null;

export const inDevTools = () => !!chrome.devtools?.inspectedWindow;
export const canInspect = () => inDevTools() || testTabId !== null;

let scriptText: Promise<string> | undefined;
const getScript = () => (scriptText ??= fetch(browser.runtime.getURL("/inspect.js")).then((r) => r.text()));

function evalInPage<T>(expression: string): Promise<T> {
  if (inDevTools()) {
    return new Promise<T>((resolve, reject) => {
      chrome.devtools.inspectedWindow.eval(expression, (result, info) => {
        if (info?.isException) reject(new Error(String(info.value ?? "The page threw an exception")));
        else if (info?.isError) reject(new Error(String(info.description ?? "DevTools could not evaluate the script")));
        else resolve(result as T);
      });
    });
  }
  if (testTabId !== null) {
    return chrome.scripting
      .executeScript({ target: { tabId: testTabId }, world: "MAIN", func: (expr: string) => (0, eval)(expr), args: [expression] })
      .then(([injection]) => injection?.result as T);
  }
  return Promise.reject(new Error("Open this panel from Chrome DevTools."));
}

async function call<T>(method: keyof InspectApi, ...args: unknown[]): Promise<T> {
  const source = await getScript();
  const expression = `(function () {
    var key = Symbol.for(${JSON.stringify(INSPECT_KEY)});
    if (!window[key]) {
${source}
    }
    return window[key][${JSON.stringify(method)}].apply(null, ${JSON.stringify(args)});
  })()`;
  return evalInPage<T>(expression);
}

export const pageApi = {
  colors: () => call<ColorsResult>("colors"),
  fonts: () => call<FontUsage[]>("fonts"),
  audit: (level: "AA" | "AAA") => call<AuditResult>("audit", level),
  page: () => call<PageResult>("page"),
};

/** Selects the element in the Elements panel (DevTools' own `inspect()`), or scrolls to it in test mode. */
export function revealInElements(selector: string): Promise<boolean> {
  return evalInPage<boolean>(`(function () {
    var el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    if (typeof inspect === "function") inspect(el);
    else el.scrollIntoView({ block: "center" });
    return true;
  })()`);
}

/** Calls `fn` when the inspected page navigates, so the panel can refresh itself. */
export function onNavigated(fn: () => void): () => void {
  const network = chrome.devtools?.network;
  if (!network) return () => {};
  network.onNavigated.addListener(fn);
  return () => network.onNavigated.removeListener(fn);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The async clipboard API can be blocked in a DevTools frame; fall back to the old way.
    const area = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}
