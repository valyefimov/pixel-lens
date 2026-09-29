import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, toHex, toHslString, toOklchString, wcagLevel } from "../src/color";

describe("parseColor", () => {
  it.each([
    ["#fff", { r: 255, g: 255, b: 255, a: 1 }],
    ["#2E62FF", { r: 46, g: 98, b: 255, a: 1 }],
    ["#00000080", { r: 0, g: 0, b: 0, a: 0.502 }],
    ["rgb(46, 98, 255)", { r: 46, g: 98, b: 255, a: 1 }],
    ["rgba(0, 0, 0, 0.5)", { r: 0, g: 0, b: 0, a: 0.5 }],
    ["rgb(0 0 0 / 25%)", { r: 0, g: 0, b: 0, a: 0.25 }],
    ["hsl(0, 100%, 50%)", { r: 255, g: 0, b: 0, a: 1 }],
    ["transparent", { r: 0, g: 0, b: 0, a: 0 }],
  ])("parses %s", (input, expected) => {
    expect(parseColor(input)).toEqual(expected);
  });

  it("rejects garbage", () => {
    expect(parseColor("banana")).toBeNull();
    expect(parseColor("#12")).toBeNull();
  });
});

describe("formatting", () => {
  const blue = parseColor("#2E62FF")!;
  it("round-trips hex", () => expect(toHex(blue)).toBe("#2E62FF"));
  it("formats hsl", () => expect(toHslString(blue)).toBe("hsl(225 100% 59%)"));
  it("formats oklch", () => expect(toOklchString(blue)).toMatch(/^oklch\(\d+(\.\d)?% 0\.\d+ \d+(\.\d)?\)$/));
});

describe("contrast", () => {
  const black = parseColor("#000")!;
  const white = parseColor("#fff")!;

  it("computes the extremes", () => {
    expect(contrastRatio(black, white)).toBe(21);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it("matches the WebAIM reference for #767676 on white", () => {
    expect(contrastRatio(parseColor("#767676")!, white)).toBe(4.54);
  });

  it("grades by text size", () => {
    expect(wcagLevel(4.6, 16)).toBe("AA");
    expect(wcagLevel(3.2, 16)).toBe("Fail");
    expect(wcagLevel(3.2, 24)).toBe("AA Large");
    expect(wcagLevel(3.2, 19, 700)).toBe("AA Large");
    expect(wcagLevel(7.1, 12)).toBe("AAA");
  });
});
