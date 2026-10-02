import { useMemo, useState } from "react";
import { parseColor, toHex, toHslString, toOklchString, toRgbString } from "@pixel-lens/core";
import { collectGradients, collectPalette } from "@/lib/page";
import { copy, store, toast, useOverlay } from "../store";
import { formatColor } from "../ui/format";

interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
}

/** Opens the native eyedropper (Chromium 95+). It samples any pixel, including images and canvas. */
export async function pickColor() {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!ED) {
    toast("EyeDropper is not supported in this browser");
    return;
  }
  store.set({ open: false });
  try {
    const { sRGBHex } = await new ED().open();
    const hex = toHex(parseColor(sRGBHex)!);
    store.set((s) => ({ picked: [{ hex, at: Date.now() }, ...s.picked.filter((p) => p.hex !== hex)].slice(0, 12) }));
    await copy(formatColor(hex, store.get().prefs.colorFormat), `Picked ${hex}`);
  } catch {
    /* user pressed Esc */
  } finally {
    store.set({ open: true, panel: "colors" });
  }
}

function ColorDetail({ hex }: { hex: string }) {
  const c = parseColor(hex)!;
  const formats = [toHex(c), toRgbString(c), toHslString(c), toOklchString(c)];
  return (
    <div className="pl-color-detail">
      <div className="pl-color-big" style={{ background: hex }} />
      <div className="pl-stack">
        {formats.map((f) => (
          <button key={f} className="pl-code" onClick={() => copy(f)}>
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorsPanel() {
  const fmt = useOverlay((s) => s.prefs.colorFormat);
  const picked = useOverlay((s) => s.picked);
  const [tick, setTick] = useState(0);
  const palette = useMemo(() => collectPalette(), [tick]);
  const gradients = useMemo(() => collectGradients(), [tick]);
  const [active, setActive] = useState<string | null>(picked[0]?.hex ?? null);

  const exportTokens = () => {
    const css = `:root {\n${palette
      .slice(0, 32)
      .map((c, i) => `  --color-${i + 1}: ${formatColor(c.hex, fmt)};`)
      .join("\n")}\n}`;
    void copy(css, "Palette copied as CSS variables");
  };

  return (
    <div className="pl-panel-body">
      <div className="pl-toolbar-row">
        <button className="pl-primary" onClick={pickColor}>
          Eyedropper
        </button>
        <button onClick={() => setTick((t) => t + 1)}>Rescan</button>
        <button onClick={exportTokens}>Export tokens</button>
      </div>

      {active && <ColorDetail hex={active} />}

      {picked.length > 0 && (
        <section>
          <h4>Picked</h4>
          <div className="pl-swatches">
            {picked.map((p) => (
              <button key={p.hex} className="pl-chip" style={{ background: p.hex }} title={p.hex} onClick={() => setActive(p.hex)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h4>Page palette · {palette.length}</h4>
        <div className="pl-palette">
          {palette.map((c) => (
            <button key={c.hex} className="pl-palette-item" onClick={() => setActive(c.hex)} title={[...c.usage].join(", ")}>
              <span className="pl-chip" style={{ background: c.hex }} />
              <span className="pl-mono">{formatColor(c.hex, fmt)}</span>
              <span className="pl-muted">{c.count}</span>
            </button>
          ))}
        </div>
      </section>

      {gradients.length > 0 && (
        <section>
          <h4>Gradients · {gradients.length}</h4>
          {gradients.map((g) => (
            <button key={g} className="pl-gradient" style={{ backgroundImage: g }} onClick={() => copy(`background-image: ${g};`, "Gradient copied")} title={g} />
          ))}
        </section>
      )}
    </div>
  );
}
