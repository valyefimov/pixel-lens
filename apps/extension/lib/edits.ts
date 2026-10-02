import { type StyleEdit, editsToCss, editsToDiff, netEdits } from "@pixel-lens/core";
import { editsItem, pageKey } from "./settings";

/**
 * Live style editor.
 *
 * Edits are written to a single <style> element as `selector { prop: value !important }`
 * rules rather than inline styles. That keeps the page's own inline styles untouched,
 * makes revert trivial (rebuild the sheet), and lets edits target selectors that match
 * several elements, the same way they would in real source code.
 */
class EditStore {
  private log: StyleEdit[] = [];
  private sheet: HTMLStyleElement | null = null;
  private listeners = new Set<() => void>();

  get edits(): readonly StyleEdit[] {
    return this.log;
  }

  get net(): StyleEdit[] {
    return netEdits(this.log);
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Applies `property: value` to every element matching `selector`. `before` is read from the first match. */
  set(selector: string, property: string, value: string) {
    const el = document.querySelector(selector);
    const before = this.currentValue(selector, property) ?? (el ? getComputedStyle(el).getPropertyValue(property) : "");
    if (before === value) return;
    // Replace, never mutate: React reads `edits` through useSyncExternalStore.
    this.log = [...this.log, { selector, property, before, after: value }];
    this.commit();
  }

  revert(selector?: string, property?: string) {
    this.log = this.log.filter((e) => (selector && e.selector !== selector) || (property && e.property !== property));
    this.commit();
  }

  revertAll() {
    this.log = [];
    this.commit();
  }

  diff() {
    return editsToDiff(this.log);
  }

  css() {
    return editsToCss(this.log);
  }

  async restore() {
    this.log = await editsItem(pageKey()).getValue();
    this.render();
    this.emit();
  }

  private currentValue(selector: string, property: string): string | undefined {
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i]!;
      if (e.selector === selector && e.property === property) return e.after;
    }
    return undefined;
  }

  private commit() {
    this.render();
    void editsItem(pageKey()).setValue(this.net);
    this.emit();
  }

  private render() {
    const css = this.net
      .map((e) => `${e.selector} { ${e.property}: ${e.after} !important; }`)
      .join("\n");
    if (!css) {
      this.sheet?.remove();
      this.sheet = null;
      return;
    }
    if (!this.sheet) {
      this.sheet = document.createElement("style");
      this.sheet.dataset.pixelLens = "edits";
      document.head.append(this.sheet);
    }
    this.sheet.textContent = css;
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

export const editStore = new EditStore();

/** Makes an element's text editable in place until it loses focus. */
export function editTextInPlace(el: HTMLElement, onDone?: (text: string) => void) {
  const prev = el.contentEditable;
  el.contentEditable = "plaintext-only";
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  const finish = () => {
    el.contentEditable = prev;
    el.removeEventListener("blur", finish);
    el.removeEventListener("keydown", onKey);
    onDone?.(el.innerText);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      el.blur();
    }
  };
  el.addEventListener("blur", finish);
  el.addEventListener("keydown", onKey);
}
