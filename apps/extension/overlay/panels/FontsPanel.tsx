import { useMemo } from "react";
import { collectFonts } from "@/lib/page";
import { copy } from "../store";
import { num } from "../ui/format";

export function FontsPanel() {
  const fonts = useMemo(() => collectFonts(), []);

  const exportScale = () => {
    const sizes = [...new Set(fonts.flatMap((f) => f.styles.map((s) => s.size)))].sort((a, b) => parseFloat(b) - parseFloat(a));
    void copy(sizes.map((s, i) => `--text-${i + 1}: ${s};`).join("\n"), "Type scale copied");
  };

  return (
    <div className="pl-panel-body">
      <div className="pl-toolbar-row">
        <button onClick={exportScale}>Copy type scale</button>
      </div>
      {fonts.map((f) => (
        <section key={f.family}>
          <div className="pl-font-head">
            <span className="pl-font-sample" style={{ fontFamily: f.family }}>
              Aa
            </span>
            <div>
              <div className="pl-strong">{f.family}</div>
              <div className="pl-muted">
                {f.count} text nodes · {f.styles.length} styles
              </div>
            </div>
          </div>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>LH</th>
                <th>Weight</th>
                <th>Uses</th>
              </tr>
            </thead>
            <tbody>
              {f.styles.map((s) => (
                <tr
                  key={`${s.size}${s.weight}${s.lineHeight}`}
                  onClick={() => copy(`font: ${s.weight} ${s.size}/${s.lineHeight} "${f.family}";`, "Font shorthand copied")}
                >
                  <td>{num(s.size)}</td>
                  <td>{num(s.lineHeight)}</td>
                  <td>{s.weight}</td>
                  <td className="pl-muted">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
