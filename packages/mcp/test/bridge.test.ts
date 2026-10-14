import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BridgeRequest } from "@pixel-lens/core";
import { Bridge, BridgeNotConnectedError } from "../src/bridge";
import { createServer } from "../src/server";

/** A stand-in for the browser extension: answers bridge requests with canned results. */
async function fakeExtension(port: number, handler: (req: BridgeRequest) => unknown, origin = "chrome-extension://abc") {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  ws.send(JSON.stringify({ type: "hello", version: 1, client: "extension", agent: "test" }));
  ws.on("message", (raw) => {
    const req = JSON.parse(String(raw)) as BridgeRequest;
    try {
      ws.send(JSON.stringify({ type: "response", id: req.id, ok: true, result: handler(req) }));
    } catch (e) {
      ws.send(JSON.stringify({ type: "response", id: req.id, ok: false, error: (e as Error).message }));
    }
  });
  return ws;
}

let bridge: Bridge;
let port: number;

beforeEach(async () => {
  bridge = new Bridge({ port: 0, timeout: 500 });
  await bridge.listen();
  port = bridge.port;
});

afterEach(async () => {
  await bridge.close();
});

const tick = () => new Promise((r) => setTimeout(r, 30));

describe("Bridge", () => {
  it("rejects calls while no extension is connected", async () => {
    await expect(bridge.call("page.summary", {})).rejects.toBeInstanceOf(BridgeNotConnectedError);
  });

  it("round-trips requests to the extension", async () => {
    const ext = await fakeExtension(port, (req) => ({ from: "a", to: "b", spans: [{ axis: "x", length: 24 }], method: req.method }));
    await tick();
    expect(bridge.connected).toBe(true);
    await expect(bridge.call("element.distance", { from: "a", to: "b" })).resolves.toMatchObject({ spans: [{ length: 24 }] });
    ext.close();
  });

  it("surfaces extension errors", async () => {
    const ext = await fakeExtension(port, () => {
      throw new Error("No element matches .nope");
    });
    await tick();
    await expect(bridge.call("element.inspect", { selector: ".nope" })).rejects.toThrow("No element matches .nope");
    ext.close();
  });

  it("refuses connections from web pages", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "https://evil.example" });
    const err = await new Promise<Error>((resolve) => ws.once("error", resolve));
    expect(err.message).toMatch(/401/);
  });

  it("times out when the extension does not answer", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "chrome-extension://abc" });
    await new Promise((r) => ws.once("open", r));
    await tick();
    await expect(bridge.call("page.summary", {})).rejects.toThrow(/Timed out/);
    ws.close();
  });
});

describe("MCP server", () => {
  async function connectClient() {
    const server = createServer(bridge);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    return client;
  }

  it("lists the tools", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining(["inspect_element", "measure_distance", "apply_styles", "get_changes", "screenshot", "audit_contrast"]),
    );
  });

  it("returns a readable error when the extension is offline", async () => {
    const client = await connectClient();
    const res = await client.callTool({ name: "inspect_element", arguments: { selector: "h1" } });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("Agent Bridge");
  });

  it("compacts element snapshots", async () => {
    const ext = await fakeExtension(port, () => ({
      selector: "h1",
      tag: "h1",
      text: "Hello",
      rect: { x: 10, y: 20, width: 300.04, height: 48 },
      box: { margin: [0, 0, 16, 0], border: [0, 0, 0, 0], padding: [0, 0, 0, 0] },
      styles: { display: "block", "font-size": "40px", opacity: "1", "box-shadow": "none" },
      tailwind: ["block", "text-[40px]"],
    }));
    await tick();
    const client = await connectClient();
    const res = await client.callTool({ name: "inspect_element", arguments: { selector: "h1" } });
    const body = JSON.parse((res.content as { text: string }[])[0]!.text);
    expect(body).toMatchObject({ size: "300×48 at (10, 20)", styles: { display: "block", "font-size": "40px" }, tailwind: "block text-[40px]" });
    expect(body.styles).not.toHaveProperty("opacity");
    ext.close();
  });

  it("returns screenshots as image content", async () => {
    const ext = await fakeExtension(port, () => ({ dataUrl: "data:image/png;base64,iVBORw0KGgo=" }));
    await tick();
    const client = await connectClient();
    const res = await client.callTool({ name: "screenshot", arguments: {} });
    expect(res.content).toEqual([{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }]);
    ext.close();
  });
});
