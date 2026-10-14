import { type Panel, type Tool, store, useOverlay } from "./store";
import { Icon, type IconName } from "./ui/icons";
import { pickColor } from "./panels/ColorsPanel";

export const TOOLS: { id: Tool; icon: IconName; label: string; key: string }[] = [
  { id: "inspect", icon: "inspect", label: "Inspect", key: "I" },
  { id: "measure", icon: "measure", label: "Measure distances", key: "M" },
  { id: "ruler", icon: "ruler", label: "Ruler & guides", key: "R" },
  { id: "edit", icon: "edit", label: "Live edit", key: "E" },
];

export const PANELS: { id: Panel; icon: IconName; label: string; key: string }[] = [
  { id: "colors", icon: "colors", label: "Colors", key: "C" },
  { id: "fonts", icon: "fonts", label: "Typography", key: "T" },
  { id: "assets", icon: "assets", label: "Assets", key: "A" },
  { id: "audit", icon: "audit", label: "Audit", key: "U" },
  { id: "page", icon: "page", label: "Page insights", key: "P" },
  { id: "edits", icon: "edits", label: "Changes", key: "D" },
];

export function setTool(tool: Tool) {
  store.set((s) => ({ tool, rulerDraft: null, panel: tool === "edit" ? "edits" : s.panel }));
}

export function togglePanel(panel: Panel) {
  store.set((s) => ({ panel: s.panel === panel ? null : panel }));
}

function DockButton({ icon, label, shortcut, active, onClick }: { icon: IconName; label: string; shortcut?: string; active?: boolean; onClick: () => void }) {
  return (
    <button className={`pl-dock-btn ${active ? "pl-on" : ""}`} onClick={onClick} aria-label={label} aria-pressed={active}>
      <Icon name={icon} />
      <span className="pl-tip">
        {label} {shortcut && <kbd>{shortcut}</kbd>}
      </span>
    </button>
  );
}

export function Dock() {
  const tool = useOverlay((s) => s.tool);
  const panel = useOverlay((s) => s.panel);
  const grid = useOverlay((s) => s.grid);
  const xray = useOverlay((s) => s.xray);
  const design = useOverlay((s) => s.design);

  return (
    <div className="pl-dock" role="toolbar" aria-label="Pixel Lens">
      <div className="pl-logo" title="Pixel Lens">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="7" y="7" width="4" height="4" fill="currentColor" />
        </svg>
      </div>
      <span className="pl-sep" />
      {TOOLS.map((t) => (
        <DockButton key={t.id} icon={t.icon} label={t.label} shortcut={t.key} active={tool === t.id} onClick={() => setTool(t.id)} />
      ))}
      <DockButton icon="color" label="Eyedropper" shortcut="K" onClick={pickColor} />
      <span className="pl-sep" />
      <DockButton icon="grid" label="Layout grid" shortcut="G" active={grid} onClick={() => store.set({ grid: !grid })} />
      <DockButton icon="xray" label="X-ray outlines" shortcut="X" active={xray} onClick={() => store.set({ xray: !xray })} />
      <DockButton icon="design" label="Design overlay" shortcut="O" active={!!design} onClick={() => store.set({ panel: "settings" })} />
      <span className="pl-sep" />
      {PANELS.map((p) => (
        <DockButton key={p.id} icon={p.icon} label={p.label} shortcut={p.key} active={panel === p.id} onClick={() => togglePanel(p.id)} />
      ))}
      <span className="pl-sep" />
      <DockButton icon="settings" label="Settings" active={panel === "settings"} onClick={() => togglePanel("settings")} />
      <DockButton icon="help" label="Shortcuts" shortcut="?" onClick={() => togglePanel("help")} />
      <DockButton icon="close" label="Close" shortcut="Esc" onClick={() => store.set({ open: false })} />
    </div>
  );
}
