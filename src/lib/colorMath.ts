import type { LabColor, RgbColor } from "../types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function parseRgbInput(input: string): RgbColor | null {
  const values = input
    .replace(/rgba?\(/i, "")
    .replace(/\)/g, "")
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);

  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) return null;
  if (values.some((value) => value < 0 || value > 255)) return null;

  return { r: values[0], g: values[1], b: values[2] };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): RgbColor {
  const normalized = [c, m, y, k].map((value) => clamp(value, 0, 100) / 100);
  const [cyan, magenta, yellow, black] = normalized;

  return {
    r: Math.round(255 * (1 - cyan) * (1 - black)),
    g: Math.round(255 * (1 - magenta) * (1 - black)),
    b: Math.round(255 * (1 - yellow) * (1 - black))
  };
}

export function parseCmykInput(input: string): RgbColor | null {
  const values = input
    .replace(/cmyk\(/i, "")
    .replace(/\)/g, "")
    .replace(/%/g, "")
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);

  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
  if (values.some((value) => value < 0 || value > 100)) return null;

  return cmykToRgb(values[0], values[1], values[2], values[3]);
}

export function parsePantoneInput(input: string): string | null {
  const match = input.toUpperCase().match(/(?:PANTONE|PMS)?\s*(\d{2,5})\s*C?/);
  return match?.[1] ?? null;
}

function pivotRgb(channel: number) {
  const value = channel / 255;
  return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92;
}

function pivotXyz(value: number) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

export function rgbToLab(rgb: RgbColor): LabColor {
  const r = pivotRgb(rgb.r);
  const g = pivotRgb(rgb.g);
  const b = pivotRgb(rgb.b);

  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

export function deltaE76(a: LabColor, b: LabColor) {
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// CIEDE2000 perceptual color difference. More accurate than ΔE76, especially in
// the reds/yellows that dominate 1 Shot lettering enamels.
export function deltaE2000(a: LabColor, b: LabColor) {
  const lBarPrime = (a.l + b.l) / 2;

  const c1 = Math.sqrt(a.a ** 2 + a.b ** 2);
  const c2 = Math.sqrt(b.a ** 2 + b.b ** 2);
  const cBar = (c1 + c2) / 2;

  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1Prime = a.a * (1 + g);
  const a2Prime = b.a * (1 + g);

  const c1Prime = Math.sqrt(a1Prime ** 2 + a.b ** 2);
  const c2Prime = Math.sqrt(a2Prime ** 2 + b.b ** 2);
  const cBarPrime = (c1Prime + c2Prime) / 2;

  const h1Prime = hueAngle(a.b, a1Prime);
  const h2Prime = hueAngle(b.b, a2Prime);

  let deltahPrime = 0;
  if (c1Prime * c2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) deltahPrime = diff;
    else if (diff > 180) deltahPrime = diff - 360;
    else deltahPrime = diff + 360;
  }

  const deltaLPrime = b.l - a.l;
  const deltaCPrime = c2Prime - c1Prime;
  const deltaHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltahPrime * DEG_TO_RAD) / 2);

  let hBarPrime: number;
  if (c1Prime * c2Prime === 0) {
    hBarPrime = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    hBarPrime = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    hBarPrime = (h1Prime + h2Prime + 360) / 2;
  } else {
    hBarPrime = (h1Prime + h2Prime - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos((hBarPrime - 30) * DEG_TO_RAD) +
    0.24 * Math.cos(2 * hBarPrime * DEG_TO_RAD) +
    0.32 * Math.cos((3 * hBarPrime + 6) * DEG_TO_RAD) -
    0.2 * Math.cos((4 * hBarPrime - 63) * DEG_TO_RAD);

  const sL = 1 + (0.015 * (lBarPrime - 50) ** 2) / Math.sqrt(20 + (lBarPrime - 50) ** 2);
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;

  const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cBarPrime ** 7 / (cBarPrime ** 7 + 25 ** 7));
  const rT = -rC * Math.sin(2 * deltaTheta * DEG_TO_RAD);

  return Math.sqrt(
    (deltaLPrime / sL) ** 2 +
      (deltaCPrime / sC) ** 2 +
      (deltaHPrime / sH) ** 2 +
      rT * (deltaCPrime / sC) * (deltaHPrime / sH)
  );
}

function hueAngle(b: number, aPrime: number) {
  if (b === 0 && aPrime === 0) return 0;
  const angle = Math.atan2(b, aPrime) * RAD_TO_DEG;
  return angle >= 0 ? angle : angle + 360;
}
