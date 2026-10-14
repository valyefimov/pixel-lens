import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, type Page, type Worker, chromium, expect, test } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(here, "../.output/chrome-mv3");

let server: Server;
let baseURL: string;
let context: BrowserContext;
let worker: Worker;

test.beforeAll(async () => {
  const html = readFileSync(path.join(here, "fixture.html"));
  server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(html));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseURL = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;

  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    viewport: { width: 1280, height: 800 },
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
});

test.afterAll(async () => {
  await context?.close();
  server?.close();
});

/** Opens the fixture and injects the overlay the same way a toolbar click would. */
async function openWithOverlay(): Promise<Page> {
  const page = await context.newPage();
  await page.goto(baseURL);
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ["/content-scripts/overlay.js"] });
  }, baseURL);
  await expect(page.locator("pixel-lens-overlay")).toBeAttached();
  await expect(shadow(page, ".pl-dock")).toBeVisible();
  return page;
}

const shadow = (page: Page, selector: string) => page.locator(`pixel-lens-overlay >> ${selector}`);

test("shows the inspector card for the hovered element", async () => {
  const page = await openWithOverlay();
  await page.mouse.move(150, 160);
  const card = shadow(page, ".pl-card");
  await expect(card).toBeVisible();
  await expect(card.locator(".pl-tag")).toHaveText("div#a");
  await expect(card.locator(".pl-dim")).toHaveText("232 × 152");
  await page.close();
});

test("clicking selects instead of following links", async () => {
  const page = await openWithOverlay();
  const cta = await page.locator(".cta").boundingBox();
  await page.mouse.click(cta!.x + cta!.width / 2, cta!.y + cta!.height / 2);
  expect(page.url()).not.toContain("#clicked");
  await expect(shadow(page, ".pl-card-selected .pl-tag")).toHaveText("a.cta");
  await expect(shadow(page, ".pl-card-selected .pl-code")).toContainText("rounded-full");
  await page.close();
});

test("holding Alt measures the gap between two elements", async () => {
  const page = await openWithOverlay();
  await page.mouse.click(150, 160); // select #a
  await page.keyboard.down("Alt");
  await page.mouse.move(400, 160); // hover #b
  await expect(shadow(page, ".pl-label text").filter({ hasText: /^24$/ })).toBeVisible();
  await page.keyboard.up("Alt");
  await page.close();
});

test("arrow keys walk the DOM tree", async () => {
  const page = await openWithOverlay();
  await page.mouse.click(150, 160);
  await page.keyboard.press("ArrowRight");
  await expect(shadow(page, ".pl-card-selected .pl-tag")).toHaveText("div#b");
  await page.keyboard.press("ArrowUp");
  await expect(shadow(page, ".pl-card-selected .pl-tag")).toHaveText("div.wrap");
  await page.close();
});

test("audit panel finds the low-contrast text", async () => {
  const page = await openWithOverlay();
  await page.keyboard.press("u");
  const panel = shadow(page, ".pl-panel");
  await expect(panel).toContainText("Contrast · 1 issues");
  await expect(panel).toContainText("low contrast");
  await page.close();
});

test("live edits produce a diff and persist", async () => {
  const page = await openWithOverlay();
  await page.keyboard.press("e");
  await page.mouse.click(150, 160);
  const input = shadow(page, ".pl-prop").filter({ hasText: "padding-top" }).locator("input");
  await input.fill("32px");
  await input.press("Enter");
  await expect(page.locator("#a")).toHaveCSS("padding-top", "32px");
  await expect(shadow(page, ".pl-diff")).toContainText("+   padding-top: 32px;");

  await page.reload();
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ["/content-scripts/overlay.js"] });
  }, baseURL);
  await expect(page.locator("#a")).toHaveCSS("padding-top", "32px");
  await page.close();
});

test("ruler draws a measured rectangle", async () => {
  const page = await openWithOverlay();
  await page.keyboard.press("r");
  await page.mouse.move(400, 400);
  await page.mouse.down();
  await page.mouse.move(500, 450, { steps: 4 });
  await page.mouse.up();
  await expect(shadow(page, ".pl-label text").filter({ hasText: "100 × 50" })).toBeVisible();
  await page.close();
});
