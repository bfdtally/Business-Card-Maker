"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDesign = validateDesign;
const constants_1 = require("./constants");
function validateDesign(input) {
    const findings = [];
    const safePx = constants_1.ENGRAVING_VALIDATION.safeMarginIn * 300;
    input.objects.forEach((object) => {
        const right = object.left + object.width;
        const bottom = object.top + object.height;
        if (object.left < 0 || object.top < 0 || right > input.cardWidthPx || bottom > input.cardHeightPx) {
            findings.push({ severity: 'Error', message: 'Object is outside the finished card boundary.', objectId: object.id });
        }
        if (object.left < safePx || object.top < safePx || right > input.cardWidthPx - safePx || bottom > input.cardHeightPx - safePx) {
            findings.push({ severity: 'Warning', message: 'Object sits inside the unsafe edge margin.', objectId: object.id });
        }
        if (object.fontSize && (0, constants_1.inchesFromPx)(object.fontSize) < constants_1.ENGRAVING_VALIDATION.minimumTextHeightIn) {
            findings.push({ severity: 'Warning', message: 'Text may be too small for dependable engraving.', objectId: object.id });
        }
        if (object.strokeWidth && (0, constants_1.inchesFromPx)(object.strokeWidth) < constants_1.ENGRAVING_VALIDATION.minimumLineWidthIn) {
            findings.push({ severity: 'Warning', message: 'Line or stroke may be too thin for engraving.', objectId: object.id });
        }
        if (object.rasterPpi && object.rasterPpi < constants_1.ENGRAVING_VALIDATION.minimumRasterPpi) {
            findings.push({ severity: 'Warning', message: 'Raster image appears low-resolution for engraving.', objectId: object.id });
        }
        if (object.qrSizeIn && object.qrSizeIn < constants_1.ENGRAVING_VALIDATION.minimumQrSizeIn) {
            findings.push({ severity: 'Error', message: 'QR code is too small for dependable engraving.', objectId: object.id });
        }
        if (object.hidden) {
            findings.push({ severity: 'Recommendation', message: 'Hidden object will not be visible in the proof or export.', objectId: object.id });
        }
        if (object.fontFamily && !/Arial|Courier|Georgia|Trebuchet|sans-serif|serif|monospace/i.test(object.fontFamily)) {
            findings.push({ severity: 'Recommendation', message: 'Text font may change appearance on another computer unless installed there.', objectId: object.id });
        }
    });
    if (!input.backHasArtwork)
        findings.push({ severity: 'Recommendation', message: 'Back side is empty.' });
    if (!input.objects.length)
        findings.push({ severity: 'Warning', message: 'Current side has no artwork.' });
    return findings;
}
