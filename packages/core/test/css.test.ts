import { describe, expect, it } from "vitest";
import { editsToCss, editsToDiff, isStableClass, netEdits, shorthand, splitFontFamily } from "../src/css";

describe("css helpers", () => {
  it("builds shorthand", () => {
    expect(shorthand("8px", "8px", "8px", "8px")).toBe("8px");
    expect(shorthand("12px", "24px", "12px", "24px")).toBe("12px 24px");
    expect(shorthand("0px", "0px", "0px", "24px")).toBe("0 0 0 24px");
  });

  it("splits font stacks", () => {
    expect(splitFontFamily(`"Inter Var", system-ui, sans-serif`)).toEqual(["Inter Var", "system-ui", "sans-serif"]);
  });

  it("detects generated class names", () => {
    expect(isStableClass("hero__cta")).toBe(true);
    expect(isStableClass("css-1x2y3z")).toBe(false);
    expect(isStableClass("Button_root__a8F3k")).toBe(false);
  });
});

describe("edits", () => {
  const edits = [
    { selector: ".cta", property: "padding", before: "12px", after: "16px" },
    { selector: ".cta", property: "padding", before: "16px", after: "20px" },
    { selector: ".cta", property: "color", before: "red", after: "blue" },
    { selector: ".cta", property: "color", before: "blue", after: "red" },
  ];

  it("folds edits and drops reverted ones", () => {
    expect(netEdits(edits)).toEqual([{ selector: ".cta", property: "padding", before: "12px", after: "20px" }]);
  });

  it("renders a diff and css", () => {
    expect(editsToDiff(edits)).toBe("  .cta {\n-   padding: 12px;\n+   padding: 20px;\n  }");
    expect(editsToCss(edits)).toBe(".cta {\n  padding: 20px;\n}");
  });
});
