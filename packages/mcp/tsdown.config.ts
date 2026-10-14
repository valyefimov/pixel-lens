import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  // Bundle the workspace core package so the published CLI has no private deps.
  deps: { alwaysBundle: ["@pixel-lens/core"] },
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
});
