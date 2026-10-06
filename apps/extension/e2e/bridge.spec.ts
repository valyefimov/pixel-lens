import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, type Worker, chromium, expect, test } from "@playwright/test";
import { Bridge } from "../../../packages/mcp/src/bridge";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(here, "../.output/chrome-mv3");
const PORT = 7342;

let server: Server;
let context: BrowserContext;
let worker: Worker;
let bridge: Bridge;

test.beforeAll(async () => {
  const html = readFileSync(path.join(here, "fixture.html"));
  server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(html));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));

  bridge = new Bridge({ port: PORT, timeout: 5000 });
  await bridge.listen();

  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
  await page.bringToFront();

  const connected = new Promise((r) => bridge.once("connected", r));
  await worker.evaluate(async (port) => {
    await chrome.storage.local.set({ bridgePort: port, bridgeEnabled: true });
  }, PORT);
  await connected;
});

test.afterAll(async () => {
  await context?.close();
  await bridge?.close();
  server?.close();
});

test("an agent can inspect, measure and edit the active tab", async () => {
  const card = await bridge.call("element.inspect", { selector: "#a" });
  expect(card.rect.width).toBe(232);
  expect(card.tailwind).toContain("p-4");

  const gap = await bridge.call("element.distance", { from: "#a", to: "#b" });
  expect(gap.spans).toEqual([{ axis: "x", length: 24 }]);

  const res = await bridge.call("element.setStyle", { selector: ".wrap", styles: { gap: "40px" } });
  expect(res.diff).toContain("+   gap: 40px;");
  const after = await bridge.call("element.distance", { from: "#a", to: "#b" });
  expect(after.spans[0]!.length).toBe(40);

  const issues = await bridge.call("audit.contrast", {});
  expect(issues[0]!.text).toBe("low contrast");

  const shot = await bridge.call("page.screenshot", { selector: "#a" });
  expect(shot.dataUrl).toMatch(/^data:image\/png;base64,/);

  expect(await bridge.call("edits.revert", {})).toEqual({ reverted: 1 });
});
