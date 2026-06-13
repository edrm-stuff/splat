import type { SavedRecipe } from "../types";

export const SAVED_RECIPES_COOKIE = "oneShotSavedRecipes";
export const MAX_SAVED_RECIPES = 40;

type CompactSavedRecipe = {
  p: string;
  t: number;
  s: string;
  m: SavedRecipe["sourceMode"];
  l: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecipe(value: unknown): SavedRecipe | null {
  if (!isRecord(value)) return null;

  const pantoneCode = typeof value.p === "string" ? value.p : value.pantoneCode;
  const targetParts = typeof value.t === "number" ? value.t : value.targetParts;
  const savedAt = typeof value.s === "string" ? value.s : value.savedAt;
  const sourceMode = typeof value.m === "string" ? value.m : value.sourceMode;
  const sourceLabel = typeof value.l === "string" ? value.l : value.sourceLabel;

  if (typeof pantoneCode !== "string" || !/^\d{2,5}$/.test(pantoneCode)) return null;
  if (typeof targetParts !== "number" || !Number.isFinite(targetParts) || targetParts <= 0) return null;
  if (typeof savedAt !== "string" || Number.isNaN(Date.parse(savedAt))) return null;
  if (
    sourceMode !== "pantone" &&
    sourceMode !== "hex" &&
    sourceMode !== "rgb" &&
    sourceMode !== "cmyk"
  ) {
    return null;
  }

  return {
    pantoneCode,
    targetParts,
    savedAt,
    sourceMode,
    sourceLabel: typeof sourceLabel === "string" && sourceLabel.trim() ? sourceLabel : `Pantone ${pantoneCode} C`
  };
}

function compactRecipe(recipe: SavedRecipe): CompactSavedRecipe {
  return {
    p: recipe.pantoneCode,
    t: recipe.targetParts,
    s: recipe.savedAt,
    m: recipe.sourceMode,
    l: recipe.sourceLabel
  };
}

export function pruneSavedRecipes(recipes: SavedRecipe[], limit = MAX_SAVED_RECIPES) {
  const deduped = new Map<string, SavedRecipe>();

  for (const recipe of recipes) {
    const normalized = normalizeRecipe(recipe);
    if (!normalized) continue;

    const existing = deduped.get(normalized.pantoneCode);
    if (!existing || Date.parse(normalized.savedAt) >= Date.parse(existing.savedAt)) {
      deduped.set(normalized.pantoneCode, normalized);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, limit);
}

export function serializeSavedRecipes(recipes: SavedRecipe[]) {
  return encodeURIComponent(JSON.stringify(pruneSavedRecipes(recipes).map(compactRecipe)));
}

export function parseSavedRecipesValue(value: string | undefined | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return pruneSavedRecipes(parsed.map(normalizeRecipe).filter((recipe): recipe is SavedRecipe => Boolean(recipe)));
  } catch {
    return [];
  }
}

export function readSavedRecipes(cookieString?: string) {
  const source =
    cookieString ??
    (typeof document === "undefined" || typeof document.cookie !== "string" ? "" : document.cookie);

  const cookie = source
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SAVED_RECIPES_COOKIE}=`));

  return parseSavedRecipesValue(cookie?.slice(SAVED_RECIPES_COOKIE.length + 1));
}

export function writeSavedRecipes(recipes: SavedRecipe[], targetDocument: Document | undefined = document) {
  const pruned = pruneSavedRecipes(recipes);
  if (!targetDocument) return pruned;

  targetDocument.cookie = `${SAVED_RECIPES_COOKIE}=${serializeSavedRecipes(
    pruned
  )}; path=/; max-age=31536000; SameSite=Lax`;

  return pruned;
}

export function clearSavedRecipes(targetDocument: Document | undefined = document) {
  if (!targetDocument) return;
  targetDocument.cookie = `${SAVED_RECIPES_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function isRecipeSaved(recipes: SavedRecipe[], pantoneCode: string) {
  return recipes.some((recipe) => recipe.pantoneCode === pantoneCode);
}

export function removeSavedRecipe(recipes: SavedRecipe[], pantoneCode: string) {
  return recipes.filter((recipe) => recipe.pantoneCode !== pantoneCode);
}

export function upsertSavedRecipe(recipes: SavedRecipe[], recipe: SavedRecipe) {
  return pruneSavedRecipes([recipe, ...removeSavedRecipe(recipes, recipe.pantoneCode)]);
}

export function toggleSavedRecipe(recipes: SavedRecipe[], recipe: SavedRecipe) {
  return isRecipeSaved(recipes, recipe.pantoneCode)
    ? removeSavedRecipe(recipes, recipe.pantoneCode)
    : upsertSavedRecipe(recipes, recipe);
}
