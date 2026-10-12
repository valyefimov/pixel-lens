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

- Put anything that works without the DOM (geometry, color, formatting) in `packages/core`, with a unit test.
- Open an issue before adding a permission. The short permission list is deliberate.
- The extension makes no network calls. The only socket is the opt-in bridge to `127.0.0.1`.
- Give new tools a single-key shortcut and list them in the help panel and the docs.
- Follow the surrounding code: explicit imports, small components, and comments that explain why.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): `feat(overlay): …`, `fix(mcp): …`, `docs: …`.

## Adding an agent tool

1. Add the method and its types to `BridgeCommands` in `packages/core/src/protocol.ts`.
2. Implement it in `apps/extension/lib/bridge-handlers.ts` (or the background worker if it needs extension APIs).
3. Register the MCP tool in `packages/mcp/src/server.ts` with a clear description.
4. Cover it in `packages/mcp/test` and, if it touches the page, in `apps/extension/e2e/bridge.spec.ts`.
5. Document it on the docs page and in `packages/mcp/README.md`.
