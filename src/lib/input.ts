import type { ColorMode, ParsedColorInput } from "../types";
import { hexToRgb, parseCmykInput, parsePantoneInput, parseRgbInput } from "./colorMath";

export function parseColorInput(mode: ColorMode, raw: string): ParsedColorInput {
  const value = raw.trim();
  if (!value) return { mode, raw, error: "Enter a color value." };

  if (mode === "pantone") {
    const pantoneCode = parsePantoneInput(value);
    return pantoneCode
      ? { mode, raw, pantoneCode }
      : { mode, raw, error: "Enter a Pantone C number, like 185 C or PMS 185." };
  }

  if (mode === "hex") {
    const rgb = hexToRgb(value);
    return rgb ? { mode, raw, rgb } : { mode, raw, error: "Enter a HEX color like #e8112d." };
  }

  if (mode === "rgb") {
    const rgb = parseRgbInput(value);
    return rgb ? { mode, raw, rgb } : { mode, raw, error: "Enter RGB as three 0-255 numbers." };
  }

  const rgb = parseCmykInput(value);
  return rgb ? { mode, raw, rgb } : { mode, raw, error: "Enter CMYK as four 0-100 numbers." };
}
