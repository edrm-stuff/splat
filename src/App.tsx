import React, { useMemo, useState } from "react";
import { CircleAlert, FlaskConical, Heart, Palette, Printer, RotateCcw, Search, Trash2 } from "lucide-react";
import { PAINT_BASES, paintBaseByCode } from "./data/paintBases";
import { PANTONE_FORMULAS } from "./generated/pantoneFormulas";
import { rgbToHex } from "./lib/colorMath";
import { getPartTotal } from "./lib/formulaParser";
import {
  findNearestFormulaMatches,
  getApproximatePantoneHex,
  getFormulaForPantone,
  getNearestForPantoneCode
} from "./lib/matching";
import { parseColorInput } from "./lib/input";
import {
  isRecipeSaved,
  readSavedRecipes,
  removeSavedRecipe,
  toggleSavedRecipe,
  writeSavedRecipes
} from "./lib/savedRecipes";
import type { ColorMode, FormulaComponent, MatchResult, PantoneFormula, SavedRecipe } from "./types";

const MODE_LABELS: Record<ColorMode, string> = {
  pantone: "Pantone C",
  hex: "HEX",
  rgb: "RGB",
  cmyk: "CMYK"
};

const MODE_PLACEHOLDERS: Record<ColorMode, string> = {
  pantone: "185 C",
  hex: "#e8112d",
  rgb: "232, 17, 45",
  cmyk: "0, 93, 80, 9"
};

const DEFAULT_INPUTS: Record<ColorMode, string> = {
  pantone: "185 C",
  hex: "#e8112d",
  rgb: "232, 17, 45",
  cmyk: "0, 93, 80, 9"
};

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(digits, 1)
  });
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function confidenceTone(confidence: MatchResult["confidence"]) {
  if (confidence === "Excellent") return "excellent";
  if (confidence === "Good") return "good";
  if (confidence === "Rough") return "rough";
  return "exploratory";
}

function getSwatchForFormula(formula?: PantoneFormula, fallback = "#d7d1c7") {
  if (!formula) return fallback;
  return getApproximatePantoneHex(formula.pantoneCode) ?? fallback;
}

function HeartButton({
  isSaved,
  onClick,
  label,
  text,
  compact = false
}: {
  isSaved: boolean;
  onClick: () => void;
  label: string;
  text?: string;
  compact?: boolean;
}) {
  return (
    <button
      aria-pressed={isSaved}
      aria-label={label}
      className={`heart-button ${isSaved ? "saved" : ""} ${compact ? "compact" : ""}`}
      onClick={onClick}
      type="button"
    >
      <Heart size={compact ? 16 : 20} aria-hidden="true" />
      {!compact ? <span>{text ?? (isSaved ? "Saved" : "Save")}</span> : null}
    </button>
  );
}

function FormulaComponentRow({
  component,
  totalParts,
  targetParts
}: {
  component: FormulaComponent;
  totalParts: number;
  targetParts: number;
}) {
  const paint = paintBaseByCode.get(component.paintCode);
  const percentage = component.unit === "part" && totalParts > 0 ? component.amount / totalParts : null;
  const scaledAmount = percentage === null ? null : percentage * targetParts;

  return (
    <div className="recipe-row">
      <div className="paint-cell">
        <span className="paint-chip" style={{ backgroundColor: paint?.displayColor ?? "#b8b0a6" }} />
        <span>
          <strong>{component.paintCode}</strong>
          <span>{paint?.name ?? "Unknown 1 Shot base"}</span>
        </span>
      </div>
      <div>{component.originalAmountLabel}</div>
      <div>{percentage === null ? "drop note" : `${formatNumber(percentage * 100)}%`}</div>
      <div>{scaledAmount === null ? component.originalAmountLabel : formatNumber(scaledAmount, 3)}</div>
    </div>
  );
}

