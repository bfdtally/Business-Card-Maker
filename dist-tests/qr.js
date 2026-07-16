"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrPayload = qrPayload;
exports.makeQrSvg = makeQrSvg;
exports.makeQrMatrix = makeQrMatrix;
const qrcode_generator_1 = __importDefault(require("qrcode-generator"));
function qrPayload(type, value) {
    if (type === 'email')
        return `mailto:${value}`;
    if (type === 'phone')
        return `tel:${value}`;
    if (type === 'sms')
        return `sms:${value}`;
    if (type === 'wifi')
        return `WIFI:T:WPA;S:${value};P:password;;`;
    if (type === 'vcard')
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${value}\nEND:VCARD`;
    return value;
}
function makeQrSvg(payload, sizePx, quietZone = 4, correction = 'M') {
    const qr = (0, qrcode_generator_1.default)(0, correction);
    qr.addData(payload || ' ');
    qr.make();
    const modules = qr.getModuleCount();
    const total = modules + quietZone * 2;
    const cell = sizePx / total;
    const rects = [];
    for (let y = 0; y < modules; y += 1) {
        for (let x = 0; x < modules; x += 1) {
            if (qr.isDark(y, x)) {
                rects.push(`<rect x="${(x + quietZone) * cell}" y="${(y + quietZone) * cell}" width="${cell}" height="${cell}"/>`);
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" data-qr-correction="${correction}"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects.join('')}</g></svg>`;
}
function makeQrMatrix(payload, correction = 'M') {
    const qr = (0, qrcode_generator_1.default)(0, correction);
    qr.addData(payload || ' ');
    qr.make();
    const count = qr.getModuleCount();
    return {
        count,
        isDark(row, col) {
            return qr.isDark(row, col);
        },
    };
}
