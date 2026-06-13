# 1 Shot Paint Recipe Calculator

Local-first studio tool for looking up PPG 1 Shot paint formulas by Pantone C code and finding nearest available formulas from RGB, HEX, or CMYK input.

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

The structured formula table in `src/generated/pantoneFormulas.ts` is generated from the PPG 1 Shot color formulas PDF stored in `data/source/`.

```bash
npm run generate:data
```

RGB, HEX, CMYK, and Pantone matching use approximate screen-color values from the `pantone-colors` package. The app labels those matches as approximate; brush tests are still required for critical work.
