# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [1.1.0] - 2026-10-16

### Extension

- Changed: the bottom toolbar is replaced by one small lens button that shows the active tool. Click it, or press `/` or `Ctrl/Cmd+K`, to open a command palette that finds any tool, panel or overlay by name or keyword.
- Changed: panels open as a popover above the lens button instead of a full-height column.
- Changed: "X-ray" outlines are now called "Outlines".

### Website

- The home page hero is split in two columns, and the demo shows the real lens button and palette.

### MCP server (`@vefimov/pixel-lens`)

- No changes. The npm package stays at 1.0.0.

## [1.0.1] - 2026-10-15

### Extension

- Fixed: the browser could cancel a ruler drag halfway through by starting a native text selection or drag, which left a guide short of where you let go. The ruler now blocks both and applies the final pointer position on release.
- Fixed: the hover card now hides while the pointer is over the dock or a panel, so it no longer covers them.

### MCP server (`@vefimov/pixel-lens`)

- No behavior changes. Rebuilt with the current tsdown bundling option.

## [1.0.0] - 2026-10-15

First public release.

### Extension

- Inspect: hover card with size, box model, typography, colors, WCAG contrast, layout and Tailwind v4 classes. Pin cards with `Space` to compare elements.
- Measure: edge-to-edge distances between the selection and the hovered element, or inner offsets when one contains the other. Hold `Alt` to measure from any tool.
- Ruler and guides with snapping to element edges, and distance labels between guides.
- Column grid overlay and X-ray outlines.
- Design overlay: paste or drop a mockup, align it, adjust opacity and scale, and compare with difference blending.
- Live editing of CSS and text. Changes are saved per page and can be copied as a diff, as CSS or as a prompt for a coding agent.
- Panels for colors (eyedropper, palette, gradients, HEX/RGB/HSL/OKLCH), typography, assets, contrast and SEO audits, and a page report (weight, technologies, social preview).
- Keyboard navigation: single-key tools, arrow keys to walk the DOM tree, `?` for the shortcut list.
- Runs only on the tab where you invoke it (`activeTab`). Access to all sites is optional and only requested for the agent bridge.

### MCP server (`@vefimov/pixel-lens`)

- Tools to inspect, query, measure, audit, live-edit, screenshot and read back changes from the active tab.
- WebSocket bridge on `127.0.0.1` that only accepts connections from browser extensions.

### Website

- Landing page with a working inspector demo, documentation, privacy policy and terms at https://pixel-lens.yefimov.tech.

[1.1.0]: https://github.com/valyefimov/pixel-lens/releases/tag/v1.1.0
[1.0.1]: https://github.com/valyefimov/pixel-lens/releases/tag/v1.0.1
[1.0.0]: https://github.com/valyefimov/pixel-lens/releases/tag/v1.0.0
