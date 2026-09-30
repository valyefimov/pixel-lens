/**
 * Wire protocol between the MCP server (Node) and the browser extension.
 *
 * Transport: a WebSocket on 127.0.0.1. The MCP server listens, the extension's
 * background worker connects when the user enables the Agent Bridge.
 * Every request carries an `id`; the extension answers with the same `id`.
 */

export const BRIDGE_DEFAULT_PORT = 7331;
export const BRIDGE_PROTOCOL_VERSION = 1;

export interface BoxModel {
  margin: [number, number, number, number];
  border: [number, number, number, number];
  padding: [number, number, number, number];
}

export interface ElementSnapshot {
  selector: string;
  tag: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  box: BoxModel;
  styles: Record<string, string>;
  tailwind: string[];
}

export interface DistanceResult {
  from: string;
  to: string;
  spans: { axis: "x" | "y"; length: number }[];
}

export interface ContrastIssue {
  selector: string;
  text: string;
  ratio: number;
  level: string;
  foreground: string;
  background: string;
  fontSize: number;
}

export interface PageSummary {
  url: string;
  title: string;
  viewport: { width: number; height: number; dpr: number };
  fonts: { family: string; count: number }[];
  colors: { hex: string; count: number }[];
}

/** Commands the agent can send, mapped to their params and result types. */
export interface BridgeCommands {
  "page.summary": { params: Record<string, never>; result: PageSummary };
  "element.inspect": { params: { selector: string }; result: ElementSnapshot };
  "element.query": { params: { selector: string; limit?: number }; result: ElementSnapshot[] };
  "element.distance": { params: { from: string; to: string }; result: DistanceResult };
  "element.setStyle": {
    params: { selector: string; styles: Record<string, string> };
    result: { applied: number; diff: string };
  };
  "element.setText": { params: { selector: string; text: string }; result: { ok: true } };
  "edits.diff": { params: Record<string, never>; result: { diff: string; css: string } };
  "edits.revert": { params: Record<string, never>; result: { reverted: number } };
  "audit.contrast": { params: { minLevel?: "AA" | "AAA" }; result: ContrastIssue[] };
  "page.screenshot": { params: { selector?: string }; result: { dataUrl: string } };
}

export type BridgeMethod = keyof BridgeCommands;

export interface BridgeRequest<M extends BridgeMethod = BridgeMethod> {
  type: "request";
  id: string;
  method: M;
  params: BridgeCommands[M]["params"];
}

export type BridgeResponse<M extends BridgeMethod = BridgeMethod> =
  | { type: "response"; id: string; ok: true; result: BridgeCommands[M]["result"] }
  | { type: "response"; id: string; ok: false; error: string };

export interface BridgeHello {
  type: "hello";
  version: number;
  client: "extension";
  agent: string;
}

export type BridgeMessage = BridgeRequest | BridgeResponse | BridgeHello;

export function isBridgeMessage(v: unknown): v is BridgeMessage {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: unknown }).type;
  return t === "request" || t === "response" || t === "hello";
}
