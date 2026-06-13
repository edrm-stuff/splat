import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pdfParse from "pdf-parse";
import { parseFormulaLine } from "../src/lib/formulaParser";
import type { PantoneFormula } from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const formulasPdf = path.join(root, "data", "source", "1-shot-formulas.pdf");
const outputDir = path.join(root, "src", "generated");
const outputFile = path.join(outputDir, "pantoneFormulas.ts");

const SOURCE_URL =
  "https://assets-eu-01.kc-usercontent.com/cce44467-0106-013b-6c0b-26132a361492/fd42c5ff-b1d0-470f-8807-ac9f6cae74d8/1-shot-formulas.pdf";

function cleanLine(line: string) {
  return line
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^Updated to:.*$/i, "")
    .trim();
}

function looksLikeFormulaLine(line: string) {
  return /^\d{2,5}\s+/.test(line) && /(?:\bPT\b|\bPTS\b|\bDROP\b|\bDROPS\b|\d{3}L\b|\b400[12]\b)/i.test(line);
}

async function main() {
  const buffer = await fs.readFile(formulasPdf);
  const parsed = await pdfParse(buffer);
  const lines = parsed.text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^1 Shot color formulas/i.test(line))
    .filter((line) => !/^Pantone Color Number/i.test(line))
    .filter(looksLikeFormulaLine);

  const formulasByCode = new Map<string, PantoneFormula>();

  for (const line of lines) {
    const formula = parseFormulaLine(line);
    if (!formula) continue;

    const existing = formulasByCode.get(formula.pantoneCode);
    if (!existing || formula.components.length > existing.components.length) {
      formulasByCode.set(formula.pantoneCode, formula);
    }
  }

  const formulas = [...formulasByCode.values()].sort(
    (a, b) => Number(a.pantoneCode) - Number(b.pantoneCode)
  );

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    outputFile,
    `import type { PantoneFormula } from "../types";\n\n` +
      `export const FORMULA_SOURCE_URL = ${JSON.stringify(SOURCE_URL)};\n\n` +
      `export const PANTONE_FORMULAS: PantoneFormula[] = ${JSON.stringify(formulas, null, 2)};\n`,
    "utf8"
  );

  console.log(`Generated ${formulas.length} formulas at ${path.relative(root, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
