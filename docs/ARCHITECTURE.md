# Architecture

Pixel Lens is a pnpm monorepo with two apps (the extension and the website) and two packages (shared core and the MCP server).

```
┌──────────────────────────── Browser ─────────────────────────────┐
│                                                                   │
│  Tab                                    Extension service worker  │
│  ┌──────────────────────────────┐      ┌───────────────────────┐  │
│  │ <pixel-lens-overlay>         │◀────▶│ background.ts         │  │
│  │   shadow root                │ msg  │  • action / shortcut  │  │
│  │   React: layers, card, dock, │      │  • scripting.execute  │  │
│  │   panels                     │      │  • captureVisibleTab  │  │
│  │ <pixel-lens-design>          │      │  • Bridge (WS client) │  │
│  │ <style data-pixel-lens>      │      └──────────┬────────────┘  │
│  └──────────────────────────────┘                 │               │
└───────────────────────────────────────────────────┼───────────────┘
                                                    │ ws://127.0.0.1:7331
                                         ┌──────────▼────────────┐
                                         │ @pixel-lens/mcp       │
                                         │  Bridge (WS server)   │
                                         │  McpServer (stdio)    │◀──▶ AI agent
                                         └───────────────────────┘
```

## packages/core

Plain TypeScript with no runtime DOM or framework dependencies. The extension, the MCP server, the website and the Vitest suite all import it.

| Module | Responsibility |
| --- | --- |
| `geometry.ts` | Rects, `measureBetween` (Figma-style distances, inner offsets when nested), snapping |
| `color.ts` | Parsing (hex, rgb, hsl, keywords), HEX/RGB/HSL/OKLCH output, alpha compositing, WCAG luminance, contrast and grading |
| `tailwind.ts` | Computed styles → Tailwind v4 utilities, falling back to arbitrary values |
| `css.ts` | Shorthand collapsing, font stacks, stable class detection, edit folding and diff/CSS rendering |
| `protocol.ts` | Typed request/response contract between the MCP server and the extension |

## apps/extension

Built with [WXT](https://wxt.dev). Auto-imports are disabled so every dependency is explicit.

### Permissions

The manifest asks for `activeTab`, `scripting`, `storage` and `alarms`. The overlay content script uses `registration: "runtime"`, so it is never declared in the manifest and never runs on its own. WXT would normally turn its `matches` into `host_permissions`; a `build:manifestGenerated` hook strips them for production builds. `<all_urls>` is an *optional* permission, requested only when the user enables the Agent Bridge.

### Background worker (`entrypoints/background.ts`)

- On the toolbar click or `Alt+Shift+P`, pings the tab. If the overlay is not there, injects `content-scripts/overlay.js`, otherwise toggles it.
- Takes screenshots for the overlay and for agents (optionally cropped to an element with `OffscreenCanvas`).
- Runs the bridge client. MV3 workers are suspended when idle; a 30-second alarm and a 20-second WebSocket heartbeat keep the connection alive while the bridge is enabled.
- When an agent call arrives for a tab without the overlay, the script is injected silently (a flag set via `executeScript` before injection) so the UI does not pop up.

### Overlay (`entrypoints/overlay.content`, `overlay/`)

- Mounted with `createShadowRootUi`, so page CSS cannot reach the UI and vice versa. WXT's `:host { all: initial }` reset wipes `pointer-events` and `z-index` on the host, so both are set inline on the shadow's wrapper chain at mount time.
- State lives in a tiny external store (`overlay/store.ts`) read through `useSyncExternalStore`. Global listeners (pointer, keyboard, scroll, paste, drop) are attached in the capture phase and write to the store; components subscribe to slices.
- The layers are SVG: box model shading and distances (`ElementLayer`), rulers and guides (`RulerLayer`), column grid (`GridLayer`). Positions are viewport coordinates from `getBoundingClientRect`; a `frame` counter bumped on scroll/resize via `requestAnimationFrame` triggers re-measurement.
- The design overlay renders into a separate light-DOM host (`<pixel-lens-design>`). The overlay's shadow host is a stacking context, which would isolate `mix-blend-mode: difference` from the page.
- While an element tool is active, `pointerdown`, `mousedown`, `mouseup` and `click` on the page are cancelled in the capture phase so links and buttons do not fire. Events whose composed path contains the overlay are left alone.

### Live editing (`lib/edits.ts`)

Edits are stored as `{ selector, property, before, after }` and rendered as `selector { property: value !important }` into a single `<style data-pixel-lens="edits">`. Unlike inline styles, this leaves the page's own inline styles untouched and applies to every element the selector matches, the way a stylesheet change would. Reverting means re-rendering the sheet.

The net edits are persisted in `chrome.storage.local` under `edits:<origin><pathname>` and restored when the overlay is injected again. The edit log is immutable (replaced, never mutated) because React reads it through `useSyncExternalStore`.

### Selectors (`lib/dom.ts`)

`selectorFor` prefers a unique id, then up to two *stable* class names per level (generated CSS-in-JS and CSS-module classes are skipped), then `:nth-of-type`, and stops climbing as soon as the selector is unique.

## packages/mcp

- `bridge.ts`: a `WebSocketServer` bound to `127.0.0.1` that only accepts `chrome-extension://` or `moz-extension://` origins. Requests are correlated by UUID with a per-call timeout; a disconnect rejects everything in flight.
- `server.ts`: an `McpServer` with tools that map onto bridge methods. Element snapshots are compacted (default-valued styles dropped) to save the agent's context. Failures are returned as tool errors with actionable messages instead of protocol errors.
- `cli.ts`: stdio transport. Logs go to stderr because stdout belongs to the protocol. Bundled with tsdown so the published package does not depend on private workspace packages.

## apps/landing

Astro with `output: "static"`: every page is rendered to HTML at build time. React is used only for the hero demo (`client:visible`), which imports `measureBetween` from `@pixel-lens/core`, the same code the extension runs.

The site is hosted on Vercel at `pixel-lens.yefimov.tech`. Since the build runs from the monorepo root, the root `vercel.json` sets the install command, the build filter and the output directory (`apps/landing/dist`).

## Testing

| Layer | Tooling | What is covered |
| --- | --- | --- |
| core | Vitest | Geometry, color math (incl. WebAIM reference values), Tailwind mapping, diffs |
| mcp | Vitest | Bridge round-trips, origin checks, timeouts, tool listing and output shaping via an in-memory MCP client |
| extension | Playwright + real Chromium | Inspector, link blocking, Alt-measure, DOM navigation, contrast audit, live edit persistence, ruler, and a full agent bridge session against the real MCP bridge |

E2E builds set `PIXEL_LENS_E2E=1` to keep host permissions so tests can inject the overlay without a toolbar click.
