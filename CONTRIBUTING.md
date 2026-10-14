# Contributing

Thanks for helping make Pixel Lens better.

## Setup

```bash
pnpm install
pnpm dev:ext   # extension with hot reload
pnpm dev:web   # website
```

## Before you open a pull request

```bash
pnpm typecheck
pnpm test
pnpm --filter @pixel-lens/extension test:e2e
```

The first E2E run may ask you to install Playwright's Chromium: `pnpm --filter @pixel-lens/extension exec playwright install chromium`.

## Guidelines

- **Keep math in `packages/core`.** Anything that can be expressed without the DOM (geometry, color, formatting) belongs there, with a unit test.
- **No new permissions without discussion.** The small permission set is a feature.
- **No network calls** from the extension, ever. The only socket is the opt-in bridge to `127.0.0.1`.
- **Keyboard first.** New tools should have a single-key shortcut and be listed in the help panel and the docs.
- Match the surrounding code style: explicit imports, small components, comments that explain *why*.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): `feat(overlay): …`, `fix(mcp): …`, `docs: …`.

## Adding an agent tool

1. Add the method and its types to `BridgeCommands` in `packages/core/src/protocol.ts`.
2. Implement it in `apps/extension/lib/bridge-handlers.ts` (or the background worker if it needs extension APIs).
3. Register the MCP tool in `packages/mcp/src/server.ts` with a clear description.
4. Cover it in `packages/mcp/test` and, if it touches the page, in `apps/extension/e2e/bridge.spec.ts`.
5. Document it on the docs page and in `packages/mcp/README.md`.
