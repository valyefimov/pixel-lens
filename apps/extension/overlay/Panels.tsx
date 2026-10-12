import { type Panel, store, useOverlay } from "./store";
import { PANELS, TOOLS } from "./Dock";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AuditPanel } from "./panels/AuditPanel";
import { ColorsPanel } from "./panels/ColorsPanel";
import { EditsPanel } from "./panels/EditsPanel";
import { FontsPanel } from "./panels/FontsPanel";
import { PagePanel } from "./panels/PagePanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { Icon } from "./ui/icons";

const SHORTCUTS: [string, string][] = [
  ...TOOLS.map((t) => [t.key, t.label] as [string, string]),
  ...PANELS.map((p) => [p.key, p.label] as [string, string]),
  ["K", "Eyedropper"],
  ["G", "Layout grid"],
  ["X", "X-ray outlines"],
  ["O", "Design overlay"],
  ["Click", "Select element"],
  ["Alt", "Hold to measure from the selection"],
  ["Space", "Pin the selected element"],
  ["↑ ↓ ← →", "Parent / child / siblings"],
  ["Shift + drag", "Ruler: square, keep previous"],
  ["Alt + drag", "Ruler without snapping"],
  ["Double-click", "Edit text (Edit tool)"],
  ["Paste / drop image", "Load a design overlay"],
  ["Esc", "Deselect, close panel, then exit"],
];

function HelpPanel() {
  return (
    <div className="pl-panel-body">
      <table className="pl-table pl-shortcuts">
        <tbody>
          {SHORTCUTS.map(([k, v]) => (
            <tr key={k + v}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TITLES: Record<Panel, string> = {
  colors: "Colors",
  fonts: "Typography",
  assets: "Assets",
  audit: "Audit",
  page: "Page report",
  edits: "Live edit",
  settings: "Settings",
  help: "Keyboard shortcuts",
};

export function PanelHost() {
  const panel = useOverlay((s) => s.panel);
  if (!panel) return null;
  return (
    <aside className="pl-panel" aria-label={TITLES[panel]}>
      <header className="pl-panel-head">
        <h3>{TITLES[panel]}</h3>
        <button className="pl-icon-btn" onClick={() => store.set({ panel: null })} aria-label="Close panel">
          <Icon name="close" size={16} />
        </button>
      </header>
      {panel === "colors" && <ColorsPanel />}
      {panel === "fonts" && <FontsPanel />}
      {panel === "assets" && <AssetsPanel />}
      {panel === "audit" && <AuditPanel />}
      {panel === "page" && <PagePanel />}
      {panel === "edits" && <EditsPanel />}
      {panel === "settings" && <SettingsPanel />}
      {panel === "help" && <HelpPanel />}
    </aside>
  );
}
