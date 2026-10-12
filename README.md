<p align="center">
  <img src="apps/extension/assets/icon-512.png" width="88" alt="Pixel Lens logo" />
</p>

<h1 align="center">Pixel Lens</h1>

<p align="center">
  Rulers, specs and live CSS editing for any web page.<br />
  A free, open-source browser extension for designers and developers, with an MCP bridge for AI coding agents.
</p>

<p align="center">
  <a href="https://pixel-lens.dev">Website</a> ·
  <a href="https://pixel-lens.dev/docs">Docs</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Features

| Tool | What it does | Key |
| --- | --- | --- |
| Inspect | Hover card with size, box model, typography, colors, WCAG contrast, layout and Tailwind classes. Pin cards to compare. | `I` |
| Measure | Edge-to-edge distances between the selection and the hovered element. Hold `Alt` in any tool. | `M` |
| Ruler & guides | Drag to measure an area with snapping; pull guides from the rulers. | `R` |
| Live edit | Edit CSS and text in place. Every change is tracked, persisted per page and exported as a diff, CSS or an agent prompt. | `E` |
| Design overlay | Paste or drop a mockup over the page, align it, and use difference blending to find every off-by-one. | `O` |
| Colors | Eyedropper, page palette, gradients; HEX, RGB, HSL and OKLCH; export as CSS tokens. | `C` `K` |
| Typography | All font families and their size/weight/line-height combinations. | `T` |
| Assets | Images, inline SVGs, background images and videos, ready to download. | `A` |
| Audit | WCAG AA/AAA contrast failures and SEO basics, with one-click jump to the element. | `U` |
| Page report | Page weight by resource type, detected technologies, social preview. | `P` |
| Grid & X-ray | Configurable column grid and outlines on every element. | `G` `X` |
| Agent bridge | Local MCP server so Claude Code, Cursor or Windsurf can inspect, measure, edit and screenshot the active tab. | |

Arrow keys walk the DOM tree (parent, child, siblings), `Space` pins, `Esc` backs out, `?` lists every shortcut.

### Why another inspector?

Every feature is free under the MIT license, with no license keys or trial.

The extension only runs on the tab where you invoke it (`activeTab`). It asks for access to all sites only if you turn on the agent bridge. There are no analytics, accounts or remotely loaded code.

Live edits export as a prompt you can paste into a coding agent, and the MCP server lets the agent take measurements itself.

## Repository layout

```
apps/
  extension/   WXT + React browser extension (Chrome, Edge, Brave, Arc; Firefox experimental)
  landing/     Marketing site and docs (Astro, statically rendered)
packages/
  core/        Framework-free geometry, color, Tailwind and CSS-diff helpers + bridge protocol
  mcp/         MCP server (stdio) with a WebSocket bridge to the extension
docs/          Architecture notes
```

## Getting started

Requirements: Node.js 22.12+ and pnpm 10.

```bash
pnpm install
pnpm dev:ext      # run the extension with hot reload in a fresh browser profile
pnpm dev:web      # run the website at http://localhost:4321
```

### Load the extension manually

```bash
pnpm --filter @pixel-lens/extension build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and pick `apps/extension/.output/chrome-mv3`.

### Connect an AI agent

```bash
pnpm --filter @pixel-lens/mcp build
claude mcp add pixel-lens -- node "$(pwd)/packages/mcp/dist/cli.mjs"
```

Open the extension options, switch on **Agent Bridge** and grant site access. See [packages/mcp](packages/mcp/README.md) for the full tool list.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm build` | Build every package |
| `pnpm test` | Unit tests (core, mcp) with Vitest |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm --filter @pixel-lens/extension test:e2e` | Playwright end-to-end tests in real Chromium, including the agent bridge |
| `pnpm --filter @pixel-lens/extension zip` | Package the extension for store upload |

## License

[MIT](LICENSE) © Valentyn Yefimov. Third-party packages keep their own licenses, listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Trademarks, contribution rules and the originality policy are in [docs/LEGAL.md](docs/LEGAL.md).

Chrome, Edge, Firefox, Brave, Arc, Figma, Claude, Cursor, Windsurf and Tailwind CSS are trademarks of their respective owners. Pixel Lens is an independent project and is not affiliated with or endorsed by them.