function RecipePanel({
  formula,
  match,
  statusText,
  targetParts,
  setTargetParts,
  isSaved,
  onToggleFavorite
}: {
  formula?: PantoneFormula;
  match?: MatchResult | null;
  statusText: string;
  targetParts: number;
  setTargetParts: (value: number) => void;
  isSaved: boolean;
  onToggleFavorite: () => void;
}) {
  if (!formula) {
    return (
      <section className="panel empty-state">
        <div className="window-title">
          <span>recipe.exe</span>
        </div>
        <FlaskConical size={24} aria-hidden="true" />
        <h2>Awaiting match</h2>
        <p>{statusText}</p>
      </section>
    );
  }

  const totalParts = getPartTotal(formula.components);
  const swatch = getSwatchForFormula(formula);

  return (
    <section className="panel recipe-panel" aria-label={`Recipe for Pantone ${formula.pantoneCode} C`}>
      <div className="window-title">
        <span>recipe.exe</span>
      </div>

      <div className="recipe-header">
        <div className="recipe-header-copy">
          <span className="eyebrow">Selected mix</span>
          <h2>Pantone {formula.pantoneCode} C</h2>
        </div>
        <span className="recipe-swatch" style={{ backgroundColor: swatch }} />
        <div className="recipe-header-footer">
          {match ? (
            <span className={`confidence ${confidenceTone(match.confidence)}`}>{match.confidence}</span>
          ) : null}
          <HeartButton
            isSaved={isSaved}
            label={`Save recipe Pantone ${formula.pantoneCode} C`}
            onClick={onToggleFavorite}
            text="Save recipe"
          />
        </div>
      </div>

      <div className="recipe-controls">
        <div className="recipe-total">
          <span>Total parts</span>
          <strong>{formatNumber(totalParts, 3)}</strong>
        </div>
        <label className="scale-control">
          <span>Scale to total parts</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={targetParts}
            onChange={(event) => setTargetParts(Math.max(0.1, Number(event.target.value) || 0.1))}
          />
        </label>
      </div>

      <div className="recipe-table" role="table" aria-label="1 Shot paint mix">
        <div className="recipe-row recipe-head" role="row">
          <div>Paint</div>
          <div>Source amount</div>
          <div>Share</div>
          <div>Scaled parts</div>
        </div>
        {formula.components.map((component, index) => (
          <FormulaComponentRow
            key={`${component.paintCode}-${component.originalAmountLabel}-${index}`}
            component={component}
            totalParts={totalParts}
            targetParts={targetParts}
          />
        ))}
      </div>

      <details className="source-detail">
        <summary>Original PPG formula text</summary>
        <p>{formula.sourceText}</p>
      </details>
    </section>
  );
}

