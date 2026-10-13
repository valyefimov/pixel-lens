# @pixel-lens/mcp

An [MCP](https://modelcontextprotocol.io) server that lets AI coding agents inspect, measure, audit, screenshot and live-edit the page open in your browser, through the [Pixel Lens](https://pixel-lens.yefimov.tech) extension.

## Setup

1. Install the Pixel Lens extension.
2. Add the server to your MCP client:

   ```bash
   # Claude Code
   claude mcp add pixel-lens -- npx -y @pixel-lens/mcp
   ```

   ```json
   {
     "mcpServers": {
       "pixel-lens": { "command": "npx", "args": ["-y", "@pixel-lens/mcp"] }
     }
   }
   ```

3. Open the extension options, switch on **Agent Bridge** and grant site access.

## Tools

| Tool | Description |
| --- | --- |
| `page_summary` | URL, title, viewport, fonts and main palette of the active tab |
| `inspect_element` | Size, position, box model, key computed styles and Tailwind classes |
| `query_elements` | The same for every element matching a selector |
| `measure_distance` | Edge-to-edge distance between two elements, or inner offsets when nested |
| `audit_contrast` | WCAG AA/AAA contrast failures, worst first |
| `apply_styles` | Live-edit CSS on the page; returns the running diff |
| `set_text` | Replace an element's text |
| `get_changes` | All live edits as a diff and as CSS |
| `revert_changes` | Undo every live edit |
| `screenshot` | PNG of the visible tab or a single element |
| `bridge_status` | Whether the extension is connected |

## Options

| Flag | Env | Default |
| --- | --- | --- |
| `--port`, `-p` | `PIXEL_LENS_PORT` | `7331` |

The server listens on `127.0.0.1` only and refuses WebSocket connections that don't come from a browser extension.

## License

MIT
