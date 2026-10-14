import { useMemo, useState } from "react";
import { auditContrast, auditSeo } from "@/lib/audit";
import { querySafe } from "@/lib/dom";
import { copy, store } from "../store";

function focus(selector: string) {
  const el = querySafe(selector);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  store.set({ tool: "inspect", selected: el });
}

export function AuditPanel() {
  const [level, setLevel] = useState<"AA" | "AAA">("AA");
  const contrast = useMemo(() => auditContrast(level), [level]);
  const seo = useMemo(() => auditSeo(), []);

  const report = () =>
    copy(
      [
        `# Audit: ${location.href}`,
        "",
        `## Contrast (${level}) — ${contrast.length} issue(s)`,
        ...contrast.map((c) => `- ${c.ratio.toFixed(2)} ${c.foreground} on ${c.background} (${c.fontSize}px) \`${c.selector}\` “${c.text}”`),
        "",
        "## SEO",
        ...seo.map((s) => `- [${s.severity}] ${s.label}: ${s.detail}`),
      ].join("\n"),
      "Report copied as Markdown",
    );

  return (
    <div className="pl-panel-body">
      <div className="pl-toolbar-row">
        <div className="pl-segmented">
          {(["AA", "AAA"] as const).map((l) => (
            <button key={l} className={l === level ? "pl-on" : ""} onClick={() => setLevel(l)}>
              WCAG {l}
            </button>
          ))}
        </div>
        <button onClick={report}>Copy report</button>
      </div>

      <section>
        <h4>Contrast · {contrast.length ? `${contrast.length} issues` : "all good"}</h4>
        {contrast.map((c, i) => (
          <button key={i} className="pl-issue" onClick={() => focus(c.selector)}>
            <span className="pl-contrast-sample" style={{ color: c.foreground, background: c.background }}>
              Aa
            </span>
            <span className="pl-issue-text">
              <span className="pl-strong">
                {c.ratio.toFixed(2)} : 1 <span className="pl-badge pl-badge-bad">{c.level}</span>
              </span>
              <span className="pl-muted pl-ellipsis">{c.text}</span>
            </span>
          </button>
        ))}
      </section>

      <section>
        <h4>SEO basics</h4>
        {seo.map((s) => (
          <div key={s.id} className="pl-check">
            <span className={`pl-dot pl-dot-${s.severity}`} />
            <span className="pl-strong">{s.label}</span>
            <span className="pl-muted pl-ellipsis">{s.detail}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
