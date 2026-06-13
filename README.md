# SPLAT — 1 Shot Paint Recipe Calculator

*Sign Painters' Lookup & Adjustment Tool*

SPLAT was built to help translate our precious 1 Shot lettering enamels into whatever color a
client throws at us. Feed it a Pantone C code, a HEX, an RGB, or a CMYK value, and it finds the
closest 1 Shot formula — then lets you scale the mix to however many parts you need and save your
favorites for a print-to-PDF "receipt" at the bench.

It's a small, local-first tool — no accounts, no sign-up. Your saved recipes live right in
your browser, which keeps things simple but comes with one catch: open SPLAT in a different
browser or on another device, or clear your history, and your saved mixes will be gone. So
hit **Print** on anything you want to keep — a printed (or saved-to-PDF) recipe sheet is your
permanent copy.

**Current version: v0.1.0 — early beta.** Feedback very welcome.

## ⚠️ Please read this part

Every formula here was gathered from publicly available online sources. They are
**approximations and suggestions — not gospel.** On top of that, the on-screen color swatches are
*approximate screen colors* (from the open-source `pantone-colors` data), not calibrated paint
samples.

So, plainly:

- **Always brush-test a mix before committing it to real work.**
- Treat every recipe as a starting point you fine-tune by eye.
- **There is no guarantee of a 100% match.** Lighting, substrate, and the paint batch all matter.

Use it to get *close, fast* — then trust your hands and your eyes for the rest.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

## Verify

```bash
npm test
npm run build
```

## Data

The structured formula table in `src/generated/pantoneFormulas.ts` is committed to the repo and is
what the app actually uses. It's generated from a PPG 1 Shot color-formulas PDF:

```bash
npm run generate:data
```

Note: the source PPG / 1 Shot PDFs are **not included** in this repository — they're copyrighted
material and shouldn't be redistributed. If you want to regenerate the data yourself, drop the
formula PDF into `data/source/` first.

## Built with

React, TypeScript, Vite, CSS, and the Node test runner — plus 1 Shot formula data from public
sources and `pantone-colors` approximate HEX values.

Made by [Eduardo Roisman](https://github.com/edrm-stuff/) · [Instagram](https://instagram.com/justeduardoroisman)
