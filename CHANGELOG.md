# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

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

[1.0.0]: https://github.com/valyefimov/pixel-lens/releases/tag/v1.0.0
