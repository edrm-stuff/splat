import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_SAVED_RECIPES,
  SAVED_RECIPES_COOKIE,
  isRecipeSaved,
  parseSavedRecipesValue,
  pruneSavedRecipes,
  readSavedRecipes,
  removeSavedRecipe,
  serializeSavedRecipes,
  toggleSavedRecipe,
  upsertSavedRecipe
} from "./savedRecipes";
import type { SavedRecipe } from "../types";

function recipe(pantoneCode: string, index = Number(pantoneCode)): SavedRecipe {
  return {
    pantoneCode,
    targetParts: 10 + index,
    savedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    sourceMode: "pantone",
    sourceLabel: `Pantone ${pantoneCode} C`
  };
}

describe("saved recipes", () => {
  it("serializes and parses compact cookie values", () => {
    const saved = [recipe("185"), recipe("300")];
    const value = serializeSavedRecipes(saved);

    assert.deepEqual(parseSavedRecipesValue(value), [recipe("300"), recipe("185")]);
  });

  it("falls back to an empty list for invalid cookie data", () => {
    assert.deepEqual(parseSavedRecipesValue("%not-json"), []);
    assert.deepEqual(parseSavedRecipesValue(encodeURIComponent(JSON.stringify({ bad: true }))), []);
  });

  it("reads the named cookie from a cookie string", () => {
    const value = serializeSavedRecipes([recipe("185")]);

    assert.deepEqual(readSavedRecipes(`other=1; ${SAVED_RECIPES_COOKIE}=${value}`), [recipe("185")]);
  });

  it("prevents duplicates and keeps the newest recipe", () => {
    const oldRecipe = recipe("185", 1);
    const newRecipe = { ...recipe("185", 2), targetParts: 23 };

    assert.deepEqual(pruneSavedRecipes([oldRecipe, newRecipe]), [newRecipe]);
    assert.deepEqual(upsertSavedRecipe([oldRecipe], newRecipe), [newRecipe]);
  });

  it("toggles and removes saved recipes", () => {
    const saved = toggleSavedRecipe([], recipe("185"));

    assert.equal(isRecipeSaved(saved, "185"), true);
    assert.deepEqual(toggleSavedRecipe(saved, recipe("185")), []);
    assert.deepEqual(removeSavedRecipe(saved, "185"), []);
  });

  it("prunes over the safe cookie limit", () => {
    const manyRecipes = Array.from({ length: MAX_SAVED_RECIPES + 5 }, (_, index) =>
      recipe(String(1000 + index), index)
    );

    const pruned = pruneSavedRecipes(manyRecipes);

    assert.equal(pruned.length, MAX_SAVED_RECIPES);
    assert.equal(pruned[0].pantoneCode, "1044");
    assert.equal(pruned.at(-1)?.pantoneCode, "1005");
  });
});
