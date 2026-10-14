import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { BRIDGE_DEFAULT_PORT } from "@pixel-lens/core";
import type { BridgeStatus, ToBackground } from "@/lib/messages";
import { bridgeEnabled, bridgePort } from "@/lib/settings";

const ALL_URLS = { origins: ["<all_urls>"] };

const STATUS_COPY: Record<BridgeStatus, string> = {
  disabled: "Off",
  connecting: "Connecting…",
  connected: "Connected to MCP server",
  error: "Waiting for the MCP server",
};

function useBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus>("disabled");
  useEffect(() => {
    const poll = () =>
      browser.runtime.sendMessage({ kind: "bridge:status" } satisfies ToBackground).then((s: BridgeStatus) => setStatus(s));
    void poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);
  return status;
}

export function Options() {
  const [enabled, setEnabled] = useState(false);
  const [port, setPort] = useState(BRIDGE_DEFAULT_PORT);
  const [hasAccess, setHasAccess] = useState(false);
  const status = useBridgeStatus();

  useEffect(() => {
    void bridgeEnabled.getValue().then(setEnabled);
    void bridgePort.getValue().then(setPort);
    void browser.permissions.contains(ALL_URLS).then(setHasAccess);
  }, []);

  const toggle = async (on: boolean) => {
    // Site access is required so the agent can read whichever tab is active.
    if (on && !(await browser.permissions.contains(ALL_URLS))) {
      const granted = await browser.permissions.request(ALL_URLS);
      setHasAccess(granted);
      if (!granted) return;
    }
    setEnabled(on);
    await bridgeEnabled.setValue(on);
  };

  const config = JSON.stringify(
    { mcpServers: { "pixel-lens": { command: "npx", args: ["-y", "@pixel-lens/mcp", "--port", String(port)] } } },
    null,
    2,
  );

  return (
    <main>
      <header>
        <svg width="28" height="28" viewBox="0 0 20 20" aria-hidden>
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="7" y="7" width="4" height="4" fill="currentColor" />
        </svg>
        <h1>Pixel Lens</h1>
      </header>

      <section className="card">
        <div className="row">
          <div>
            <h2>Agent Bridge</h2>
            <p>
              Lets an MCP client (Claude Code, Cursor, Windsurf…) inspect, measure and edit the active tab through a local
              WebSocket on <code>127.0.0.1</code>. Nothing leaves your machine.
            </p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => void toggle(e.target.checked)} />
            <span />
          </label>
        </div>

        <div className={`status status-${status}`}>
          <span className="dot" /> {STATUS_COPY[status]}
          {!hasAccess && enabled && <em> · site access not granted</em>}
        </div>

        <label className="field">
          <span>Port</span>
          <input
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            onBlur={() => void bridgePort.setValue(port)}
          />
        </label>

        <h3>1. Add the server to your MCP client</h3>
        <pre>{config}</pre>
        <p className="muted">
          Claude Code: <code>claude mcp add pixel-lens -- npx -y @pixel-lens/mcp</code>
        </p>
        <h3>2. Turn the bridge on and ask your agent</h3>
        <p className="muted">“Measure the gap between the header logo and the nav, then make it 24px.”</p>
      </section>

      <section className="card">
        <h2>Shortcut</h2>
        <p>
          Toggle Pixel Lens with <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>. Change it at{" "}
          <code>chrome://extensions/shortcuts</code>.
        </p>
      </section>
    </main>
  );
}
