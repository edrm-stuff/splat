import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFormulaForPantone, findNearestFormulaMatches } from "./matching";
import { hexToRgb } from "./colorMath";

describe("matching", () => {
  it("returns exact PPG-backed Pantone formulas", () => {
    const formula = getFormulaForPantone("185");

    assert.equal(formula?.pantoneCode, "185");
    assert.ok(formula?.components.map((component) => component.paintCode).includes("102L"));
  });

  it("ranks nearest matches using approximate Pantone HEX values", () => {
    const red = hexToRgb("#e8112d");
    assert.notEqual(red, null);

    const matches = findNearestFormulaMatches(red!, 3);

    assert.equal(matches.length, 3);
    assert.ok(matches[0].deltaE <= matches[1].deltaE);
    assert.ok(matches[0].formula.components.length > 0);
    assert.match(matches[0].approximateSource, /approximate/);
  });
});