function MatchList({
  matches,
  selectedCode,
  savedRecipes,
  onSelect,
  onToggleFavorite
}: {
  matches: MatchResult[];
  selectedCode?: string;
  savedRecipes: SavedRecipe[];
  onSelect: (match: MatchResult) => void;
  onToggleFavorite: (formula: PantoneFormula) => void;
}) {
  if (matches.length === 0) {
    return (
      <section className="panel empty-state">
        <div className="window-title">
          <span>matches.exe</span>
        </div>
        <Search size={24} aria-hidden="true" />
        <h2>No nearest matches available</h2>
        <p>This color needs an approximate Pantone value before it can be compared.</p>
      </section>
    );
  }

  return (
    <section className="panel matches-panel" aria-label="Nearest available formulas">
      <div className="window-title">
        <span>matches.exe</span>
      </div>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Nearest PPG-backed formulas</span>
          <h2>Match candidates</h2>
        </div>
      </div>
      <div className="match-list">
        {matches.map((match) => {
          const saved = isRecipeSaved(savedRecipes, match.pantoneCode);

          return (
            <div
              className={`match-card ${selectedCode === match.pantoneCode ? "selected" : ""}`}
              key={match.pantoneCode}
            >
              <button
                aria-label={`Choose Pantone ${match.pantoneCode} C`}
                className="match-select"
                onClick={() => onSelect(match)}
                type="button"
              >
                <span className="match-swatch" style={{ backgroundColor: match.approximateHex }} />
                <span className="match-main">
                  <strong>Pantone {match.pantoneCode} C</strong>
                  <span>Delta E {formatNumber(match.deltaE, 2)}</span>
                </span>
              </button>
              <span className={`confidence ${confidenceTone(match.confidence)}`}>{match.confidence}</span>
              <HeartButton
                compact
                isSaved={saved}
                label={`${saved ? "Remove" : "Save"} Pantone ${match.pantoneCode} C`}
                onClick={() => onToggleFavorite(match.formula)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SavedRecipesPanel({
  savedRecipes,
  onRemove,
  onPrint
}: {
  savedRecipes: SavedRecipe[];
  onRemove: (pantoneCode: string) => void;
  onPrint: () => void;
}) {
  return (
    <section className="panel saved-panel" aria-label="Saved recipes">
      <div className="window-title">
        <span>favorites.dir</span>
      </div>
      <div className="panel-heading saved-heading">
        <div>
          <span className="eyebrow">Saved mixes</span>
          <h2>Saved recipes</h2>
        </div>
        <button className="print-button" disabled={savedRecipes.length === 0} onClick={onPrint} type="button">
          <Printer size={18} aria-hidden="true" />
          Print
        </button>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="saved-empty">
          <Heart size={22} aria-hidden="true" />
          <p>Heart a mix to save it here for print-to-PDF receipts.</p>
        </div>
      ) : (
        <div className="saved-list">
          {savedRecipes.map((savedRecipe) => {
            const formula = getFormulaForPantone(savedRecipe.pantoneCode);

            return (
              <article className="saved-item" key={savedRecipe.pantoneCode}>
                <span
                  className="saved-swatch"
                  style={{ backgroundColor: getSwatchForFormula(formula, "#cfc8b6") }}
                />
                <div className="saved-copy">
                  <strong>Pantone {savedRecipe.pantoneCode} C</strong>
                  <span>{formula ? `${formatNumber(savedRecipe.targetParts, 3)} scaled parts` : "Formula missing"}</span>
                  <span>{savedRecipe.sourceLabel}</span>
                  <span>Saved {formatSavedDate(savedRecipe.savedAt)}</span>
                </div>
                <button
                  aria-label={`Remove Pantone ${savedRecipe.pantoneCode} C`}
                  className="remove-button"
                  onClick={() => onRemove(savedRecipe.pantoneCode)}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ColophonPanel() {
  return (
    <section className="panel colophon-panel" aria-label="Colophon">
      <div className="window-title">
        <span>colophon.txt</span>
      </div>
      <div className="notepad-menu" aria-hidden="true">
        <span>File</span>
        <span>Edit</span>
        <span>Search</span>
        <span>Help</span>
      </div>
      <div className="colophon-copy">
        <p>
          <strong>Powered by the S.H.I.T. colour engine</strong>
          <br />
          Signwriter’s Hue &amp; Ingredient Tool
          <br />
          Finally, get your S.H.I.T. together.
        </p>
        <p>
          <strong>Created by Eduardo Roisman</strong>
        </p>
        <p>
          <a href="https://github.com/edrm-stuff/" rel="noreferrer" target="_blank">
            https://github.com/edrm-stuff/
          </a>
        </p>
        <p>
          <a href="https://instagram.com/justeduardoroisman" rel="noreferrer" target="_blank">
            instagram.com/justeduardoroisman
          </a>
        </p>
        <p>
          Built with React, TypeScript, Vite, CSS, the Node test runner, PPG 1 Shot formula PDF data,
          pantone-colors approximate HEX data, and OpenAI Codex assistance.
        </p>
      </div>
    </section>
  );
}

function ReceiptRecipe({
  savedRecipe,
  formula
}: {
  savedRecipe: SavedRecipe;
  formula?: PantoneFormula;
}) {
  if (!formula) {
    return (
      <article className="receipt-card">
        <h3>Pantone {savedRecipe.pantoneCode} C</h3>
        <p className="receipt-muted">Formula is no longer available in the local data set.</p>
      </article>
    );
  }

  const totalParts = getPartTotal(formula.components);

  return (
    <article className="receipt-card">
      <header className="receipt-card-header">
        <span className="receipt-swatch" style={{ backgroundColor: getSwatchForFormula(formula) }} />
        <div>
          <h3>Pantone {formula.pantoneCode} C</h3>
          <p>{savedRecipe.sourceLabel}</p>
        </div>
      </header>
      <div className="receipt-meta">
        <span>Total source parts: {formatNumber(totalParts, 3)}</span>
        <span>Scaled to: {formatNumber(savedRecipe.targetParts, 3)}</span>
      </div>
      <div className="receipt-lines">
        {formula.components.map((component, index) => {
          const paint = paintBaseByCode.get(component.paintCode);
          const share = component.unit === "part" && totalParts > 0 ? component.amount / totalParts : null;
          const scaledAmount = share === null ? null : share * savedRecipe.targetParts;

          return (
            <div className="receipt-line" key={`${component.paintCode}-${index}`}>
              <span>
                {component.paintCode} {paint?.name ?? "Unknown base"}
              </span>
              <span>{component.originalAmountLabel}</span>
              <span>{share === null ? "drop note" : `${formatNumber(share * 100)}%`}</span>
              <strong>{scaledAmount === null ? component.originalAmountLabel : formatNumber(scaledAmount, 3)}</strong>
            </div>
          );
        })}
      </div>
      <p className="receipt-source">{formula.sourceText}</p>
    </article>
  );
}

function ReceiptPrintView({ savedRecipes }: { savedRecipes: SavedRecipe[] }) {
  return (
    <section className="receipt-print" aria-label="Receipt print view">
      <header className="receipt-header">
        <p>SPLAT</p>
        <h2>Favorite recipe receipt</h2>
        <span>{savedRecipes.length} recipe{savedRecipes.length === 1 ? "" : "s"}</span>
      </header>
      {savedRecipes.length === 0 ? (
        <p className="receipt-muted">No saved recipes selected for print.</p>
      ) : (
        savedRecipes.map((savedRecipe) => (
          <ReceiptRecipe
            key={savedRecipe.pantoneCode}
            savedRecipe={savedRecipe}
            formula={getFormulaForPantone(savedRecipe.pantoneCode)}
          />
        ))
      )}
      <footer className="receipt-footer">
        Screen color matches are approximate. Brush-test critical work.
      </footer>
    </section>
  );
}

export default function App() {
  const [mode, setMode] = useState<ColorMode>("pantone");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [targetParts, setTargetParts] = useState(10);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => readSavedRecipes());

  const rawInput = inputs[mode];
  const parsed = useMemo(() => parseColorInput(mode, rawInput), [mode, rawInput]);

  const exactFormula = parsed.pantoneCode ? getFormulaForPantone(parsed.pantoneCode) : undefined;
  const matches = useMemo(() => {
    if (parsed.error) return [];
    if (parsed.rgb) return findNearestFormulaMatches(parsed.rgb);
    if (parsed.pantoneCode && !exactFormula) return getNearestForPantoneCode(parsed.pantoneCode);
    return exactFormula
      ? [
          {
            pantoneCode: exactFormula.pantoneCode,
            formula: exactFormula,
            deltaE: 0,
            confidence: "Excellent" as const,
            approximateHex: getSwatchForFormula(exactFormula),
            approximateSource: "Direct Pantone C formula lookup from PPG PDF"
          }
        ]
      : [];
  }, [exactFormula, parsed.error, parsed.pantoneCode, parsed.rgb]);

  const activeFormula = selectedMatch?.formula ?? exactFormula ?? matches[0]?.formula;
  const activeSwatch =
    parsed.rgb && mode !== "pantone"
      ? rgbToHex(parsed.rgb)
      : parsed.pantoneCode
        ? getApproximatePantoneHex(parsed.pantoneCode) ?? getSwatchForFormula(activeFormula)
        : getSwatchForFormula(activeFormula);

  const activeMatch = activeFormula
    ? selectedMatch ?? matches.find((match) => match.pantoneCode === activeFormula.pantoneCode) ?? null
    : null;
  const activeIsSaved = activeFormula ? isRecipeSaved(savedRecipes, activeFormula.pantoneCode) : false;
  const inputStatus = parsed.error
    ? parsed.error
    : exactFormula
      ? `Exact PPG formula found for Pantone ${exactFormula.pantoneCode} C.`
      : matches.length > 0
        ? `Showing nearest available formulas from ${matches.length} candidates.`
        : "No supported formula found for this value.";
  const recipeStatus = activeFormula
    ? exactFormula && activeFormula.pantoneCode === exactFormula.pantoneCode && mode === "pantone"
      ? ""
      : activeMatch
        ? `${activeMatch.confidence} nearest match.`
        : "Nearest available PPG-backed formula."
    : parsed.error
      ? parsed.error
      : "Enter a supported Pantone C code or choose one of the nearest matches.";

  function persistSavedRecipes(nextRecipes: SavedRecipe[]) {
    setSavedRecipes(writeSavedRecipes(nextRecipes));
  }

  function buildSavedRecipe(formula: PantoneFormula): SavedRecipe {
    const sourceLabel =
      mode === "pantone"
        ? `Pantone ${formula.pantoneCode} C`
        : `${MODE_LABELS[mode]} ${rawInput.trim()} -> Pantone ${formula.pantoneCode} C`;

    return {
      pantoneCode: formula.pantoneCode,
      targetParts,
      savedAt: new Date().toISOString(),
      sourceMode: mode,
      sourceLabel
    };
  }

  function toggleFavorite(formula?: PantoneFormula) {
    if (!formula) return;
    persistSavedRecipes(toggleSavedRecipe(savedRecipes, buildSavedRecipe(formula)));
  }

  function removeFavorite(pantoneCode: string) {
    persistSavedRecipes(removeSavedRecipe(savedRecipes, pantoneCode));
  }

  function updateMode(nextMode: ColorMode) {
    setMode(nextMode);
    setSelectedMatch(null);
  }

  function updateInput(value: string) {
    setInputs((current) => ({ ...current, [mode]: value }));
    setSelectedMatch(null);
  }

  function resetInput() {
    setInputs((current) => ({ ...current, [mode]: DEFAULT_INPUTS[mode] }));
    setSelectedMatch(null);
  }

  function printFavorites() {
    window.print();
  }

  return (
    <>
      <main className="app-shell screen-app">
        <section className="hero-band">
          <div>
            <span className="eyebrow">Sign Painters’ Lookup &amp; Adjustment Tool</span>
            <h1>SPLAT</h1>
          </div>
          <div className="stats-strip" aria-label="Data summary">
            <span>
              <strong>{PANTONE_FORMULAS.length}</strong> formulas
            </span>
            <span>
              <strong>{savedRecipes.length}</strong> saved
            </span>
            <span>
              <strong>{PAINT_BASES.length}</strong> paint bases
            </span>
          </div>
        </section>

        <section className="workspace">
          <aside className="left-stack">
            <section className="panel input-panel">
              <div className="window-title">
                <span>calculator.exe</span>
              </div>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Target</span>
                  <h2>Color input</h2>
                </div>
                <Palette size={24} aria-hidden="true" />
              </div>

              <div className="mode-grid" role="tablist" aria-label="Color input mode">
                {(Object.keys(MODE_LABELS) as ColorMode[]).map((modeName) => (
                  <button
                    aria-selected={modeName === mode}
                    className={modeName === mode ? "active" : ""}
                    key={modeName}
                    onClick={() => updateMode(modeName)}
                    role="tab"
                    type="button"
                  >
                    {MODE_LABELS[modeName]}
                  </button>
                ))}
              </div>

              <label className="input-field">
                <span>{MODE_LABELS[mode]} value</span>
                <div className="input-with-button">
                  <input
                    aria-invalid={Boolean(parsed.error)}
                    onChange={(event) => updateInput(event.target.value)}
                    placeholder={MODE_PLACEHOLDERS[mode]}
                    value={rawInput}
                  />
                  <button aria-label="Reset value" onClick={resetInput} type="button">
                    <RotateCcw size={18} aria-hidden="true" />
                  </button>
                </div>
              </label>

              <div className="swatch-card">
                <div className="large-swatch" style={{ backgroundColor: activeSwatch }} />
                <div>
                  <span className="eyebrow">Preview</span>
                  <strong>{activeSwatch}</strong>
                  <p>{inputStatus}</p>
                </div>
              </div>

              <div className="notice">
                <CircleAlert size={18} aria-hidden="true" />
                <p>
                  RGB, HEX, CMYK, and Pantone comparisons use approximate screen color data. Always
                  brush-test critical work.
                </p>
              </div>
            </section>

            <MatchList
              matches={matches}
              savedRecipes={savedRecipes}
              selectedCode={activeFormula?.pantoneCode}
              onSelect={(match) => setSelectedMatch(match)}
              onToggleFavorite={toggleFavorite}
            />
          </aside>

          <div className="results-stack">
            <div className="recipe-favorites-grid">
              <RecipePanel
                formula={activeFormula}
                isSaved={activeIsSaved}
                match={activeMatch}
                statusText={recipeStatus}
                targetParts={targetParts}
                setTargetParts={setTargetParts}
                onToggleFavorite={() => toggleFavorite(activeFormula)}
              />
              <aside className="right-rail" aria-label="Recipe workspace extras">
                <SavedRecipesPanel savedRecipes={savedRecipes} onRemove={removeFavorite} onPrint={printFavorites} />
                <ColophonPanel />
              </aside>
            </div>
          </div>
        </section>
      </main>
      <ReceiptPrintView savedRecipes={savedRecipes} />
    </>
  );
}
