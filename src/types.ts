export type ColorMode = "pantone" | "hex" | "rgb" | "cmyk";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

export interface PaintBase {
  code: string;
  name: string;
  category: "Lettering enamel" | "Tint" | "Metallic" | "Unknown";
  displayColor?: string;
}

export interface FormulaComponent {
  paintCode: string;
  amount: number;
  unit: "part" | "drop";
  originalAmountLabel: string;
  note?: string;
}

export interface PantoneFormula {
  pantoneCode: string;
  components: FormulaComponent[];
  sourceText: string;
}

export interface ParsedColorInput {
  mode: ColorMode;
  raw: string;
  pantoneCode?: string;
  rgb?: RgbColor;
  error?: string;
}

export interface MatchResult {
  pantoneCode: string;
  formula: PantoneFormula;
  deltaE: number;
  confidence: "Excellent" | "Good" | "Rough" | "Exploratory";
  approximateHex: string;
  approximateSource: string;
}

export interface SavedRecipe {
  pantoneCode: string;
  targetParts: number;
  savedAt: string;
  sourceMode: ColorMode;
  sourceLabel: string;
}
