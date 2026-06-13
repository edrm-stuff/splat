import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPartTotal, parseAmountLabel, parseFormulaLine } from "./formulaParser";

describe("formula parser", () => {
  it("parses plain parts and tenths", () => {
    const formula = parseFormulaLine("185 9 PTS 102L - 1.5 PTS 130L - 1 PT 4002");

    assert.equal(formula?.pantoneCode, "185");
    assert.deepEqual(formula?.components, [
      { paintCode: "102L", amount: 9, unit: "part", originalAmountLabel: "9 PTS" },
      { paintCode: "130L", amount: 1.5, unit: "part", originalAmountLabel: "1.5 PTS" },
      { paintCode: "4002", amount: 1, unit: "part", originalAmountLabel: "1 PT" }
    ]);
    assert.equal(getPartTotal(formula?.components ?? []), 11.5);
  });

  it("parses fractions, mixed fractions, and half tenths", () => {
    assert.equal(parseAmountLabel("1/10 PT"), 0.1);
    assert.equal(parseAmountLabel("1 3/10 PTS"), 1.3);
    assert.equal(parseAmountLabel("1-1/2 PTS"), 1.5);
    assert.equal(parseAmountLabel("4 1/2/10"), 0.45);
    assert.equal(parseAmountLabel("½ PT"), 0.5);
  });

  it("parses drops and small drops without adding them to part totals", () => {
    const formula = parseFormulaLine("134 1 PT 134L - 9 PTS 4002 - A SMALL DROP 124L");

    assert.deepEqual(
      {
        paintCode: formula?.components[2].paintCode,
        amount: formula?.components[2].amount,
        unit: formula?.components[2].unit,
        note: formula?.components[2].note
      },
      {
      paintCode: "124L",
      amount: 1,
      unit: "drop",
      note: "small drop"
      }
    );
    assert.equal(getPartTotal(formula?.components ?? []), 10);
  });

  it("parses single paint-code formulas", () => {
    const formula = parseFormulaLine("200 165L");

    assert.deepEqual(formula?.components, [
      {
        paintCode: "165L",
        amount: 1,
        unit: "part",
        originalAmountLabel: "1 PT (inferred)",
        note: "single paint code formula"
      }
    ]);
  });

  it("normalizes common OCR-like paint code mistakes", () => {
    const formula = parseFormulaLine("157 1 4/10 PTS 134L - 3/10 PT I65L - 3 PTS 4002");

    assert.equal(formula?.components[1].paintCode, "165L");
  });
});
