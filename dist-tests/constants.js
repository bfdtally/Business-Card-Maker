"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPORT_DEFAULTS = exports.ENGRAVING_VALIDATION = exports.SAFE_AREA_IN = exports.CARD_SIZE = exports.CARD_DPI = void 0;
exports.cardSizeForOrientation = cardSizeForOrientation;
exports.pxFromInches = pxFromInches;
exports.inchesFromPx = inchesFromPx;
exports.CARD_DPI = 300;
exports.CARD_SIZE = {
    landscape: { widthIn: 3.5, heightIn: 2 },
    portrait: { widthIn: 2, heightIn: 3.5 },
};
exports.SAFE_AREA_IN = 0.125;
exports.ENGRAVING_VALIDATION = {
    safeMarginIn: exports.SAFE_AREA_IN,
    minimumTextHeightIn: 0.07,
    recommendedTextHeightIn: 0.09,
    minimumLineWidthIn: 0.004,
    recommendedLineWidthIn: 0.008,
    minimumRasterPpi: 250,
    recommendedRasterPpi: 300,
    minimumQrSizeIn: 0.55,
    recommendedQrSizeIn: 0.7,
    poorContrastRatio: 2.5,
};
exports.EXPORT_DEFAULTS = {
    pngDpi: 600,
    svgArtworkColor: '#000000',
    invertedArtworkColor: '#ffffff',
    proofDpi: 300,
};
function cardSizeForOrientation(orientation) {
    return exports.CARD_SIZE[orientation];
}
function pxFromInches(inches, dpi = exports.CARD_DPI) {
    return inches * dpi;
}
function inchesFromPx(pixels, dpi = exports.CARD_DPI) {
    return pixels / dpi;
}
