import { CARD_DPI, cardSizeForOrientation, pxFromInches } from './constants';
import { makeProjectFile, normalizeLaserSvg, sanitizeSvgText } from './exportUtils';
import { makeQrSvg } from './qr';
import { validateDesign } from './validation';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  },
  deepEqual(actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  },
  ok(value: unknown) {
    if (!value) throw new Error('Expected value to be truthy');
  },
  match(value: string, pattern: RegExp) {
    if (!pattern.test(value)) throw new Error(`Expected ${value} to match ${pattern}`);
  },
  doesNotMatch(value: string, pattern: RegExp) {
    if (pattern.test(value)) throw new Error(`Expected ${value} not to match ${pattern}`);
  },
};

const landscape = cardSizeForOrientation('landscape');
assert.equal(landscape.widthIn, 3.5);
assert.equal(landscape.heightIn, 2);
assert.equal(cardSizeForOrientation('portrait').widthIn, 2);
assert.equal(cardSizeForOrientation('portrait').heightIn, 3.5);

const raw = '<svg width="1050" height="600"><rect width="1050" height="600" fill="#111318"/><g id="grid"><line stroke="#fff"/></g><circle cx="10" cy="10" r="4" fill="#ddd" stroke="#ddd"/></svg>';
const svg = normalizeLaserSvg(raw, { orientation: 'landscape', side: 'front', artworkSvg: raw, mode: 'both' });
assert.match(svg, /width="3\.5in"/);
assert.match(svg, /height="2in"/);
assert.match(svg, /viewBox="0 0 1050 600"/);
assert.doesNotMatch(svg, /#111318/);
assert.doesNotMatch(svg, /id="grid"/);
assert.match(svg, /data-side="front"/);

const backSvg = normalizeLaserSvg('<svg><path d="M0 0L1 1" stroke="red"/></svg>', { orientation: 'landscape', side: 'back', artworkSvg: '<svg/>', includeCardOutline: true });
assert.match(backSvg, /data-side="back"/);
assert.match(backSvg, /id="card-outline"/);

const project = makeProjectFile({ orientation: 'landscape', cardColor: 'black', front: { objects: [1] }, back: { objects: [] }, uploadedGraphics: [], fontInformation: [], borderSettings: {}, objectLayers: [], lockedAndHiddenStates: [], exportPreferences: {} });
assert.equal(project.canvas.dpi, CARD_DPI);
assert.deepEqual(project.front, { objects: [1] });

const unsafe = sanitizeSvgText('<svg><script>alert(1)</script><rect onclick="x()" href="javascript:x"/></svg>');
assert.doesNotMatch(unsafe, /script|onclick|javascript/i);

const borderWidth = pxFromInches(3.5) - pxFromInches(0.1) * 2;
assert.ok(borderWidth <= pxFromInches(3.5));

const qr = makeQrSvg('https://example.com', 180, 4, 'H');
assert.match(qr, /data-qr-correction="H"/);
assert.match(qr, /<rect/);

const findings = validateDesign({
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
const redo: string[] = [];
history.push('b');
redo.push(history.pop()!);
history.push(redo.pop()!);
assert.deepEqual(history, ['a', 'b']);

console.log('All Black Fox tests passed.');
