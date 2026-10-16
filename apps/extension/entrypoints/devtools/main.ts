// The DevTools page has no UI. Its only job is to add the "Pixel Lens" tab.
// Opened outside DevTools (for example in a test tab) `chrome.devtools` is undefined, so do nothing.
if (chrome.devtools?.panels) {
  chrome.devtools.panels.create("Pixel Lens", "/icon/32.png", "/devtools-panel.html");
}
