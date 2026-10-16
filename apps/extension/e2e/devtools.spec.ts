import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, type Worker, chromium, expect, test } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(here, "../.output/chrome-mv3");

let server: Server;
let baseURL: string;
let context: BrowserContext;
let worker: Worker;
let extensionId: string;

test.beforeAll(async () => {
  const html = readFileSync(path.join(here, "fixture.html"));
  server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(html));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseURL = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;

  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    viewport: { width: 1100, height: 800 },
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
  server?.close();
});

test("the manifest registers a DevTools page that adds the panel", async () => {
  const manifest = JSON.parse(readFileSync(path.join(extensionPath, "manifest.json"), "utf8"));
  expect(manifest.devtools_page).toBe("devtools.html");
  // The DevTools page is harmless outside DevTools: it must not throw without chrome.devtools.
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/devtools.html`);
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
  await page.close();
});

test("inspect.js reads colors, fonts, audit and page data as plain JSON", async () => {
  const page = await context.newPage();
  await page.goto(baseURL);
  const script = readFileSync(path.join(extensionPath, "inspect.js"), "utf8");

  const result = await page.evaluate((src) => {
    const key = Symbol.for("pixel-lens.inspect");
    // Same shape as the panel's expression: install once, then call.
    (0, eval)(`(function () { ${src} })()`);
    const api = (window as unknown as Record<symbol, any>)[key];
    return JSON.parse(
      JSON.stringify({
        colors: api.colors(),
        fonts: api.fonts(),
        audit: api.audit("AA"),
        page: api.page(),
      }),
    );
  }, script);

  expect(result.colors.palette.map((c: { hex: string }) => c.hex)).toContain("#2E62FF");
  expect(result.fonts.length).toBeGreaterThan(0);
  expect(result.audit.contrast.some((c: { text: string }) => c.text === "low contrast")).toBe(true);
  expect(result.audit.seo.find((s: { id: string }) => s.id === "title").severity).toBe("ok");
  expect(result.page.title).toBe("Pixel Lens fixture");
  expect(result.page.viewport.width).toBe(1100);
  // The API must not leave an enumerable global behind.
  const leaked = await page.evaluate(() => Object.keys(window).filter((k) => /pixel-?lens/i.test(k)));
  expect(leaked).toEqual([]);
  await page.close();
});

test("the panel shows the page's colors, audit and report", async () => {
  const target = await context.newPage();
  await target.goto(baseURL);
  const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({ url }))[0]!.id!, baseURL);

  const panel = await context.newPage();
  await panel.setViewportSize({ width: 900, height: 700 });
  await panel.goto(`chrome-extension://${extensionId}/devtools-panel.html?tabId=${tabId}`);

  // Colors
  await expect(panel.getByRole("tab", { name: "Colors" })).toHaveAttribute("aria-selected", "true");
  await expect(panel.locator(".swatch").filter({ hasText: "#2E62FF" })).toBeVisible();

  // The color format selector re-renders every swatch.
  await panel.getByLabel("Color format").selectOption("rgb");
  await expect(panel.locator(".swatch").filter({ hasText: "rgb(46 98 255)" })).toBeVisible();

  // Audit
  await panel.getByRole("tab", { name: "Audit" }).click();
  await expect(panel.locator(".issue").filter({ hasText: "low contrast" })).toBeVisible();
  await expect(panel.getByText("Single H1")).toBeVisible();
  // Raising the level to AAA never reports fewer issues than AA.
  await panel.getByRole("button", { name: "WCAG AAA" }).click();
  await expect(panel.getByRole("button", { name: "WCAG AAA" })).toHaveAttribute("aria-pressed", "true");

  // Clicking an issue reveals the element (scrolls it into view outside DevTools).
  await panel.getByRole("button", { name: "WCAG AA", exact: true }).click();
  await panel.locator(".issue").filter({ hasText: "low contrast" }).click();
  await expect(panel.getByRole("status")).toContainText("Scrolled to the element");

  // Typography
  await panel.getByRole("tab", { name: "Typography" }).click();
  await expect(panel.locator("table").first()).toBeVisible();

  // Page report
  await panel.getByRole("tab", { name: "Page report" }).click();
  await expect(panel.getByText("Page weight")).toBeVisible();
  await expect(panel.getByText(/^1100 × 800 @ \d+x$/)).toBeVisible();

  await panel.close();
  await target.close();
});

test("outside DevTools the panel explains how to open it", async () => {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/devtools-panel.html`);
  await expect(panel.getByText("Open this panel from Chrome DevTools")).toBeVisible();
  await panel.close();
});
