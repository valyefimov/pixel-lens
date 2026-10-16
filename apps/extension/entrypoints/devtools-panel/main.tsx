import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";

function applyTheme(name: string | undefined) {
  const dark = name ? name === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// DevTools has its own theme setting that is independent of the OS.
applyTheme(chrome.devtools?.panels?.themeName);
chrome.devtools?.panels?.setThemeChangeHandler?.((name: string) => applyTheme(name));

createRoot(document.getElementById("root")!).render(<App />);
