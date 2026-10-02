import { useMemo } from "react";
import { detectTechnologies, formatBytes, pageWeight } from "@/lib/page";

const meta = (name: string) =>
  document.querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)?.content ?? "";

export function PagePanel() {
  const weight = useMemo(() => pageWeight(), []);
  const tech = useMemo(() => detectTechnologies(), []);
  const og = {
    title: meta("og:title") || document.title,
    description: meta("og:description") || meta("description"),
    image: meta("og:image"),
    site: meta("og:site_name") || location.hostname,
  };
  const types = Object.entries(weight.byType).sort((a, b) => b[1].bytes - a[1].bytes);

  return (
    <div className="pl-panel-body">
      <section>
        <h4>Page weight</h4>
        <div className="pl-big-number">
          {formatBytes(weight.total)}
          <span className="pl-muted"> · {weight.requests} requests</span>
        </div>
        <div className="pl-bar">
          {types.map(([type, t]) => (
            <span key={type} className={`pl-bar-seg pl-type-${type}`} style={{ flexGrow: t.bytes || 0.001 }} title={type} />
          ))}
        </div>
        {types.map(([type, t]) => (
          <div key={type} className="pl-row">
            <span className="pl-row-label">
              <span className={`pl-dot pl-type-${type}`} /> {type}
            </span>
            <span className="pl-row-value">
              {formatBytes(t.bytes)} <span className="pl-muted">· {t.count}</span>
            </span>
          </div>
        ))}
        <p className="pl-hint">Cross-origin resources without Timing-Allow-Origin report 0 bytes.</p>
      </section>

      <section>
        <h4>Technologies</h4>
        <div className="pl-tags">{tech.length ? tech.map((t) => <span key={t} className="pl-pill">{t}</span>) : <span className="pl-muted">Nothing detected</span>}</div>
      </section>

      <section>
        <h4>Social preview</h4>
        <div className="pl-og">
          {og.image ? <img src={og.image} alt="" /> : <div className="pl-og-empty">No og:image</div>}
          <div className="pl-og-text">
            <span className="pl-muted">{og.site}</span>
            <span className="pl-strong">{og.title}</span>
            <span className="pl-muted pl-clamp">{og.description}</span>
          </div>
        </div>
      </section>

      <section>
        <h4>Viewport</h4>
        <div className="pl-row">
          <span className="pl-row-label">Size</span>
          <span className="pl-row-value">
            {innerWidth} × {innerHeight} @ {devicePixelRatio}x
          </span>
        </div>
        <div className="pl-row">
          <span className="pl-row-label">Document</span>
          <span className="pl-row-value">
            {document.documentElement.scrollWidth} × {document.documentElement.scrollHeight}
          </span>
        </div>
      </section>
    </div>
  );
}
