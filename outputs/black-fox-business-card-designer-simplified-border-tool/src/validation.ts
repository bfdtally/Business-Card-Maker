import { ENGRAVING_VALIDATION, inchesFromPx } from './constants';

export type ValidationSeverity = 'Error' | 'Warning' | 'Recommendation';

export type ValidationObject = {
  id?: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  strokeWidth?: number;
  fontSize?: number;
  hidden?: boolean;
  rasterPpi?: number;
  qrSizeIn?: number;
  fontFamily?: string;
};

export type ValidationFinding = {
  severity: ValidationSeverity;
  message: string;
  objectId?: string;
};

export function validateDesign(input: {
  cardWidthPx: number;
  cardHeightPx: number;
  objects: ValidationObject[];
  backHasArtwork: boolean;
}) {
  const findings: ValidationFinding[] = [];
  const safePx = ENGRAVING_VALIDATION.safeMarginIn * 300;
  input.objects.forEach((object) => {
    const right = object.left + object.width;
    const bottom = object.top + object.height;
    if (object.left < 0 || object.top < 0 || right > input.cardWidthPx || bottom > input.cardHeightPx) {
      findings.push({ severity: 'Error', message: 'Object is outside the finished card boundary.', objectId: object.id });
    }
    if (object.left < safePx || object.top < safePx || right > input.cardWidthPx - safePx || bottom > input.cardHeightPx - safePx) {
      findings.push({ severity: 'Warning', message: 'Object sits inside the unsafe edge margin.', objectId: object.id });
    }
    if (object.fontSize && inchesFromPx(object.fontSize) < ENGRAVING_VALIDATION.minimumTextHeightIn) {
      findings.push({ severity: 'Warning', message: 'Text may be too small for dependable engraving.', objectId: object.id });
    }
    if (object.strokeWidth && inchesFromPx(object.strokeWidth) < ENGRAVING_VALIDATION.minimumLineWidthIn) {
      findings.push({ severity: 'Warning', message: 'Line or stroke may be too thin for engraving.', objectId: object.id });
    }
    if (object.rasterPpi && object.rasterPpi < ENGRAVING_VALIDATION.minimumRasterPpi) {
      findings.push({ severity: 'Warning', message: 'Raster image appears low-resolution for engraving.', objectId: object.id });
    }
    if (object.qrSizeIn && object.qrSizeIn < ENGRAVING_VALIDATION.minimumQrSizeIn) {
      findings.push({ severity: 'Error', message: 'QR code is too small for dependable engraving.', objectId: object.id });
    }
    if (object.hidden) {
      findings.push({ severity: 'Recommendation', message: 'Hidden object will not be visible in the proof or export.', objectId: object.id });
    }
    if (object.fontFamily && !/Arial|Courier|Georgia|Trebuchet|sans-serif|serif|monospace/i.test(object.fontFamily)) {
      findings.push({ severity: 'Recommendation', message: 'Text font may change appearance on another computer unless installed there.', objectId: object.id });
    }
  });
  if (!input.backHasArtwork) findings.push({ severity: 'Recommendation', message: 'Back side is empty.' });
  if (!input.objects.length) findings.push({ severity: 'Warning', message: 'Current side has no artwork.' });
  return findings;
}
