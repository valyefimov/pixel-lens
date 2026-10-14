import { useMemo, useState } from "react";
import { type Asset, collectAssets } from "@/lib/page";
import { copy, toast } from "../store";

const FILTERS = ["all", "img", "svg", "background", "video"] as const;

async function download(asset: Asset) {
  const name = (asset.src.split("/").pop()?.split("?")[0] || `asset.${asset.kind === "svg" ? "svg" : "png"}`).slice(0, 80);
  try {
    const blob = asset.markup
      ? new Blob([asset.markup], { type: "image/svg+xml" })
      : await (await fetch(asset.src)).blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: asset.kind === "svg" && !name.endsWith(".svg") ? `${name}.svg` : name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Cross-origin without CORS: fall back to opening it.
    window.open(asset.src, "_blank", "noopener");
    toast("Opened in a new tab (cross-origin asset)");
  }
}

export function AssetsPanel() {
  const assets = useMemo(() => collectAssets(), []);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const shown = filter === "all" ? assets : assets.filter((a) => a.kind === filter);

  return (
    <div className="pl-panel-body">
      <div className="pl-segmented">
        {FILTERS.map((f) => (
          <button key={f} className={f === filter ? "pl-on" : ""} onClick={() => setFilter(f)}>
            {f} {f === "all" ? assets.length : assets.filter((a) => a.kind === f).length}
          </button>
        ))}
      </div>
      <div className="pl-assets">
        {shown.map((a, i) => (
          <div key={i} className="pl-asset">
            <div className="pl-asset-thumb">
              {a.kind === "video" ? <span className="pl-muted">video</span> : <img src={a.src} alt={a.alt ?? ""} loading="lazy" />}
            </div>
            <div className="pl-asset-meta">
              <span className="pl-muted">
                {a.kind} · {a.width}×{a.height}
              </span>
              <div className="pl-asset-actions">
                <button onClick={() => download(a)}>Save</button>
                <button onClick={() => copy(a.markup ?? a.src, a.markup ? "SVG markup copied" : "URL copied")}>{a.markup ? "Copy SVG" : "Copy URL"}</button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="pl-muted">Nothing here.</p>}
      </div>
    </div>
  );
}
