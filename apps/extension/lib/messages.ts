import type { BridgeMethod, BridgeCommands } from "@pixel-lens/core";

/** Messages sent from the background worker to the overlay content script. */
export type ToContent =
  | { kind: "overlay:toggle" }
  | { kind: "overlay:ping" }
  | { kind: "bridge:call"; method: BridgeMethod; params: unknown };

/** Messages sent from the overlay (or options page) to the background worker. */
export type ToBackground =
  | { kind: "screenshot:visible" }
  | { kind: "options:open" }
  | { kind: "bridge:status" }
  | { kind: "bridge:reconnect" };

export type BridgeStatus = "disabled" | "connecting" | "connected" | "error";

export type BridgeCallResult<M extends BridgeMethod = BridgeMethod> =
  | { ok: true; result: BridgeCommands[M]["result"] }
  | { ok: false; error: string };
