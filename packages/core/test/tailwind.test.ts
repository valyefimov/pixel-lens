import { describe, expect, it } from "vitest";
import { boxSides, radiusClass, spacingToken, toTailwind } from "../src/tailwind";

describe("tailwind", () => {
  it("maps spacing onto the v4 scale", () => {
    expect(spacingToken("16px")).toBe("4");
    expect(spacingToken("2px")).toBe("0.5");
    expect(spacingToken("1px")).toBe("px");
    expect(spacingToken("13px")).toBe("[13px]");
  });

  it("collapses box sides", () => {
    expect(boxSides("p", ["8px", "8px", "8px", "8px"])).toEqual(["p-2"]);
    expect(boxSides("p", ["12px", "24px", "12px", "24px"])).toEqual(["px-6", "py-3"]);
    expect(boxSides("m", ["0px", "0px", "0px", "-24px"])).toEqual(["mt-0", "mr-0", "mb-0", "-ml-6"]);
  });

  it("maps radii", () => {
    expect(radiusClass("9999px")).toBe("rounded-full");
    expect(radiusClass("8px")).toBe("rounded-lg");
    expect(radiusClass("0px")).toBeNull();
  });

  it("builds a class list from computed styles", () => {
    expect(
      toTailwind({
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        gap: "12px",
        "padding-top": "12px", "padding-right": "24px", "padding-bottom": "12px", "padding-left": "24px",
        "font-size": "20px",
        "font-weight": "500",
        "border-top-left-radius": "9999px",
      }),
    ).toEqual(["inline-flex", "justify-center", "items-center", "gap-3", "px-6", "py-3", "text-xl", "font-medium", "rounded-full"]);
  });
});
