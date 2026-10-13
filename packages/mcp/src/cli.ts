import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BRIDGE_DEFAULT_PORT } from "@pixel-lens/core";
import { Bridge } from "./bridge";
import { createServer } from "./server";

const HELP = `pixel-lens-mcp — MCP server for the Pixel Lens browser extension

Usage:
  npx -y @vefimov/pixel-lens [--port ${BRIDGE_DEFAULT_PORT}]

Options:
  -p, --port <n>   WebSocket port the extension connects to (default ${BRIDGE_DEFAULT_PORT})
  -h, --help       Show this help

Add it to Claude Code:
  claude mcp add pixel-lens -- npx -y @vefimov/pixel-lens
`;

// stdout belongs to the MCP protocol; everything human-readable goes to stderr.
const log = (msg: string) => process.stderr.write(`[pixel-lens] ${msg}\n`);

async function main() {
  const { values } = parseArgs({
    options: {
      port: { type: "string", short: "p" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stderr.write(HELP);
    return;
  }

  const port = Number(values.port ?? process.env.PIXEL_LENS_PORT ?? BRIDGE_DEFAULT_PORT);
  const bridge = new Bridge({ port, log });
  try {
    await bridge.listen();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EADDRINUSE") {
      log(`port ${port} is already in use — is another Pixel Lens MCP server running? Use --port to pick another one.`);
      process.exit(1);
    }
    throw e;
  }

  const server = createServer(bridge);
  await server.connect(new StdioServerTransport());

  const shutdown = async () => {
    await server.close();
    await bridge.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.stdin.on("close", shutdown);
}

main().catch((e) => {
  log(String(e?.stack ?? e));
  process.exit(1);
});
