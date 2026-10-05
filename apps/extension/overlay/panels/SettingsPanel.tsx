import type { ChangeEvent } from "react";
import { browser } from "wxt/browser";
import type { ToBackground } from "@/lib/messages";
import { type ColorFormat, type Preferences, preferences } from "@/lib/settings";
import { store, toast, useOverlay } from "../store";

function updatePrefs(patch: Partial<Preferences>) {
  const next = { ...store.get().prefs, ...patch };
  store.set({ prefs: next });
  void preferences.setValue(next);
}

export function loadDesign(file: File) {
  if (!file.type.startsWith("image/")) return toast("Drop a PNG, JPG, WebP or SVG");
  const reader = new FileReader();
  reader.onload = () => {
    store.set({
      design: {
        src: String(reader.result),
        name: file.name,
        opacity: 0.5,
        x: 0,
        y: 0,
        // Designs are usually exported at 2x.
        scale: 1 / (file.name.includes("@2x") ? 2 : 1),
        difference: false,
        locked: false,
        attachToPage: true,
      },
      panel: "settings",
    });
    toast("Design loaded — drag to align, arrows to nudge");
  };
  reader.readAsDataURL(file);
}

function DesignControls() {
  const design = useOverlay((s) => s.design);
  const set = (patch: Partial<NonNullable<typeof design>>) => design && store.set({ design: { ...design, ...patch } });

  return (
    <section>
      <h4>Design overlay</h4>
      {!design && (
        <label className="pl-drop">
          <input type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && loadDesign(e.target.files[0])} />
          Choose a design export, or paste/drop an image anywhere while Pixel Lens is open.
        </label>
      )}
      {design && (
        <>
          <div className="pl-row">
            <span className="pl-row-label pl-ellipsis">{design.name}</span>
            <button className="pl-link" onClick={() => store.set({ design: null })}>
              Remove
            </button>
          </div>
          <label className="pl-field">
            <span>Opacity {Math.round(design.opacity * 100)}%</span>
            <input type="range" min={0} max={1} step={0.05} value={design.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
          </label>
          <label className="pl-field">
            <span>Scale {Math.round(design.scale * 100)}%</span>
            <input type="range" min={0.25} max={2} step={0.05} value={design.scale} onChange={(e) => set({ scale: Number(e.target.value) })} />
          </label>
          <div className="pl-row">
            <span className="pl-row-label">Position</span>
            <span className="pl-row-value pl-mono">
              {Math.round(design.x)}, {Math.round(design.y)}
            </span>
          </div>
          <div className="pl-toggles">
            <label>
              <input type="checkbox" checked={design.difference} onChange={(e) => set({ difference: e.target.checked })} /> Difference blend
            </label>
            <label>
              <input type="checkbox" checked={design.locked} onChange={(e) => set({ locked: e.target.checked })} /> Lock (click-through)
            </label>
            <label>
              <input type="checkbox" checked={design.attachToPage} onChange={(e) => set({ attachToPage: e.target.checked })} /> Scroll with page
            </label>
          </div>
        </>
      )}
    </section>
  );
}

export function SettingsPanel() {
  const prefs = useOverlay((s) => s.prefs);
  const grid = prefs.grid;
  const setGrid = (patch: Partial<typeof grid>) => updatePrefs({ grid: { ...grid, ...patch } });

  return (
    <div className="pl-panel-body">
      <DesignControls />

      <section>
        <h4>Inspector</h4>
        <label className="pl-field">
          <span>Color format</span>
          <select className="pl-input" value={prefs.colorFormat} onChange={(e) => updatePrefs({ colorFormat: e.target.value as ColorFormat })}>
            <option value="hex">HEX</option>
            <option value="rgb">RGB</option>
            <option value="hsl">HSL</option>
            <option value="oklch">OKLCH</option>
          </select>
        </label>
        <div className="pl-toggles">
          <label>
            <input type="checkbox" checked={prefs.showTailwind} onChange={(e) => updatePrefs({ showTailwind: e.target.checked })} /> Show Tailwind classes
          </label>
          <label>
            <input type="checkbox" checked={prefs.snapToElements} onChange={(e) => updatePrefs({ snapToElements: e.target.checked })} /> Snap ruler to elements
          </label>
        </div>
      </section>

      <section>
        <h4>Layout grid</h4>
        <div className="pl-grid-fields">
          {(
            [
              ["columns", "Columns"],
              ["gutter", "Gutter"],
              ["margin", "Margin"],
              ["maxWidth", "Max width"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="pl-field">
              <span>{label}</span>
              <input className="pl-input" type="number" min={0} value={grid[key]} onChange={(e) => setGrid({ [key]: Number(e.target.value) })} />
            </label>
          ))}
          <label className="pl-field">
            <span>Color</span>
            <input type="color" value={grid.color} onChange={(e) => setGrid({ color: e.target.value })} />
          </label>
        </div>
      </section>

      <section>
        <h4>Agent bridge (MCP)</h4>
        <p className="pl-hint">Let Claude Code, Cursor or any MCP client measure and edit the active tab.</p>
        <button onClick={() => browser.runtime.sendMessage({ kind: "options:open" } satisfies ToBackground)}>Open bridge settings</button>
      </section>
    </div>
  );
}
