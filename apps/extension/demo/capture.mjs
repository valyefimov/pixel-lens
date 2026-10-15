// Captures the screenshots used by the demo video and the README.
// Run from apps/extension after an E2E build: `pnpm demo:capture`.
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(here, "../.output/chrome-mv3");
const shots = path.join(here, "shots");
mkdirSync(shots, { recursive: true });

const html = readFileSync(path.join(here, "page.html"));
const server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(html));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
await page.goto(url);
await page.waitForTimeout(300);

const shot = async (name) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  console.log("captured", name);
};
const box = async (selector) => (await page.locator(selector).first().boundingBox());
const center = (b) => [b.x + b.width / 2, b.y + b.height / 2];
const key = (k) => page.keyboard.press(k);

await shot("01-page");

// Same injection the toolbar click performs.
await worker.evaluate(async (u) => {
  const [tab] = await chrome.tabs.query({ url: u });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["/content-scripts/overlay.js"] });
}, url);
await page.locator("pixel-lens-overlay").waitFor({ state: "attached" });
// Parking the cursor on the dock logo clears the hover card.
const logo = await box("pixel-lens-overlay >> .pl-logo");
const park = () => page.mouse.move(...center(logo));
await shot("02-dock");

// Inspect: hover the primary button.
await page.mouse.move(...center(await box(".btn-primary")));
await shot("03-inspect");

// Measure: select the primary button, hold Alt, hover the secondary one.
await page.mouse.click(...center(await box(".btn-primary")));
await page.keyboard.down("Alt");
await page.mouse.move(...center(await box(".btn-ghost")));
await shot("04-measure");
// A second measurement: the heading to the lead paragraph.
await page.keyboard.up("Alt");
await page.mouse.click(...center(await box("h1")));
await page.keyboard.down("Alt");
await page.mouse.move(...center(await box(".lead")));
await shot("05-measure-text");
await page.keyboard.up("Alt");
await key("Escape");

// Ruler with guides.
await key("r");
const visual = await box(".visual");
// Drag two vertical guides out of the left ruler onto the edges of the illustration.
for (const x of [visual.x, visual.x + visual.width]) {
  await page.mouse.move(8, 200);
  await page.mouse.down();
  await page.mouse.move(x, 200, { steps: 6 });
  await page.mouse.up();
}
await page.mouse.move(visual.x + 28, visual.y + visual.height - 120);
await page.mouse.down();
await page.mouse.move(visual.x + 268, visual.y + visual.height - 28, { steps: 6 });
await page.mouse.up();
await page.mouse.move(visual.x + 400, visual.y + 200);
await shot("06-ruler");
await key("Escape");
await key("i");

// Grid.
await key("g");
await park();
await shot("07-grid");
await key("g");

// Colors panel.
await key("c");
await park();
await shot("08-colors");
await key("c");

// Audit panel.
await key("u");
await park();
await shot("09-audit");
await key("u");

// Live edit: make the primary button bigger and rounder.
await key("e");
await page.mouse.click(...center(await box(".btn-primary")));
const prop = (name) =>
  page.locator("pixel-lens-overlay >> .pl-prop").filter({ hasText: new RegExp(`^${name}`) }).locator("input");
for (const [name, value] of [
  ["padding-top", "18px"],
  ["padding-bottom", "18px"],
  ["padding-left", "34px"],
  ["padding-right", "34px"],
]) {
  await prop(name).fill(value);
  await prop(name).press("Enter");
}
await page.locator("pixel-lens-overlay >> .pl-diff").scrollIntoViewIfNeeded();
await page.mouse.move(1140, 300);
await shot("10-edit");

await context.close();
server.close();
