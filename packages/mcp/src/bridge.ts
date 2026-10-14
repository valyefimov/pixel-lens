import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { WebSocketServer, type WebSocket } from "ws";
import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeCommands,
  type BridgeMethod,
  type BridgeRequest,
  isBridgeMessage,
} from "@pixel-lens/core";

export interface BridgeOptions {
  port: number;
  host?: string;
  /** Per-request timeout in ms. */
  timeout?: number;
  log?: (msg: string) => void;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

export class BridgeNotConnectedError extends Error {
  constructor() {
    super(
      "The Pixel Lens extension is not connected. Open the extension options, turn on “Agent Bridge”, " +
        "and make sure a normal web page is the active tab.",
    );
  }
}

/**
 * WebSocket server that the browser extension dials into.
 * Only one extension connection is kept; a newer one replaces the old one.
 */
export class Bridge extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private socket: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private readonly opts: Required<BridgeOptions>;

  constructor(opts: BridgeOptions) {
    super();
    this.opts = { host: "127.0.0.1", timeout: 15_000, log: () => {}, ...opts };
  }

  get connected(): boolean {
    return this.socket?.readyState === 1;
  }

  get port(): number {
    const addr = this.wss?.address();
    return typeof addr === "object" && addr ? addr.port : this.opts.port;
  }

  listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({
        host: this.opts.host,
        port: this.opts.port,
        // Only accept connections from extensions, never from arbitrary web pages.
        verifyClient: ({ origin }: { origin?: string }) =>
          !origin || origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://"),
      });
      wss.once("listening", () => {
        this.wss = wss;
        this.opts.log(`bridge listening on ws://${this.opts.host}:${this.port}`);
        resolve();
      });
      wss.once("error", reject);
      wss.on("connection", (ws) => this.attach(ws));
    });
  }

  private attach(ws: WebSocket) {
    if (this.socket && this.socket !== ws) this.socket.close(4000, "replaced by a newer connection");
    this.socket = ws;
    ws.on("message", (raw) => this.onMessage(String(raw)));
    ws.on("close", () => {
      if (this.socket !== ws) return;
      this.socket = null;
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(new BridgeNotConnectedError());
        this.pending.delete(id);
      }
      this.emit("disconnected");
      this.opts.log("extension disconnected");
    });
  }

  private onMessage(raw: string) {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isBridgeMessage(msg)) return;
    if (msg.type === "hello") {
      if (msg.version !== BRIDGE_PROTOCOL_VERSION) {
        this.opts.log(`warning: extension speaks protocol v${msg.version}, server speaks v${BRIDGE_PROTOCOL_VERSION}`);
      }
      this.emit("connected", msg.agent);
      this.opts.log("extension connected");
      return;
    }
    if (msg.type !== "response") return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error));
  }

  call<M extends BridgeMethod>(method: M, params: BridgeCommands[M]["params"]): Promise<BridgeCommands[M]["result"]> {
    const ws = this.socket;
    if (!ws || ws.readyState !== 1) return Promise.reject(new BridgeNotConnectedError());
    const id = randomUUID();
    const req: BridgeRequest<M> = { type: "request", id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out after ${this.opts.timeout}ms waiting for ${method}`));
      }, this.opts.timeout);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      ws.send(JSON.stringify(req));
    });
  }

  async close() {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    this.socket?.close();
    await new Promise<void>((r) => (this.wss ? this.wss.close(() => r()) : r()));
  }
}
