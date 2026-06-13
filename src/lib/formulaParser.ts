import type { FormulaComponent, PantoneFormula } from "../types";

const VULGAR_FRACTIONS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4"
};

function normalizeFractions(value: string) {
  return [...value].map((char) => VULGAR_FRACTIONS[char] ?? char).join("");
}

function normalizePaintCode(value: string) {
  const normalized = value.toUpperCase().replace(/I/g, "1");
  if (/^\d{3}$/.test(normalized)) return `${normalized}L`;
  return normalized;
}

export function parseAmountLabel(rawLabel: string): number | null {
  const label = normalizeFractions(rawLabel)
    .toUpperCase()
    .replace(/\bPTS?\b/g, "")
    .replace(/\bDROPS?\b/g, "")
    .replace(/\bSMALL\b/g, "")
    .replace(/\bA\b/g, "1")
    .replace(/\bONE\b/g, "1")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .replace(/\b1\/0\b/g, "1/10")
    .trim();

  if (!label) return null;

  const halfTenths = label.match(/^(\d+)\s+1\/2\/10$/);
  if (halfTenths) return (Number(halfTenths[1]) + 0.5) / 10;

  const mixed = label.match(/^(\d+)(?:\s+|-)(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = label.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  const decimal = Number(label);
  return Number.isFinite(decimal) ? decimal : null;
}

export function parseFormulaComponent(rawComponent: string): FormulaComponent | null {
  const text = normalizeFractions(rawComponent)
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // The paint code is always the last token; the amount (which can contain its
  // own 3+ digit runs like "350" or ".025") comes first. Match the LAST code so
  // decimals and large part counts aren't mistaken for the paint code.
  const codeMatches = [...text.matchAll(/([0-9I]{3}L?|[0-9]{4})\b/gi)];
  if (codeMatches.length === 0) return null;

  const codeMatch = codeMatches[codeMatches.length - 1];
  const paintCode = normalizePaintCode(codeMatch[1]);
  const beforeCode = text.slice(0, codeMatch.index).trim();
  const unit: FormulaComponent["unit"] = /\bDROPS?\b/i.test(beforeCode) ? "drop" : "part";
  const amount = parseAmountLabel(beforeCode);
  const inferredAmount = amount ?? 1;

  const originalAmountLabel =
    beforeCode ||
    (unit === "drop" ? `${inferredAmount} DROP` : `${inferredAmount} PT (inferred)`);

  const note = /\bSMALL DROP\b/i.test(beforeCode)
    ? "small drop"
    : beforeCode
      ? undefined
      : "single paint code formula";

  const component: FormulaComponent = {
    paintCode,
    amount: inferredAmount,
    unit,
    originalAmountLabel
  };

  if (note) component.note = note;

  return component;
}

export function parseFormulaLine(line: string): PantoneFormula | null {
  const normalized = normalizeFractions(line)
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const match = normalized.match(/^(\d{2,5})\s+(.+)$/);
  if (!match) return null;

  const [, pantoneCode, formulaText] = match;
  const components = formulaText
    .split(/\s+-\s*/)
    .map(parseFormulaComponent)
    .filter((component): component is FormulaComponent => Boolean(component));

  if (components.length === 0) return null;

  return {
    pantoneCode,
    components,
    sourceText: normalized
  };
}

export function getPartTotal(components: FormulaComponent[]) {
  return components
    .filter((component) => component.unit === "part")
    .reduce((total, component) => total + component.amount, 0);
}
