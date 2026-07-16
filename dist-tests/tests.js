"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const exportUtils_1 = require("./exportUtils");
const qr_1 = require("./qr");
const validation_1 = require("./validation");
const assert = {
    equal(actual, expected) {
        if (actual !== expected)
            throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
    },
    deepEqual(actual, expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    ok(value) {
        if (!value)
            throw new Error('Expected value to be truthy');
    },
    match(value, pattern) {
        if (!pattern.test(value))
            throw new Error(`Expected ${value} to match ${pattern}`);
    },
    doesNotMatch(value, pattern) {
        if (pattern.test(value))
            throw new Error(`Expected ${value} not to match ${pattern}`);
    },
};
const landscape = (0, constants_1.cardSizeForOrientation)('landscape');
assert.equal(landscape.widthIn, 3.5);
assert.equal(landscape.heightIn, 2);
assert.equal((0, constants_1.cardSizeForOrientation)('portrait').widthIn, 2);
assert.equal((0, constants_1.cardSizeForOrientation)('portrait').heightIn, 3.5);
const raw = '<svg width="1050" height="600"><rect width="1050" height="600" fill="#111318"/><g id="grid"><line stroke="#fff"/></g><circle cx="10" cy="10" r="4" fill="#ddd" stroke="#ddd"/></svg>';
const svg = (0, exportUtils_1.normalizeLaserSvg)(raw, { orientation: 'landscape', side: 'front', artworkSvg: raw, mode: 'both' });
assert.match(svg, /width="3\.5in"/);
assert.match(svg, /height="2in"/);
assert.match(svg, /viewBox="0 0 1050 600"/);
assert.doesNotMatch(svg, /#111318/);
assert.doesNotMatch(svg, /id="grid"/);
assert.match(svg, /data-side="front"/);
const backSvg = (0, exportUtils_1.normalizeLaserSvg)('<svg><path d="M0 0L1 1" stroke="red"/></svg>', { orientation: 'landscape', side: 'back', artworkSvg: '<svg/>', includeCardOutline: true });
assert.match(backSvg, /data-side="back"/);
assert.match(backSvg, /id="card-outline"/);
const project = (0, exportUtils_1.makeProjectFile)({ orientation: 'landscape', cardColor: 'black', front: { objects: [1] }, back: { objects: [] }, uploadedGraphics: [], fontInformation: [], borderSettings: {}, objectLayers: [], lockedAndHiddenStates: [], exportPreferences: {} });
assert.equal(project.canvas.dpi, constants_1.CARD_DPI);
assert.deepEqual(project.front, { objects: [1] });
const unsafe = (0, exportUtils_1.sanitizeSvgText)('<svg><script>alert(1)</script><rect onclick="x()" href="javascript:x"/></svg>');
assert.doesNotMatch(unsafe, /script|onclick|javascript/i);
const borderWidth = (0, constants_1.pxFromInches)(3.5) - (0, constants_1.pxFromInches)(0.1) * 2;
assert.ok(borderWidth <= (0, constants_1.pxFromInches)(3.5));
const qr = (0, qr_1.makeQrSvg)('https://example.com', 180, 4, 'H');
assert.match(qr, /data-qr-correction="H"/);
assert.match(qr, /<rect/);
const findings = (0, validation_1.validateDesign)({
    cardWidthPx: 1050,
    cardHeightPx: 600,
    backHasArtwork: false,
    objects: [
        { id: 'outside', type: 'rect', left: -1, top: 0, width: 10, height: 10 },
        { id: 'tiny-line', type: 'line', left: 200, top: 200, width: 100, height: 1, strokeWidth: 0.5 },
        { id: 'tiny-qr', type: 'qr', left: 200, top: 200, width: 100, height: 100, qrSizeIn: 0.3 },
    ],
});
assert.ok(findings.some((f) => f.message.includes('outside')));
assert.ok(findings.some((f) => f.message.includes('thin')));
assert.ok(findings.some((f) => f.message.includes('QR')));
assert.ok(findings.some((f) => f.message.includes('Back side')));
const history = ['a'];
const redo = [];
history.push('b');
redo.push(history.pop());
history.push(redo.pop());
assert.deepEqual(history, ['a', 'b']);
console.log('All Black Fox tests passed.');
