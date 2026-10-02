import { useState, useSyncExternalStore } from "react";
import { KEY_PROPERTIES, selectorFor, shortLabel } from "@/lib/dom";
import { editStore, editTextInPlace } from "@/lib/edits";
import { copy, store, toast, useOverlay } from "../store";

const EDITABLE = KEY_PROPERTIES.filter((p) => !p.startsWith("border-top-") && p !== "transition");

function useEdits() {
  return useSyncExternalStore(
    (fn) => editStore.subscribe(fn),
    () => editStore.edits,
  );
}

function StyleEditor({ el }: { el: Element }) {
  useEdits();
  const selectorDefault = selectorFor(el);
  const [selector, setSelector] = useState(selectorDefault);
  const [filter, setFilter] = useState("");
  const [newProp, setNewProp] = useState("");
  const computed = getComputedStyle(el);
  const props = EDITABLE.filter((p) => p.includes(filter.toLowerCase()));

  const commit = (prop: string, value: string) => {
    if (value.trim()) editStore.set(selector, prop, value.trim());
    store.set((s) => ({ frame: s.frame + 1 }));
  };

  return (
    <section>
      <h4>Editing {shortLabel(el)}</h4>
      <label className="pl-field">
        <span>Selector</span>
        <input className="pl-input pl-mono" value={selector} onChange={(e) => setSelector(e.target.value)} />
      </label>
      <div className="pl-toolbar-row">
        <button
          onClick={() => {
            store.set({ open: true });
            editTextInPlace(el as HTMLElement, () => toast("Text updated"));
          }}
        >
          Edit text
        </button>
        <button onClick={() => commit("display", "none")}>Hide</button>
        <button
          onClick={() => {
            const clone = el.cloneNode(true);
            el.after(clone);
            toast("Duplicated");
          }}
        >
          Duplicate
        </button>
        <button
          onClick={() => {
            el.remove();
            store.set({ selected: null, hovered: null });
            toast("Removed (reload to undo)");
          }}
        >
          Delete
        </button>
      </div>
      <input className="pl-input" placeholder="Filter properties…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="pl-props">
        {props.map((p) => (
          <label key={`${selector}${p}`} className="pl-prop">
            <span className="pl-mono pl-muted">{p}</span>
            <input
              className="pl-input pl-mono"
              defaultValue={computed.getPropertyValue(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(p, e.currentTarget.value);
                // ↑/↓ nudge numeric values, Shift for ×10
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  const m = /^(-?\d*\.?\d+)(.*)$/.exec(e.currentTarget.value);
                  if (!m) return;
                  e.preventDefault();
                  const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
                  e.currentTarget.value = `${Math.round((parseFloat(m[1]!) + step) * 100) / 100}${m[2]}`;
                  commit(p, e.currentTarget.value);
                }
              }}
              onBlur={(e) => e.currentTarget.value !== computed.getPropertyValue(p) && commit(p, e.currentTarget.value)}
            />
          </label>
        ))}
      </div>
      <form
        className="pl-toolbar-row"
        onSubmit={(e) => {
          e.preventDefault();
          const [prop, ...rest] = newProp.split(":");
          if (prop && rest.length) commit(prop.trim(), rest.join(":").replace(/;$/, ""));
          setNewProp("");
        }}
      >
        <input className="pl-input pl-mono" placeholder="any-property: value" value={newProp} onChange={(e) => setNewProp(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </section>
  );
}

export function EditsPanel() {
  const selected = useOverlay((s) => s.selected);
  useEdits();
  const net = editStore.net;
  const diff = editStore.diff();

  return (
    <div className="pl-panel-body">
      {selected ? <StyleEditor key={selectorFor(selected)} el={selected} /> : <p className="pl-hint">Click an element to edit its styles. Double-click text to edit it in place.</p>}

      <section>
        <h4>Changes · {net.length}</h4>
        {net.length === 0 && <p className="pl-muted">No changes yet. Edits are saved for this page and come back next time.</p>}
        {net.map((e) => (
          <div key={`${e.selector}${e.property}`} className="pl-change">
            <div className="pl-mono pl-ellipsis">{e.selector}</div>
            <div className="pl-mono">
              <span className="pl-del">{e.property}: {e.before}</span>
              <span className="pl-add">{e.property}: {e.after}</span>
            </div>
            <button className="pl-link" onClick={() => editStore.revert(e.selector, e.property)}>
              Revert
            </button>
          </div>
        ))}
        {net.length > 0 && (
          <>
            <pre className="pl-diff">{diff}</pre>
            <div className="pl-toolbar-row">
              <button className="pl-primary" onClick={() => copy(diff, "Diff copied")}>
                Copy diff
              </button>
              <button onClick={() => copy(editStore.css(), "CSS copied")}>Copy CSS</button>
              <button onClick={() => copy(`Apply these CSS changes to the codebase:\n\n\`\`\`diff\n${diff}\n\`\`\``, "Prompt for your agent copied")}>Copy as prompt</button>
              <button onClick={() => editStore.revertAll()}>Revert all</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
