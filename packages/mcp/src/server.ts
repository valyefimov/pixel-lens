import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ElementSnapshot } from "@pixel-lens/core";
import pkg from "../package.json" with { type: "json" };
import type { Bridge } from "./bridge";

const VERSION = pkg.version;

type ToolResult = { content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[]; isError?: boolean };

const text = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/** Wraps a handler so bridge failures come back as tool errors the agent can read, not protocol errors. */
function safe<A>(fn: (args: A) => Promise<ToolResult>) {
  return async (args: A): Promise<ToolResult> => {
    try {
      return await fn(args);
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  };
}

/** Drops default-valued styles so snapshots stay small in the agent's context window. */
export function compactSnapshot(s: ElementSnapshot) {
  const skip = new Set(["none", "normal", "auto", "0px", "rgba(0, 0, 0, 0)", "visible", "static", "1"]);
  const styles = Object.fromEntries(Object.entries(s.styles).filter(([, v]) => v && !skip.has(v)));
  const r = s.rect;
  return {
    selector: s.selector,
    tag: s.tag,
    text: s.text || undefined,
    size: `${round(r.width)}×${round(r.height)} at (${round(r.x)}, ${round(r.y)})`,
    box: s.box,
    styles,
    tailwind: s.tailwind.join(" ") || undefined,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

const selector = z.string().min(1).describe("CSS selector, e.g. `header nav > a:first-child` or `#pricing .card`");

export function createServer(bridge: Bridge): McpServer {
  const server = new McpServer(
    { name: "pixel-lens", version: VERSION },
    {
      instructions:
        "Pixel Lens connects you to the user's active browser tab. Use it to measure layouts, read computed styles, " +
        "check contrast, and preview CSS changes live before editing source code. Prefer `inspect_element` for exact values, " +
        "`measure_distance` for spacing, and `apply_styles` to try changes; then call `get_changes` and port the diff to the codebase.",
    },
  );

  server.registerTool(
    "page_summary",
    {
      title: "Page summary",
      description: "URL, title, viewport size, fonts in use and the main color palette of the active tab.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => text(await bridge.call("page.summary", {}))),
  );

  server.registerTool(
    "inspect_element",
    {
      title: "Inspect element",
      description: "Size, position, box model (margin/border/padding), key computed styles and equivalent Tailwind classes of the first element matching a selector.",
      inputSchema: { selector },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ selector }) => text(compactSnapshot(await bridge.call("element.inspect", { selector })))),
  );

  server.registerTool(
    "query_elements",
    {
      title: "Query elements",
      description: "Like inspect_element, but for every element matching the selector (up to `limit`). Useful to compare list items or cards.",
      inputSchema: { selector, limit: z.number().int().min(1).max(100).default(20) },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ selector, limit }) => text((await bridge.call("element.query", { selector, limit })).map(compactSnapshot))),
  );

  server.registerTool(
    "measure_distance",
    {
      title: "Measure distance",
      description:
        "Pixel distance between two elements, measured edge to edge like a design tool. If one contains the other, returns the four inner offsets.",
      inputSchema: { from: selector, to: selector },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ from, to }) => text(await bridge.call("element.distance", { from, to }))),
  );

  server.registerTool(
    "audit_contrast",
    {
      title: "Audit contrast",
      description: "Finds text that fails WCAG contrast on the page, sorted worst first.",
      inputSchema: { level: z.enum(["AA", "AAA"]).default("AA") },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ level }) => {
      const issues = await bridge.call("audit.contrast", { minLevel: level });
      return text(issues.length ? issues : `No ${level} contrast issues found.`);
    }),
  );

  server.registerTool(
    "apply_styles",
    {
      title: "Apply styles",
      description:
        "Live-edits CSS on the page (not the source code). Applies to every element matching the selector. Changes are tracked; use get_changes to get the diff and revert_changes to undo.",
      inputSchema: {
        selector,
        styles: z.record(z.string(), z.string()).describe('CSS properties in kebab-case, e.g. { "padding-top": "24px", "gap": "16px" }'),
      },
    },
    safe(async ({ selector, styles }) => {
      const res = await bridge.call("element.setStyle", { selector, styles });
      return text(`Applied ${res.applied} declaration(s).\n\nCurrent diff:\n${res.diff}`);
    }),
  );

  server.registerTool(
    "set_text",
    {
      title: "Set text",
      description: "Replaces the text content of the first element matching the selector. Handy for testing copy changes and overflow.",
      inputSchema: { selector, text: z.string() },
    },
    safe(async ({ selector, text: value }) => {
      await bridge.call("element.setText", { selector, text: value });
      return text("Text updated.");
    }),
  );

  server.registerTool(
    "get_changes",
    {
      title: "Get changes",
      description: "Returns all live CSS edits made on this page (by you or the user) as a diff and as plain CSS, ready to port into the codebase.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => {
      const { diff, css } = await bridge.call("edits.diff", {});
      return text(diff ? `Diff:\n${diff}\n\nCSS:\n${css}` : "No changes yet.");
    }),
  );

  server.registerTool(
    "revert_changes",
    {
      title: "Revert changes",
      description: "Removes every live CSS edit on the page.",
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    safe(async () => text(`Reverted ${(await bridge.call("edits.revert", {})).reverted} change(s).`)),
  );

  server.registerTool(
    "screenshot",
    {
      title: "Screenshot",
      description: "Captures the visible part of the active tab, or just one element when a selector is given.",
      inputSchema: { selector: selector.optional() },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ selector }) => {
      const { dataUrl } = await bridge.call("page.screenshot", { selector });
      const [meta, data] = dataUrl.split(",");
      const mimeType = /data:([^;]+)/.exec(meta ?? "")?.[1] ?? "image/png";
      return { content: [{ type: "image", data: data ?? "", mimeType }] };
    }),
  );

  server.registerTool(
    "bridge_status",
    {
      title: "Bridge status",
      description: "Tells whether the browser extension is connected.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      text(
        bridge.connected
          ? `Connected on port ${bridge.port}.`
          : `Not connected. Ask the user to enable “Agent Bridge” in the Pixel Lens options (port ${bridge.port}).`,
      ),
  );

  return server;
}
