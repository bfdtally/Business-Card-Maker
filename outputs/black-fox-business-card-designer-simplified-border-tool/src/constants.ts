export type Orientation = 'landscape' | 'portrait';
export type CardColor = 'black' | 'blue' | 'pink' | 'gold';

export const CARD_DPI = 300;
export const CARD_SIZE = {
  landscape: { widthIn: 3.5, heightIn: 2 },
  portrait: { widthIn: 2, heightIn: 3.5 },
} as const;

export const SAFE_AREA_IN = 0.125;

export const ENGRAVING_VALIDATION = {
  safeMarginIn: SAFE_AREA_IN,
  minimumTextHeightIn: 0.07,
  recommendedTextHeightIn: 0.09,
  minimumLineWidthIn: 0.004,
  recommendedLineWidthIn: 0.008,
  minimumRasterPpi: 250,
  recommendedRasterPpi: 300,
  minimumQrSizeIn: 0.55,
  recommendedQrSizeIn: 0.7,
  poorContrastRatio: 2.5,
} as const;

export const EXPORT_DEFAULTS = {
  pngDpi: 600,
  svgArtworkColor: '#000000',
  invertedArtworkColor: '#ffffff',
  proofDpi: 300,
} as const;

export function cardSizeForOrientation(orientation: Orientation) {
  return CARD_SIZE[orientation];
}

export function pxFromInches(inches: number, dpi = CARD_DPI) {
  return inches * dpi;
}

export function inchesFromPx(pixels: number, dpi = CARD_DPI) {
  return pixels / dpi;
}
