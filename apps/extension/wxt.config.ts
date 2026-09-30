import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // Explicit imports keep the code greppable and editor-friendly.
  imports: false,
  manifest: {
    name: "Pixel Lens",
    description:
      "Measure, inspect and edit any web page. Rulers, spacing, CSS, colors, fonts, contrast audits and an MCP bridge for AI agents.",
    // activeTab + scripting: the extension only touches a page after you invoke it.
    // Blanket host access is optional and only requested for the Agent Bridge.
    permissions: ["activeTab", "scripting", "storage", "alarms"],
    optional_host_permissions: ["<all_urls>"],
    action: { default_title: "Pixel Lens (Alt+Shift+P)" },
    commands: {
      "toggle-overlay": {
        suggested_key: { default: "Alt+Shift+P" },
        description: "Toggle Pixel Lens on the current tab",
      },
    },
  },
  hooks: {
    // The overlay is injected at runtime via activeTab, so its `matches` must not turn into
    // blanket host permissions. WXT's dev reloader needs them, so keep them in dev only.
    "build:manifestGenerated": (wxt, manifest) => {
      // E2E builds keep them so Playwright can inject without a toolbar click.
      if (wxt.config.command === "build" && !process.env.PIXEL_LENS_E2E) delete manifest.host_permissions;
    },
  },
});
