import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "./App";
import { clearSavedRecipes, writeSavedRecipes } from "./lib/savedRecipes";
import type { SavedRecipe } from "./types";

afterEach(() => {
  cleanup();
  clearSavedRecipes();
});

async function chooseMode(label: string) {
  await userEvent.click(screen.getByRole("tab", { name: label }));
}

function inputField() {
  return screen.getByRole("textbox");
}

describe("App", () => {
  it("shows a direct Pantone recipe by default", () => {
    render(<App />);

    assert.ok(screen.getByRole("heading", { name: "SPLAT" }));
    assert.ok(screen.getAllByText("Sign Painters’ Lookup & Adjustment Tool").length >= 1);
    assert.ok(screen.getByText("Exact PPG formula found for Pantone 185 C."));
    const recipe = screen.getByLabelText("Recipe for Pantone 185 C");
    assert.ok(recipe);
    assert.equal(within(recipe).queryByText(/Delta E/), null);
    assert.equal(within(recipe).queryByText("Direct PPG formula lookup."), null);
    assert.ok(screen.queryByText("current.mix") === null);
    assert.ok(screen.getByText("102L"));
    assert.ok(screen.getByText("Fire Red"));
  });

  it("shows the creator colophon and tools credits", () => {
    render(<App />);

    const colophon = screen.getByLabelText("Colophon");
    const rightRail = screen.getByLabelText("Recipe workspace extras");

    assert.ok(within(rightRail).getByLabelText("Saved recipes"));
    assert.ok(within(rightRail).getByLabelText("Colophon"));
    assert.ok(colophon.textContent?.includes("Powered by the S.H.I.T. colour engine"));
    assert.ok(colophon.textContent?.includes("Signwriter’s Hue & Ingredient Tool"));
    assert.ok(colophon.textContent?.includes("Finally, get your S.H.I.T. together."));
    assert.ok(within(colophon).getByText("Created by Eduardo Roisman"));
    assert.equal(
      within(colophon).getByRole("link", { name: "https://github.com/edrm-stuff/" }).getAttribute("href"),
      "https://github.com/edrm-stuff/"
    );
    assert.equal(
      within(colophon).getByRole("link", { name: "instagram.com/justeduardoroisman" }).getAttribute("href"),
      "https://instagram.com/justeduardoroisman"
    );
    assert.ok(within(colophon).getByText(/React, TypeScript, Vite, CSS, the Node test runner/));
    assert.ok(within(colophon).getByText(/OpenAI Codex assistance/));
  });

  it("finds nearest matches from RGB input", async () => {
    render(<App />);

    await chooseMode("RGB");
    fireEvent.change(inputField(), { target: { value: "0, 114, 198" } });

    assert.ok(screen.getByText(/Showing nearest available formulas/));
    assert.ok(screen.getByRole("heading", { name: "Match candidates" }));
    assert.ok(screen.getAllByRole("button", { name: /Pantone/i }).length > 0);
  });

  it("finds nearest matches from CMYK input", async () => {
    render(<App />);

    await chooseMode("CMYK");
    fireEvent.change(inputField(), { target: { value: "100, 42, 0, 22" } });

    assert.ok(screen.getByText(/Showing nearest available formulas/));
    assert.ok(screen.getAllByRole("heading", { name: /Pantone \d+ C/ }).length >= 1);
  });

  it("shows validation errors for invalid values", async () => {
    render(<App />);

    await chooseMode("RGB");
    fireEvent.change(inputField(), { target: { value: "999, 0, 0" } });

    assert.equal(inputField().getAttribute("aria-invalid"), "true");
    assert.ok(screen.getAllByText("Enter RGB as three 0-255 numbers.").length >= 1);
  });

  it("handles unsupported Pantone codes without crashing", () => {
    render(<App />);

    fireEvent.change(inputField(), { target: { value: "9999 C" } });

    assert.ok(screen.getByText("No supported formula found for this value."));
    assert.ok(screen.getByRole("heading", { name: "No nearest matches available" }));
  });

  it("updates scaled recipe amounts", () => {
    render(<App />);

    const recipe = screen.getByLabelText("Recipe for Pantone 185 C");
    const scaleInput = within(recipe).getByRole("spinbutton");
    fireEvent.change(scaleInput, { target: { value: "23" } });

    assert.equal((scaleInput as HTMLInputElement).value, "23");
    assert.ok(within(recipe).getByText("18"));
  });

  it("saves and removes hearted recipes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Save recipe Pantone 185 C" }));

    const savedPanel = screen.getByLabelText("Saved recipes");
    assert.ok(within(savedPanel).getByText("Saved mixes"));
    assert.ok(within(savedPanel).getAllByText("Pantone 185 C").length >= 1);
    assert.match(document.cookie, /oneShotSavedRecipes=/);

    fireEvent.click(within(savedPanel).getByRole("button", { name: "Remove Pantone 185 C" }));

    assert.ok(within(savedPanel).getByText("Heart a mix to save it here for print-to-PDF receipts."));
  });

  it("loads saved recipes from the cookie on a fresh render", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Save recipe Pantone 185 C" }));
    cleanup();

    render(<App />);

    assert.ok(within(screen.getByLabelText("Saved recipes")).getAllByText("Pantone 185 C").length >= 1);
    assert.ok(screen.getByLabelText("Receipt print view"));
  });

  it("prints the receipt view for saved recipes", () => {
    const originalPrint = window.print;
    let printed = false;
    window.print = () => {
      printed = true;
    };

    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Save recipe Pantone 185 C" }));
      fireEvent.click(screen.getByRole("button", { name: "Print" }));

      const receipt = screen.getByLabelText("Receipt print view");
      assert.ok(within(receipt).getByText("SPLAT"));
      assert.ok(within(receipt).getByText("Favorite recipe receipt"));
      assert.ok(within(receipt).getAllByText("Pantone 185 C").length >= 1);
      assert.ok(within(receipt).getByText(/102L Fire Red/));
      assert.equal(printed, true);
    } finally {
      window.print = originalPrint;
    }
  });

  it("handles stale saved Pantone codes", () => {
    const staleRecipe: SavedRecipe = {
      pantoneCode: "9999",
      targetParts: 10,
      savedAt: new Date("2026-06-12T12:00:00.000Z").toISOString(),
      sourceMode: "pantone",
      sourceLabel: "Pantone 9999 C"
    };
    writeSavedRecipes([staleRecipe]);

    render(<App />);

    assert.ok(within(screen.getByLabelText("Saved recipes")).getByText("Formula missing"));
    assert.ok(
      within(screen.getByLabelText("Receipt print view")).getByText(
        "Formula is no longer available in the local data set."
      )
    );
  });
});
