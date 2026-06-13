import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cmykToRgb,
  deltaE2000,
  deltaE76,
  hexToRgb,
  parseCmykInput,
  parsePantoneInput,
  parseRgbInput,
  rgbToHex,
  rgbToLab
} from "./colorMath";

describe("color math", () => {
  it("parses HEX and RGB values", () => {
    assert.deepEqual(hexToRgb("#e8112d"), { r: 232, g: 17, b: 45 });
    assert.deepEqual(hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseRgbInput("232, 17, 45"), { r: 232, g: 17, b: 45 });
    assert.deepEqual(parseRgbInput("rgb(232 17 45)"), { r: 232, g: 17, b: 45 });
    assert.equal(rgbToHex({ r: 232, g: 17, b: 45 }), "#e8112d");
  });

  it("rejects invalid RGB and CMYK values", () => {
    assert.equal(parseRgbInput("256, 0, 0"), null);
    assert.equal(parseCmykInput("0, 0, 0"), null);
    assert.equal(parseCmykInput("0, 101, 0, 0"), null);
  });

  it("converts CMYK to RGB", () => {
    assert.deepEqual(cmykToRgb(0, 100, 100, 0), { r: 255, g: 0, b: 0 });
    assert.deepEqual(parseCmykInput("0, 93, 80, 9"), { r: 232, g: 16, b: 46 });
  });

  it("parses Pantone C codes from common labels", () => {
    assert.equal(parsePantoneInput("PMS 185 C"), "185");
    assert.equal(parsePantoneInput("Pantone 3005 C"), "3005");
  });

  it("calculates zero Delta E for identical colors", () => {
    const lab = rgbToLab({ r: 232, g: 17, b: 45 });
    assert.equal(deltaE76(lab, lab), 0);
    assert.equal(deltaE2000(lab, lab), 0);
  });

  it("computes a known CIEDE2000 reference pair", () => {
    // Sharma et al. reference: ΔE2000 ≈ 2.0425 for this Lab pair.
    const a = { l: 50, a: 2.6772, b: -79.7751 };
    const b = { l: 50, a: 0, b: -82.7485 };
    assert.ok(Math.abs(deltaE2000(a, b) - 2.0425) < 0.001);
  });
});
