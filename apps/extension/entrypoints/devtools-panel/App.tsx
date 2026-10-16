import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { formatBytes } from "@/lib/page";
import { type ColorFormat, preferences } from "@/lib/settings";
import { formatColor } from "@/overlay/ui/format";
import { canInspect, copyText, inDevTools, onNavigated, pageApi, revealInElements } from "./page-api";

type View = "colors" | "fonts" | "audit" | "page";

const VIEWS: { id: View; label: string }[] = [
  { id: "colors", label: "Colors" },
  { id: "fonts", label: "Typography" },
  { id: "audit", label: "Audit" },
  { id: "page", label: "Page report" },
];

const Notify = createContext<(message: string) => void>(() => {});

/** Runs `load` on mount and whenever `nonce` changes (refresh button, navigation). */
function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({ loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then(
      (data) => live && setState({ loading: false, data }),
      (e: Error) => live && setState({ loading: false, error: e?.message ?? String(e) }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function Status({ loading, error, empty }: { loading: boolean; error?: string; empty?: boolean }) {
  if (error) return <p className="note note-error">{error}</p>;
  if (loading) return <p className="note">Reading the page…</p>;
  if (empty) return <p className="note">Nothing found.</p>;
  return null;
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <header>
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ---------- Colors ---------- */

function ColorsView({ nonce }: { nonce: number }) {
  const notify = useContext(Notify);
  const state = useLoad(() => pageApi.colors(), [nonce]);
  const [format, setFormat] = useState<ColorFormat>("hex");

  useEffect(() => {
    void preferences.getValue().then((p) => setFormat(p.colorFormat));
  }, []);

  const changeFormat = (next: ColorFormat) => {
    setFormat(next);
    void preferences.getValue().then((p) => preferences.setValue({ ...p, colorFormat: next }));
  };

  const copy = (text: string, label = text) => void copyText(text).then(() => notify(`Copied ${label}`));
  const { data } = state;

  return (
    <>
      <Status loading={state.loading} error={state.error} empty={!!data && data.palette.length === 0 && data.gradients.length === 0} />
      {data && (
        <>
          <Section
            title={`Palette · ${data.palette.length}`}
            aside={
              <div className="row">
                <select value={format} onChange={(e) => changeFormat(e.target.value as ColorFormat)} aria-label="Color format">
                  <option value="hex">HEX</option>
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                  <option value="oklch">OKLCH</option>
                </select>
                <button
                  onClick={() =>
                    copy(
                      `:root {\n${data.palette
                        .slice(0, 32)
                        .map((c, i) => `  --color-${i + 1}: ${formatColor(c.hex, format)};`)
                        .join("\n")}\n}`,
                      "palette as CSS variables",
                    )
                  }
                >
                  Copy as CSS variables
                </button>
              </div>
            }
          >
            <div className="swatches">
              {data.palette.map((c) => (
                <button key={c.hex} className="swatch" onClick={() => copy(formatColor(c.hex, format))} title={`Used for ${c.usage.join(", ")}`}>
                  <span className="chip" style={{ background: c.hex }} />
                  <span className="mono">{formatColor(c.hex, format)}</span>
                  <span className="muted">{c.count}×</span>
                  <span className="usage">{c.usage.join(" · ")}</span>
                </button>
              ))}
            </div>
          </Section>
          {data.gradients.length > 0 && (
            <Section title={`Gradients · ${data.gradients.length}`}>
              <div className="gradients">
                {data.gradients.map((g) => (
                  <button key={g} className="gradient" style={{ backgroundImage: g }} onClick={() => copy(`background-image: ${g};`, "gradient")} title={g} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </>
  );
}

/* ---------- Typography ---------- */

const px = (v: string) => (v.endsWith("px") ? `${Math.round(parseFloat(v) * 10) / 10}` : v);

function FontsView({ nonce }: { nonce: number }) {
  const notify = useContext(Notify);
  const state = useLoad(() => pageApi.fonts(), [nonce]);
  const { data } = state;
  return (
    <>
      <Status loading={state.loading} error={state.error} empty={!!data && data.length === 0} />
      {data?.map((f) => (
        <Section key={f.family} title={f.family} aside={<span className="muted">{f.count} text nodes</span>}>
          <table>
            <thead>
              <tr>
                <th>Size</th>
                <th>Line height</th>
                <th>Weight</th>
                <th className="num">Uses</th>
              </tr>
            </thead>
            <tbody>
              {f.styles.map((s) => (
                <tr
                  key={`${s.size}${s.weight}${s.lineHeight}`}
                  className="clickable"
                  onClick={() => void copyText(`font: ${s.weight} ${s.size}/${s.lineHeight} "${f.family}";`).then(() => notify("Copied font shorthand"))}
                >
                  <td className="mono">{px(s.size)}</td>
                  <td className="mono">{px(s.lineHeight)}</td>
                  <td className="mono">{s.weight}</td>
                  <td className="num muted">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
}

/* ---------- Audit ---------- */

function AuditView({ nonce }: { nonce: number }) {
  const notify = useContext(Notify);
  const [level, setLevel] = useState<"AA" | "AAA">("AA");
  const state = useLoad(() => pageApi.audit(level), [nonce, level]);
  const { data } = state;

  const reveal = (selector: string) =>
    void revealInElements(selector).then((found) => notify(found ? (inDevTools() ? "Selected in Elements" : "Scrolled to the element") : "That element is no longer on the page"));

  return (
    <>
      <Status loading={state.loading && !data} error={state.error} />
      {data && (
        <>
          <Section
            title={`Contrast · ${data.contrast.length ? `${data.contrast.length} issues` : "no issues"}`}
            aside={
              <div className="seg" role="group" aria-label="WCAG level">
                {(["AA", "AAA"] as const).map((l) => (
                  <button key={l} className={l === level ? "on" : ""} onClick={() => setLevel(l)} aria-pressed={l === level}>
                    WCAG {l}
                  </button>
                ))}
              </div>
            }
          >
            <ul className="list">
              {data.contrast.map((c, i) => (
                <li key={i}>
                  <button className="issue" onClick={() => reveal(c.selector)} title="Select in the Elements panel">
                    <span className="sample" style={{ color: c.foreground, background: c.background }}>
                      Aa
                    </span>
                    <span className="issue-body">
                      <span>
                        <strong>{c.ratio.toFixed(2)} : 1</strong> <span className="badge bad">{c.level}</span>{" "}
                        <span className="muted">
                          {c.foreground} on {c.background} · {c.fontSize}px
                        </span>
                      </span>
                      <span className="ellipsis">{c.text}</span>
                      <span className="mono muted ellipsis">{c.selector}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="SEO basics">
            <ul className="list">
              {data.seo.map((s) => (
                <li key={s.id} className="check">
                  <span className={`dot ${s.severity}`} aria-label={s.severity} />
                  <strong>{s.label}</strong>
                  <span className="muted ellipsis">{s.detail}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </>
  );
}

/* ---------- Page report ---------- */

function PageView({ nonce }: { nonce: number }) {
  const state = useLoad(() => pageApi.page(), [nonce]);
  const d = state.data;
  const types = d ? Object.entries(d.weight.byType).sort((a, b) => b[1].bytes - a[1].bytes) : [];
  return (
    <>
      <Status loading={state.loading} error={state.error} />
      {d && (
        <>
          <Section title="Page weight">
            <p className="big">
              {formatBytes(d.weight.total)} <span className="muted">· {d.weight.requests} requests</span>
            </p>
            <div className="bar">
              {types.map(([type, t]) => (
                <span key={type} className={`seg-${type}`} style={{ flexGrow: t.bytes || 0.001 }} title={type} />
              ))}
            </div>
            <table>
              <tbody>
                {types.map(([type, t]) => (
                  <tr key={type}>
                    <td>
                      <span className={`dot seg-${type}`} /> {type}
                    </td>
                    <td className="num mono">{formatBytes(t.bytes)}</td>
                    <td className="num muted">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">Cross-origin resources without Timing-Allow-Origin report 0 bytes.</p>
          </Section>

          <Section title="Technologies">
            <div className="pills">
              {d.technologies.length ? d.technologies.map((t) => <span key={t} className="pill">{t}</span>) : <span className="muted">Nothing detected</span>}
            </div>
          </Section>

          <Section title="Social preview">
            <div className="og">
              {d.social.image ? <img src={d.social.image} alt="" /> : <div className="og-empty">No og:image</div>}
              <div className="og-text">
                <span className="muted">{d.social.site}</span>
                <strong>{d.social.title}</strong>
                <span className="muted clamp">{d.social.description}</span>
              </div>
            </div>
          </Section>

          <Section title="Viewport">
            <table>
              <tbody>
                <tr>
                  <td>Window</td>
                  <td className="num mono">
                    {d.viewport.width} × {d.viewport.height} @ {d.viewport.dpr}x
                  </td>
                </tr>
                <tr>
                  <td>Document</td>
                  <td className="num mono">
                    {d.document.width} × {d.document.height}
                  </td>
                </tr>
                <tr>
                  <td>Language</td>
                  <td className="num mono">{d.lang || "not set"}</td>
                </tr>
              </tbody>
            </table>
          </Section>
        </>
      )}
    </>
  );
}

/* ---------- Shell ---------- */

export function App() {
  const [view, setView] = useState<View>("colors");
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const notify = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 1600);
  }, []);

  useEffect(() => onNavigated(refresh), [refresh]);

  if (!canInspect()) {
    return (
      <main className="empty">
        <h1>Pixel Lens</h1>
        <p>Open this panel from Chrome DevTools: right-click a page, choose Inspect, then pick the “Pixel Lens” tab.</p>
      </main>
    );
  }

  const Current = { colors: ColorsView, fonts: FontsView, audit: AuditView, page: PageView }[view];
  return (
    <Notify.Provider value={notify}>
      <div className="shell">
        <nav className="tabs" role="tablist" aria-label="Pixel Lens views">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={v.id === view} className={v.id === view ? "on" : ""} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
          <button className="refresh" onClick={refresh} title="Read the page again">
            Refresh
          </button>
        </nav>
        <main className="content" role="tabpanel">
          <Current nonce={nonce} />
        </main>
        {message && (
          <div className="toast" role="status">
            {message}
          </div>
        )}
      </div>
    </Notify.Provider>
  );
}

