import { useEffect, useMemo, useRef, useState } from "react";
import { TOOLS, searchCommands } from "./commands";
import { store, useOverlay } from "./store";
import { Icon } from "./ui/icons";

/** The only always-visible control: shows the active tool and opens the command palette. */
export function LensButton() {
  const tool = useOverlay((s) => s.tool);
  const label = TOOLS.find((t) => t.id === tool)?.label ?? "Pixel Lens";
  return (
    <button className="pl-lens" onClick={() => store.set({ palette: true })} aria-haspopup="dialog" aria-label={`${label}. Open the command palette`}>
      <span className="pl-lens-mark" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 20 20">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <rect x="7" y="7" width="4" height="4" fill="currentColor" />
        </svg>
      </span>
      <span className="pl-lens-label">{label}</span>
      <kbd>/</kbd>
    </button>
  );
}

/** Spotlight-style command palette: type to filter, arrows to move, Enter to run. */
export function Palette() {
  const open = useOverlay((s) => s.palette);
  if (!open) return null;
  return <PaletteDialog />;
}

function PaletteDialog() {
  const state = useOverlay((s) => s);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchCommands(query), [query]);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index, results]);

  const close = () => store.set({ palette: false });
  const run = (i: number) => {
    const command = results[i];
    if (!command) return;
    close();
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    else if (e.key === "Enter") run(index);
    else if (e.key === "Escape") close();
    else return;
    e.preventDefault();
  };

  let lastGroup = "";
  return (
    <div className="pl-cmdk-backdrop" onPointerDown={close}>
      <div className="pl-cmdk" role="dialog" aria-label="Command palette" onPointerDown={(e) => e.stopPropagation()}>
        <div className="pl-cmdk-input">
          <Icon name="search" size={16} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tools, panels and overlays"
            role="combobox"
            aria-expanded
            aria-controls="pl-cmdk-list"
            aria-activedescendant={results[index] ? `pl-cmd-${results[index]!.id}` : undefined}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="pl-cmdk-list" id="pl-cmdk-list" role="listbox" ref={list}>
          {results.length === 0 && <p className="pl-cmdk-empty">Nothing matches “{query}”.</p>}
          {results.map((c, i) => {
            const heading = !query && c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {heading && <div className="pl-cmdk-group">{heading}</div>}
                <button
                  id={`pl-cmd-${c.id}`}
                  role="option"
                  aria-selected={i === index}
                  className={`pl-cmdk-item ${i === index ? "pl-on" : ""}`}
                  onPointerMove={() => i !== index && setIndex(i)}
                  onClick={() => run(i)}
                >
                  <Icon name={c.icon} size={16} />
                  <span className="pl-cmdk-name">{c.label}</span>
                  {c.active?.(state) && <span className="pl-cmdk-live">on</span>}
                  {c.key && <kbd>{c.key}</kbd>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="pl-cmdk-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> run
          </span>
          <span className="pl-cmdk-tip">Tip: every command also has a single-key shortcut</span>
        </div>
      </div>
    </div>
  );
}
