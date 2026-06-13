import pantoneColors from "pantone-colors";
import { PANTONE_FORMULAS } from "../generated/pantoneFormulas";
import type { LabColor, MatchResult, PantoneFormula, RgbColor } from "../types";
import { deltaE2000, hexToRgb, rgbToLab } from "./colorMath";

const PANTONE_HEX_BY_CODE = pantoneColors as Record<string, string>;
const APPROXIMATE_SOURCE = "pantone-colors npm package, MIT, approximate public HEX values";

export const formulasByPantone = new Map(
  PANTONE_FORMULAS.map((formula) => [formula.pantoneCode, formula])
);

interface FormulaLab {
  formula: PantoneFormula;
  approximateHex: string;
  lab: LabColor;
}

// Pre-compute each candidate's approximate Lab once at module load. Avoids
// recomputing hexToRgb + rgbToLab for all 1000+ formulas on every keystroke.
const FORMULA_LABS: FormulaLab[] = PANTONE_FORMULAS.flatMap((formula) => {
  const approximateHex = PANTONE_HEX_BY_CODE[formula.pantoneCode];
  if (!approximateHex) return [];

  const rgb = hexToRgb(approximateHex);
  if (!rgb) return [];

  return [{ formula, approximateHex, lab: rgbToLab(rgb) }];
});

// ΔE2000 bands run smaller than ΔE76; tuned for perceptual match quality.
function confidenceFromDelta(deltaE: number): MatchResult["confidence"] {
  if (deltaE < 1.5) return "Excellent";
  if (deltaE < 3) return "Good";
  if (deltaE < 6) return "Rough";
  return "Exploratory";
}

export function findNearestFormulaMatches(targetRgb: RgbColor, limit = 6): MatchResult[] {
  const targetLab = rgbToLab(targetRgb);

  return FORMULA_LABS.map(({ formula, approximateHex, lab }) => {
    const deltaE = deltaE2000(targetLab, lab);

    return {
      pantoneCode: formula.pantoneCode,
      formula,
      deltaE,
      confidence: confidenceFromDelta(deltaE),
      approximateHex,
      approximateSource: APPROXIMATE_SOURCE
    } satisfies MatchResult;
  })
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, limit);
}

export function getFormulaForPantone(pantoneCode: string) {
  return formulasByPantone.get(pantoneCode);
}

export function getApproximatePantoneHex(pantoneCode: string) {
  return PANTONE_HEX_BY_CODE[pantoneCode];
}

export function getNearestForPantoneCode(pantoneCode: string, limit = 6) {
  const hex = getApproximatePantoneHex(pantoneCode);
  const rgb = hex ? hexToRgb(hex) : null;
  return rgb ? findNearestFormulaMatches(rgb, limit) : [];
}
