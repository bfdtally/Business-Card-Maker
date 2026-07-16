import qrcode from 'qrcode-generator';

export type QrType = 'website' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard';
export type QrCorrection = 'L' | 'M' | 'Q' | 'H';

export function qrPayload(type: QrType, value: string) {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value}`;
  if (type === 'sms') return `sms:${value}`;
  if (type === 'wifi') return `WIFI:T:WPA;S:${value};P:password;;`;
  if (type === 'vcard') return `BEGIN:VCARD\nVERSION:3.0\nFN:${value}\nEND:VCARD`;
  return value;
}

export function makeQrSvg(payload: string, sizePx: number, quietZone = 4, correction: QrCorrection = 'M') {
  const qr = qrcode(0, correction);
  qr.addData(payload || ' ');
  qr.make();
  const modules = qr.getModuleCount();
  const total = modules + quietZone * 2;
  const cell = sizePx / total;
  const rects: string[] = [];
  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      if (qr.isDark(y, x)) {
        rects.push(`<rect x="${(x + quietZone) * cell}" y="${(y + quietZone) * cell}" width="${cell}" height="${cell}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" data-qr-correction="${correction}"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects.join('')}</g></svg>`;
}

export function makeQrMatrix(payload: string, correction: QrCorrection = 'M') {
  const qr = qrcode(0, correction);
  qr.addData(payload || ' ');
  qr.make();
  const count = qr.getModuleCount();
  return {
    count,
    isDark(row: number, col: number) {
      return qr.isDark(row, col);
    },
  };
}
