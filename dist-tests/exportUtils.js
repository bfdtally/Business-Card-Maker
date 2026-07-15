"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSvgText = sanitizeSvgText;
exports.stripEditorArtifacts = stripEditorArtifacts;
exports.normalizeLaserSvg = normalizeLaserSvg;
exports.makeProjectFile = makeProjectFile;
exports.makeStoredZip = makeStoredZip;
const constants_1 = require("./constants");
function sanitizeSvgText(svg) {
    return svg
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\s(?:href|xlink:href)\s*=\s*(['"])\s*(?:javascript:|data:text\/html|https?:|file:|blob:)[\s\S]*?\1/gi, '');
}
function stripEditorArtifacts(svg) {
    return svg
        .replace(/<rect[^>]*(?:blackFoxGuide|safe|grid|ruler)[^>]*\/?>/gi, '')
        .replace(/<g[^>]*(?:selection|controls|rulers|grid|safe-area)[^>]*>[\s\S]*?<\/g>/gi, '')
        .replace(/<desc>Created with Fabric\.js[^<]*<\/desc>/gi, '');
}
function normalizeLaserSvg(rawSvg, options) {
    const size = (0, constants_1.cardSizeForOrientation)(options.orientation);
    const widthPx = (0, constants_1.pxFromInches)(size.widthIn);
    const heightPx = (0, constants_1.pxFromInches)(size.heightIn);
    const color = options.invert ? constants_1.EXPORT_DEFAULTS.invertedArtworkColor : constants_1.EXPORT_DEFAULTS.svgArtworkColor;
    let body = stripEditorArtifacts(sanitizeSvgText(rawSvg));
    body = body.replace(/<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
    body = body.replace(/fill="(?!none|transparent)[^"]*"/gi, options.mode === 'strokes' ? 'fill="none"' : `fill="${color}"`);
    body = body.replace(/stroke="(?!none|transparent)[^"]*"/gi, options.mode === 'fills' ? 'stroke="none"' : `stroke="${color}"`);
    body = body.replace(/style="([^"]*)"/gi, (_match, style) => {
        let next = style
            .replace(/fill:\s*(?!none|transparent)[^;"]+/gi, options.mode === 'strokes' ? 'fill:none' : `fill:${color}`)
            .replace(/stroke:\s*(?!none|transparent)[^;"]+/gi, options.mode === 'fills' ? 'stroke:none' : `stroke:${color}`);
        if (options.flattenTransforms)
            next = next.replace(/transform:[^;"]+;?/gi, '');
        return `style="${next}"`;
    });
    if (options.flattenTransforms)
        body = body.replace(/\stransform="[^"]*"/gi, '');
    const outline = options.includeCardOutline
        ? `<g id="card-outline" data-layer="non-engraving-reference"><rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="none" stroke="${color}" stroke-width="1"/></g>`
        : '';
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size.widthIn}in" height="${size.heightIn}in" viewBox="0 0 ${widthPx} ${heightPx}" data-side="${options.side}">`,
        '<g id="artwork">',
        '<g id="text"></g>',
        '<g id="graphics"></g>',
        '<g id="border"></g>',
        body,
        '</g>',
        outline,
        '</svg>',
    ].join('\n');
}
function makeProjectFile(payload) {
    const size = (0, constants_1.cardSizeForOrientation)(payload.orientation);
    return {
        app: 'Black Fox Business Card Designer',
        version: 1,
        savedAt: new Date().toISOString(),
        canvas: { dpi: constants_1.CARD_DPI, widthIn: size.widthIn, heightIn: size.heightIn },
        ...payload,
    };
}
function crc32(text) {
    let crc = -1;
    for (let i = 0; i < text.length; i += 1) {
        crc ^= text.charCodeAt(i);
        for (let j = 0; j < 8; j += 1)
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
}
function u16(value) {
    return String.fromCharCode(value & 255, (value >>> 8) & 255);
}
function u32(value) {
    return String.fromCharCode(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}
function makeStoredZip(files) {
    let offset = 0;
    let local = '';
    let central = '';
    files.forEach((file) => {
        const checksum = crc32(file.content);
        local += `PK\x03\x04${u16(20)}${u16(0)}${u16(0)}${u16(0)}${u16(0)}${u32(checksum)}${u32(file.content.length)}${u32(file.content.length)}${u16(file.name.length)}${u16(0)}${file.name}${file.content}`;
        central += `PK\x01\x02${u16(20)}${u16(20)}${u16(0)}${u16(0)}${u16(0)}${u16(0)}${u32(checksum)}${u32(file.content.length)}${u32(file.content.length)}${u16(file.name.length)}${u16(0)}${u16(0)}${u16(0)}${u16(0)}${u32(0)}${u32(offset)}${file.name}`;
        offset = local.length;
    });
    const end = `PK\x05\x06${u16(0)}${u16(0)}${u16(files.length)}${u16(files.length)}${u32(central.length)}${u32(local.length)}${u16(0)}`;
    const binary = local + central + end;
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i) & 255;
    return bytes;
}
