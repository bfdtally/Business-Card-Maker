import {
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalDistributeCenter,
  ArchiveRestore,
  Bold,
  BringToFront,
  CaseSensitive,
  Circle,
  Copy,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Grid3X3,
  Group,
  Image as ImageIcon,
  ImageUp,
  Italic,
  Layers,
  Lock,
  Maximize,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Palette,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Scissors,
  SendToBack,
  Square,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Unlock,
  Underline,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveSelection,
  Canvas,
  Circle as FabricCircle,
  FabricImage,
  FabricObject,
  Group as FabricGroup,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  TEvent,
  Textbox,
  Triangle,
  filters,
  loadSVGFromString,
  util,
} from 'fabric';
import { CARD_DPI, ENGRAVING_VALIDATION, EXPORT_DEFAULTS, SAFE_AREA_IN as SAFE_AREA_IN_CONST } from './constants';
import { makeProjectFile, makeStoredZip, normalizeLaserSvg, type ProjectFilePayload, type SvgExportMode } from './exportUtils';
import { makeQrMatrix, makeQrSvg, qrPayload, type QrCorrection, type QrType } from './qr';
import { validateDesign, type ValidationFinding } from './validation';

type FabricEvent = TEvent & { target?: FabricObject };

type Orientation = 'landscape' | 'portrait';
type CardColor = 'black' | 'blue' | 'pink' | 'gold';
type EngraveMode = 'auto' | 'light' | 'dark';
type Side = 'front' | 'back';
type TextKind = 'name' | 'title' | 'business' | 'phone' | 'email' | 'website' | 'address' | 'custom';
type ShapeKind = 'rect' | 'roundRect' | 'circle' | 'oval' | 'line' | 'dashedLine' | 'hDivider' | 'vDivider' | 'diamond' | 'hexagon' | 'star';
type BorderCategory =
  | 'Simple line'
  | 'Double line'
  | 'Rounded rectangle'
  | 'Corner accents'
  | 'Art Deco'
  | 'Geometric'
  | 'Floral'
  | 'Elegant'
  | 'Technology'
  | 'Circuit board'
  | 'Industrial'
  | 'African-inspired geometric'
  | 'Minimal'
  | 'Corporate'
  | 'Decorative divider';
type ProjectRecord = {
  id: string;
  name: string;
  updatedAt: number;
  orientation: Orientation;
  cardColor: CardColor;
  engravingMode: EngraveMode;
  front: unknown;
  back: unknown;
};

type SelectionState = {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  charSpacing?: number;
  lineHeight?: number;
  opacity: number;
  isImage?: boolean;
  isRaster?: boolean;
  imageBrightness?: number;
  imageContrast?: number;
  imageGrayscale?: boolean;
  imageThreshold?: number;
  imagePrepared?: boolean;
  imageCropInset?: number;
  imageWarning?: string;
  visible: boolean;
  locked: boolean;
};

const STORAGE_KEY = 'black-fox-card-projects';
const DPI = CARD_DPI;
const DEFAULT_LANDSCAPE = { width: 3.5, height: 2 };
const SAFE_AREA_IN = SAFE_AREA_IN_CONST;
const GRID_IN = 0.125;
const SNAP_TOLERANCE = 8;
const ENGRAVE_LIGHT = '#d8dbe0';
const ENGRAVE_DARK = '#161616';
const DEFAULT_FONT = 'Inter, Arial, sans-serif';

FabricObject.customProperties = [
  'blackFoxLocked',
  'blackFoxGuide',
  'blackFoxUploadKind',
  'blackFoxOriginalSrc',
  'blackFoxOriginalName',
  'blackFoxOriginalWidth',
  'blackFoxOriginalHeight',
  'blackFoxBrightness',
  'blackFoxContrast',
  'blackFoxGrayscale',
  'blackFoxThreshold',
  'blackFoxPrepared',
  'blackFoxCropInset',
  'blackFoxLowResWarning',
  'blackFoxFontDataUrl',
  'blackFoxFontNotice',
  'blackFoxBorderPreset',
  'blackFoxQrSizeIn',
  'blackFoxQrPayload',
  'blackFoxQrBackground',
  'blackFoxValidationId',
];

const BROWSER_SAFE_FONTS = [
  DEFAULT_FONT,
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Garamond, Georgia, serif',
  'Trebuchet MS, sans-serif',
  'Courier New, monospace',
  'Impact, Haettenschweiler, sans-serif',
];

const FONT_LIBRARY: Record<string, { family: string; css: string; fallback: string }[]> = {
  'Sans Serif': [
    { family: 'Inter', css: 'Inter:wght@400;600;800', fallback: 'Arial, sans-serif' },
    { family: 'Montserrat', css: 'Montserrat:wght@400;600;800', fallback: 'Arial, sans-serif' },
    { family: 'Source Sans 3', css: 'Source+Sans+3:wght@400;600;800', fallback: 'Arial, sans-serif' },
  ],
  Serif: [
    { family: 'Merriweather', css: 'Merriweather:wght@400;700', fallback: 'Georgia, serif' },
    { family: 'Cormorant Garamond', css: 'Cormorant+Garamond:wght@400;700', fallback: 'Georgia, serif' },
    { family: 'Libre Baskerville', css: 'Libre+Baskerville:wght@400;700', fallback: 'Georgia, serif' },
  ],
  Script: [
    { family: 'Playfair Display', css: 'Playfair+Display:wght@400;700', fallback: 'Georgia, serif' },
    { family: 'Great Vibes', css: 'Great+Vibes', fallback: 'cursive' },
    { family: 'Pacifico', css: 'Pacifico', fallback: 'cursive' },
  ],
  Handwritten: [
    { family: 'Caveat', css: 'Caveat:wght@400;700', fallback: 'cursive' },
    { family: 'Patrick Hand', css: 'Patrick+Hand', fallback: 'cursive' },
    { family: 'Kalam', css: 'Kalam:wght@400;700', fallback: 'cursive' },
  ],
  'Bold Display': [
    { family: 'Bebas Neue', css: 'Bebas+Neue', fallback: 'Impact, sans-serif' },
    { family: 'Oswald', css: 'Oswald:wght@400;700', fallback: 'Arial, sans-serif' },
    { family: 'Archivo Black', css: 'Archivo+Black', fallback: 'Arial Black, sans-serif' },
  ],
  Elegant: [
    { family: 'Cinzel', css: 'Cinzel:wght@400;700', fallback: 'Georgia, serif' },
    { family: 'Josefin Sans', css: 'Josefin+Sans:wght@400;700', fallback: 'Arial, sans-serif' },
    { family: 'Lora', css: 'Lora:wght@400;700', fallback: 'Georgia, serif' },
  ],
  Industrial: [
    { family: 'Rajdhani', css: 'Rajdhani:wght@400;700', fallback: 'Arial, sans-serif' },
    { family: 'Barlow Condensed', css: 'Barlow+Condensed:wght@400;700', fallback: 'Arial Narrow, sans-serif' },
    { family: 'Teko', css: 'Teko:wght@400;700', fallback: 'Arial, sans-serif' },
  ],
  Monospace: [
    { family: 'Roboto Mono', css: 'Roboto+Mono:wght@400;700', fallback: 'Courier New, monospace' },
    { family: 'Space Mono', css: 'Space+Mono:wght@400;700', fallback: 'Courier New, monospace' },
    { family: 'IBM Plex Mono', css: 'IBM+Plex+Mono:wght@400;700', fallback: 'Courier New, monospace' },
  ],
};

const BORDER_CATEGORIES: BorderCategory[] = [
  'Simple line',
  'Double line',
  'Rounded rectangle',
  'Corner accents',
  'Art Deco',
  'Geometric',
  'Floral',
  'Elegant',
  'Technology',
  'Circuit board',
  'Industrial',
  'African-inspired geometric',
  'Minimal',
  'Corporate',
  'Decorative divider',
];

const CARD_COLORS: Record<CardColor, { label: string; color: string }> = {
  black: { label: 'Black', color: '#111318' },
  blue: { label: 'Blue', color: '#2451a3' },
  pink: { label: 'Pink', color: '#d96b9b' },
  gold: { label: 'Gold', color: '#d9b45d' },
};

const px = (inches: number) => inches * DPI;
const inches = (pixels: number) => pixels / DPI;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const fmt = (value: number) => Number(value.toFixed(3));
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const BORDER_STYLE_COUNT = 12;

type BorderStyleKind =
  | 'plain'
  | 'double'
  | 'side-bars'
  | 'top-bottom'
  | 'corner-caps'
  | 'corner-steps'
  | 'corner-dots'
  | 'center-notch'
  | 'mid-dots'
  | 'art-deco'
  | 'diagonal-cuts'
  | 'short-rails'
  | 'inner-corners'
  | 'diamond-marks'
  | 'tech-nodes'
  | 'circuit'
  | 'industrial-slash'
  | 'bracket'
  | 'floral'
  | 'wave'
  | 'minimal-gap'
  | 'bold-corners'
  | 'triple'
  | 'divider';

const BORDER_STYLE_KINDS: BorderStyleKind[] = [
  'plain',
  'double',
  'corner-caps',
  'art-deco',
  'floral',
  'wave',
  'corner-steps',
  'inner-corners',
  'bold-corners',
  'diagonal-cuts',
  'bracket',
  'side-bars',
  'short-rails',
];

const BORDER_STYLE_LABELS: Record<BorderStyleKind, string> = {
  plain: 'Simple frame',
  double: 'Inner line frame',
  'side-bars': 'Side ornaments',
  'top-bottom': 'Top accent',
  'corner-caps': 'Clipped corners',
  'corner-steps': 'Fine pin corners',
  'corner-dots': 'Dot corner',
  'center-notch': 'Center notch',
  'mid-dots': 'Midpoint dots',
  'art-deco': 'Scroll caps',
  'diagonal-cuts': 'Angled corners',
  'short-rails': 'Broken rail frame',
  'inner-corners': 'Inset corner frame',
  'diamond-marks': 'Diamond marks',
  'tech-nodes': 'Tech nodes',
  circuit: 'Circuit line',
  'industrial-slash': 'Industrial slash',
  bracket: 'Side bracket frame',
  floral: 'Floral corners',
  wave: 'Ornate scrolls',
  'minimal-gap': 'Dashed minimal',
  'bold-corners': 'Block corners',
  triple: 'Triple line',
  divider: 'Divider frame',
};

function borderPreviewSvg(index: number, category: BorderCategory) {
  const kind = BORDER_STYLE_KINDS[index % BORDER_STYLE_KINDS.length];
  const rounded = category === 'Rounded rectangle' || category === 'Elegant' || category === 'Corporate';
  const dash = ['Technology', 'Circuit board'].includes(category) || kind === 'minimal-gap' ? ' stroke-dasharray="5 3"' : '';
  const accent = '#176a4c';
  const muted = '#9eb5aa';
  const rect = `<rect x="10" y="10" width="76" height="42" rx="${rounded ? 9 : 2}" fill="none" stroke="${accent}" stroke-width="3"${dash}/>`;
  const inner = category === 'Double line' || ['double', 'triple', 'inner-corners'].includes(kind) ? `<rect x="16" y="16" width="64" height="30" rx="${rounded ? 6 : 1}" fill="none" stroke="${muted}" stroke-width="1.6"/>` : '';
  const corners = ['Corner accents', 'Art Deco', 'Industrial'].includes(category)
    ? '<path d="M10 24V10h14M72 10h14v14M10 38v14h14M72 52h14V38" fill="none" stroke="#176a4c" stroke-width="3" stroke-linecap="round"/>'
    : '';
  const geometric = ['Geometric', 'African-inspired geometric'].includes(category)
    ? '<path d="M18 10l8 8 8-8M42 10l8 8 8-8M66 10l8 8 8-8M18 52l8-8 8 8M42 52l8-8 8 8M66 52l8-8 8 8" fill="none" stroke="#176a4c" stroke-width="2" stroke-linejoin="round"/>'
    : '';
  const floral = ['Floral', 'Elegant'].includes(category)
    ? '<path d="M20 21c8-12 18-12 26 0M50 41c8 12 18 12 26 0" fill="none" stroke="#176a4c" stroke-width="2" stroke-linecap="round"/>'
    : '';
  const tech = ['Technology', 'Circuit board'].includes(category)
    ? '<path d="M26 10v12h16M62 52V40H46" fill="none" stroke="#176a4c" stroke-width="2.4" stroke-linecap="round"/><circle cx="42" cy="22" r="3" fill="#176a4c"/><circle cx="46" cy="40" r="3" fill="#176a4c"/>'
    : '';
  const divider = category === 'Decorative divider'
    ? '<path d="M12 31h28M56 31h28" fill="none" stroke="#176a4c" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="31" r="5" fill="none" stroke="#176a4c" stroke-width="2"/>'
    : '';
  const styleArt: Record<BorderStyleKind, string> = {
    plain: '',
    double: '',
    'side-bars': '<path d="M16 24v14M80 24v14" fill="none" stroke="#9eb5aa" stroke-width="2.5" stroke-linecap="round"/>',
    'top-bottom': '<path d="M30 17h36M30 45h36" fill="none" stroke="#9eb5aa" stroke-width="2.4" stroke-linecap="round"/>',
    'corner-caps': '<path d="M10 24V10h14M72 10h14v14M10 38v14h14M72 52h14V38" fill="none" stroke="#176a4c" stroke-width="3" stroke-linecap="round"/>',
    'corner-steps': '<path d="M15 24v-9h9M72 15h9v9M15 38v9h9M72 47h9v-9" fill="none" stroke="#9eb5aa" stroke-width="2.3" stroke-linecap="round"/>',
    'corner-dots': '<circle cx="18" cy="18" r="3" fill="#176a4c"/><circle cx="78" cy="18" r="3" fill="#176a4c"/><circle cx="18" cy="44" r="3" fill="#176a4c"/><circle cx="78" cy="44" r="3" fill="#176a4c"/>',
    'center-notch': '<path d="M42 10h12M42 52h12M10 25v12M86 25v12" fill="none" stroke="#9eb5aa" stroke-width="2.4" stroke-linecap="round"/>',
    'mid-dots': '<circle cx="48" cy="10" r="3" fill="#176a4c"/><circle cx="48" cy="52" r="3" fill="#176a4c"/><circle cx="10" cy="31" r="3" fill="#176a4c"/><circle cx="86" cy="31" r="3" fill="#176a4c"/>',
    'art-deco': '<path d="M28 10l8 8h24l8-8M28 52l8-8h24l8 8" fill="none" stroke="#9eb5aa" stroke-width="2.1" stroke-linejoin="round"/>',
    'diagonal-cuts': '<path d="M12 25l15-15M69 10l15 15M12 37l15 15M69 52l15-15" fill="none" stroke="#9eb5aa" stroke-width="2.2" stroke-linecap="round"/>',
    'short-rails': '<path d="M20 18h20M56 18h20M20 44h20M56 44h20" fill="none" stroke="#9eb5aa" stroke-width="2.2" stroke-linecap="round"/>',
    'inner-corners': '<path d="M22 27V22h8M66 22h8v5M22 35v5h8M66 40h8v-5" fill="none" stroke="#176a4c" stroke-width="2.2" stroke-linecap="round"/>',
    'diamond-marks': '<path d="M48 14l5 5-5 5-5-5zM48 38l5 5-5 5-5-5z" fill="none" stroke="#176a4c" stroke-width="2"/>',
    'tech-nodes': '<path d="M24 10v12h16M72 52V40H56" fill="none" stroke="#9eb5aa" stroke-width="2.2"/><circle cx="40" cy="22" r="3" fill="#176a4c"/><circle cx="56" cy="40" r="3" fill="#176a4c"/>',
    circuit: '<path d="M16 31h20v-9h22v18h22" fill="none" stroke="#9eb5aa" stroke-width="2.2"/><circle cx="36" cy="22" r="3" fill="#176a4c"/><circle cx="58" cy="40" r="3" fill="#176a4c"/>',
    'industrial-slash': '<path d="M24 10l10 10M46 10l10 10M68 10l10 10M24 52l10-10M46 52l10-10M68 52l10-10" fill="none" stroke="#9eb5aa" stroke-width="2.1" stroke-linecap="round"/>',
    bracket: '<path d="M26 16H16v30h10M70 16h10v30H70" fill="none" stroke="#176a4c" stroke-width="2.6" stroke-linecap="round"/>',
    floral: '<path d="M20 31c10-16 20-16 30 0M46 31c10 16 20 16 30 0" fill="none" stroke="#9eb5aa" stroke-width="2" stroke-linecap="round"/>',
    wave: '<path d="M18 17c10 8 18 8 28 0s18-8 32 0M18 45c10-8 18-8 28 0s18 8 32 0" fill="none" stroke="#9eb5aa" stroke-width="2" stroke-linecap="round"/>',
    'minimal-gap': '<path d="M38 10h20M38 52h20" fill="none" stroke="#176a4c" stroke-width="3" stroke-linecap="round"/>',
    'bold-corners': '<path d="M10 28V10h18M68 10h18v18M10 34v18h18M68 52h18V34" fill="none" stroke="#176a4c" stroke-width="4" stroke-linecap="round"/>',
    triple: '<rect x="21" y="21" width="54" height="20" rx="1" fill="none" stroke="#d1dfd8" stroke-width="1.2"/>',
    divider: '<path d="M14 31h26M56 31h26" fill="none" stroke="#176a4c" stroke-width="3" stroke-linecap="round"/><path d="M48 24l7 7-7 7-7-7z" fill="none" stroke="#176a4c" stroke-width="2"/>',
  };
  const artwork = divider || (kind === 'divider' ? styleArt.divider : `${rect}${inner}${corners}${geometric}${floral}${tech}${styleArt[kind]}`);
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 62">${artwork}</svg>`)}`;
}

function documentSize(orientation: Orientation) {
  return orientation === 'landscape'
    ? DEFAULT_LANDSCAPE
    : { width: DEFAULT_LANDSCAPE.height, height: DEFAULT_LANDSCAPE.width };
}

function engravingColor(cardColor: CardColor, mode: EngraveMode) {
  if (mode === 'light') return ENGRAVE_LIGHT;
  if (mode === 'dark') return ENGRAVE_DARK;
  return cardColor === 'gold' ? ENGRAVE_DARK : ENGRAVE_LIGHT;
}

function setObjectLock(object: FabricObject, locked: boolean) {
  object.set({
    selectable: !locked,
    evented: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockRotation: locked,
    lockScalingX: locked,
    lockScalingY: locked,
  });
  object.set('blackFoxLocked' as keyof FabricObject, locked as never);
}

function isGuide(object: FabricObject) {
  return Boolean(object.get('blackFoxGuide' as keyof FabricObject));
}

function projectList(): ProjectRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ProjectRecord[];
  } catch {
    return [];
  }
}

function writeProjectList(projects: ProjectRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function custom<T>(object: FabricObject, key: string, fallback: T): T {
  const value = object.get(key as keyof FabricObject);
  return (value === undefined || value === null ? fallback : value) as T;
}

function setCustom(object: FabricObject, key: string, value: unknown) {
  object.set(key as keyof FabricObject, value as never);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function sanitizeSvg(svg: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('This SVG could not be parsed.');
  }
  doc.querySelectorAll('script, foreignObject, iframe, object, embed, audio, video, image, use').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:') || value.includes('data:text/html')) {
        node.removeAttribute(attribute.name);
      }
      if ((name === 'href' || name === 'xlink:href') && /^(https?:|file:|blob:|data:)/.test(value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function imageFromSource(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be loaded.'));
    img.src = src;
  });
}

async function adjustedRasterDataUrl(
  src: string,
  options: { brightness: number; contrast: number; grayscale: boolean; prepared: boolean; threshold: number; cropInset: number },
) {
  const img = await imageFromSource(src);
  const inset = clamp(options.cropInset, 0, 42) / 100;
  const sx = Math.round(img.naturalWidth * inset);
  const sy = Math.round(img.naturalHeight * inset);
  const sw = Math.max(1, img.naturalWidth - sx * 2);
  const sh = Math.max(1, img.naturalHeight - sy * 2);
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh);
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  for (let index = 0; index < data.data.length; index += 4) {
    let r = data.data[index] + options.brightness;
    let g = data.data[index + 1] + options.brightness;
    let b = data.data[index + 2] + options.brightness;
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (options.grayscale || options.prepared) {
      r = gray;
      g = gray;
      b = gray;
    }
    if (options.prepared) {
      const v = gray >= options.threshold ? 255 : 0;
      r = v;
      g = v;
      b = v;
    }
    data.data[index] = clamp(r, 0, 255);
    data.data[index + 1] = clamp(g, 0, 255);
    data.data[index + 2] = clamp(b, 0, 255);
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function polygonPoints(sides: number, radius: number) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

function textPreset(kind: TextKind) {
  const presets: Record<TextKind, { label: string; text: string; size: number; weight?: string }> = {
    name: { label: "Person's name", text: 'Alex Morgan', size: 52, weight: '700' },
    title: { label: 'Job title', text: 'Owner / Laser Specialist', size: 28 },
    business: { label: 'Business name', text: 'Black Fox Engraving', size: 44, weight: '700' },
    phone: { label: 'Phone number', text: '(555) 014-2026', size: 28 },
    email: { label: 'Email address', text: 'hello@blackfox.example', size: 27 },
    website: { label: 'Website', text: 'blackfox.example', size: 30 },
    address: { label: 'Address', text: '123 Maker Street\nRochester, NY', size: 25 },
    custom: { label: 'Custom text', text: 'Custom text', size: 34 },
  };
  return presets[kind];
}

function pdfEscape(value: string) {
  return value.replace(/[()\\]/g, '\\$&');
}

function IconButton({
  title,
  onClick,
  children,
  active,
  disabled,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'active' : ''}`}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function App() {
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<FabricObject[] | null>(null);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const restoringRef = useRef(false);
  const sideDataRef = useRef<Record<Side, unknown | null>>({ front: null, back: null });

  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [side, setSide] = useState<Side>('front');
  const [cardColor, setCardColor] = useState<CardColor>('black');
  const [engravingMode, setEngravingMode] = useState<EngraveMode>('auto');
  const [gridVisible, setGridVisible] = useState(true);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(0.72);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [projectName, setProjectName] = useState('Untitled Card');
  const [savedProjects, setSavedProjects] = useState<ProjectRecord[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(() => localStorage.getItem('black-fox-walkthrough-seen') !== 'true');
  const [highContrast, setHighContrast] = useState(false);
  const [validationFindings, setValidationFindings] = useState<ValidationFinding[]>([]);
  const [pngDpi, setPngDpi] = useState<number>(EXPORT_DEFAULTS.pngDpi);
  const [pngTransparent, setPngTransparent] = useState(false);
  const [exportMockup, setExportMockup] = useState(false);
  const [svgMode, setSvgMode] = useState<SvgExportMode>('both');
  const [svgInvert, setSvgInvert] = useState(false);
  const [svgFlatten, setSvgFlatten] = useState(false);
  const [svgOutline, setSvgOutline] = useState(false);
  const [qrType, setQrType] = useState<QrType>('website');
  const [qrValue, setQrValue] = useState('https://blackfox.example');
  const [qrSize, setQrSize] = useState(0.7);
  const [qrQuietZone, setQrQuietZone] = useState(4);
  const [qrCorrection, setQrCorrection] = useState<QrCorrection>('M');
  const [fontCategory, setFontCategory] = useState('Sans Serif');
  const [uploadedFonts, setUploadedFonts] = useState<string[]>([]);
  const [borderCategory, setBorderCategory] = useState<BorderCategory>('Simple line');
  const [borderMargin, setBorderMargin] = useState(0.1);
  const [borderStroke, setBorderStroke] = useState(0.018);
  const [borderRadius, setBorderRadius] = useState(0.08);
  const [borderDensity, setBorderDensity] = useState(6);
  const [borderCornerStyle, setBorderCornerStyle] = useState<'square' | 'rounded' | 'chamfered'>('square');
  const [borderMirrorX, setBorderMirrorX] = useState(false);
  const [borderMirrorY, setBorderMirrorY] = useState(false);
  const [selectedBorderIndex, setSelectedBorderIndex] = useState(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const size = useMemo(() => documentSize(orientation), [orientation]);
  const canvasWidth = px(size.width);
  const canvasHeight = px(size.height);
  const previewEngrave = engravingColor(cardColor, engravingMode);

  const exportableObjects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    return canvas.getObjects().filter((object) => !isGuide(object));
  }, []);

  const refreshSelection = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) {
      setSelection(null);
      return;
    }

    const scaledWidth = active.getScaledWidth();
    const scaledHeight = active.getScaledHeight();
    setSelection({
      type: active.type || 'object',
      left: fmt(inches(active.left || 0)),
      top: fmt(inches(active.top || 0)),
      width: fmt(inches(scaledWidth)),
      height: fmt(inches(scaledHeight)),
      angle: Math.round(active.angle || 0),
      fill: String(active.get('fill') || '#000000'),
      stroke: String(active.get('stroke') || '#000000'),
      strokeWidth: Number(active.get('strokeWidth') || 0),
      fontFamily: active instanceof Textbox ? active.fontFamily : undefined,
      fontSize: active instanceof Textbox ? active.fontSize : undefined,
      textAlign: active instanceof Textbox ? active.textAlign : undefined,
      fontWeight: active instanceof Textbox ? String(active.fontWeight || '400') : undefined,
      fontStyle: active instanceof Textbox ? String(active.fontStyle || 'normal') : undefined,
      underline: active instanceof Textbox ? Boolean(active.underline) : undefined,
      charSpacing: active instanceof Textbox ? Number(active.charSpacing || 0) : undefined,
      lineHeight: active instanceof Textbox ? Number(active.lineHeight || 1.16) : undefined,
      opacity: Number(active.opacity ?? 1),
      isImage: active instanceof FabricImage,
      isRaster: active instanceof FabricImage && custom<string>(active, 'blackFoxUploadKind', '') === 'raster',
      imageBrightness: custom(active, 'blackFoxBrightness', 0),
      imageContrast: custom(active, 'blackFoxContrast', 0),
      imageGrayscale: custom(active, 'blackFoxGrayscale', false),
      imageThreshold: custom(active, 'blackFoxThreshold', 128),
      imagePrepared: custom(active, 'blackFoxPrepared', false),
      imageCropInset: custom(active, 'blackFoxCropInset', 0),
      imageWarning: custom(active, 'blackFoxLowResWarning', ''),
      visible: active.visible !== false,
      locked: Boolean(active.get('blackFoxLocked' as keyof FabricObject)),
    });
  }, []);

  const remember = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || restoringRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    const history = historyRef.current;
    if (history[history.length - 1] !== json) {
      history.push(json);
      if (history.length > 80) history.shift();
      redoRef.current = [];
    }
  }, []);

  const applyGuides = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const existing = canvas.getObjects().filter(isGuide);
    existing.forEach((object) => canvas.remove(object));

    const edge = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: canvasHeight,
      fill: 'transparent',
      stroke: '#f6f0df',
      strokeWidth: 3,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    edge.set('blackFoxGuide' as keyof FabricObject, true as never);
    canvas.add(edge);

    if (guidesVisible) {
      const safe = px(SAFE_AREA_IN);
      const safeRect = new Rect({
        left: safe,
        top: safe,
        width: canvasWidth - safe * 2,
        height: canvasHeight - safe * 2,
        fill: 'transparent',
        stroke: '#ffcc66',
        strokeDashArray: [14, 12],
        strokeWidth: 2,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      safeRect.set('blackFoxGuide' as keyof FabricObject, true as never);
      canvas.add(safeRect);
    }

    if (gridVisible) {
      const step = px(GRID_IN);
      for (let x = step; x < canvasWidth; x += step) {
        const line = new Line([x, 0, x, canvasHeight], {
          stroke: 'rgba(255,255,255,0.15)',
          strokeWidth: x % px(0.5) === 0 ? 2 : 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        line.set('blackFoxGuide' as keyof FabricObject, true as never);
        canvas.add(line);
      }
      for (let y = step; y < canvasHeight; y += step) {
        const line = new Line([0, y, canvasWidth, y], {
          stroke: 'rgba(255,255,255,0.15)',
          strokeWidth: y % px(0.5) === 0 ? 2 : 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        line.set('blackFoxGuide' as keyof FabricObject, true as never);
        canvas.add(line);
      }
    }

    canvas.getObjects().filter(isGuide).forEach((object) => canvas.sendObjectToBack(object));
    canvas.renderAll();
  }, [canvasHeight, canvasWidth, gridVisible, guidesVisible]);

  const keepOnCard = useCallback((object: FabricObject) => {
    if (isGuide(object)) return;
    const bounds = object.getBoundingRect();
    const minVisible = px(0.15);
    let nextLeft = object.left || 0;
    let nextTop = object.top || 0;
    if (bounds.left > canvasWidth - minVisible) nextLeft -= bounds.left - (canvasWidth - minVisible);
    if (bounds.top > canvasHeight - minVisible) nextTop -= bounds.top - (canvasHeight - minVisible);
    if (bounds.left + bounds.width < minVisible) nextLeft += minVisible - (bounds.left + bounds.width);
    if (bounds.top + bounds.height < minVisible) nextTop += minVisible - (bounds.top + bounds.height);
    object.set({ left: nextLeft, top: nextTop });
  }, [canvasHeight, canvasWidth]);

  const snapObject = useCallback((object: FabricObject) => {
    if (!snapEnabled || isGuide(object)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = object.getBoundingRect();
    const centers = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const grid = px(GRID_IN);
    let dx = 0;
    let dy = 0;

    const targetXs = [0, canvasWidth / 2, canvasWidth, Math.round(bounds.left / grid) * grid, Math.round(centers.x / grid) * grid];
    const targetYs = [0, canvasHeight / 2, canvasHeight, Math.round(bounds.top / grid) * grid, Math.round(centers.y / grid) * grid];
    for (const target of targetXs) {
      const candidates = [bounds.left, centers.x, bounds.left + bounds.width];
      for (const current of candidates) {
        if (Math.abs(current - target) <= SNAP_TOLERANCE) dx = target - current;
      }
    }
    for (const target of targetYs) {
      const candidates = [bounds.top, centers.y, bounds.top + bounds.height];
      for (const current of candidates) {
        if (Math.abs(current - target) <= SNAP_TOLERANCE) dy = target - current;
      }
    }

    canvas.getObjects().filter((other) => other !== object && !isGuide(other)).forEach((other) => {
      const otherBounds = other.getBoundingRect();
      const otherXs = [otherBounds.left, otherBounds.left + otherBounds.width / 2, otherBounds.left + otherBounds.width];
      const thisXs = [bounds.left, centers.x, bounds.left + bounds.width];
      const otherYs = [otherBounds.top, otherBounds.top + otherBounds.height / 2, otherBounds.top + otherBounds.height];
      const thisYs = [bounds.top, centers.y, bounds.top + bounds.height];
      otherXs.forEach((target) => thisXs.forEach((current) => {
        if (Math.abs(current - target) <= SNAP_TOLERANCE) dx = target - current;
      }));
      otherYs.forEach((target) => thisYs.forEach((current) => {
        if (Math.abs(current - target) <= SNAP_TOLERANCE) dy = target - current;
      }));
    });

    object.set({ left: (object.left || 0) + dx, top: (object.top || 0) + dy });
  }, [canvasHeight, canvasWidth, snapEnabled]);

  const addObject = useCallback((object: FabricObject, rememberChange = true, preservePosition = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    object.set({
      cornerColor: '#f4c75d',
      cornerStrokeColor: '#12151c',
      borderColor: '#f4c75d',
      transparentCorners: false,
      padding: 4,
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    if (!preservePosition) canvas.centerObject(object);
    keepOnCard(object);
    canvas.renderAll();
    refreshSelection();
    if (rememberChange) remember();
  }, [keepOnCard, refreshSelection, remember]);

  const addText = (kind: TextKind = 'custom') => {
    const preset = textPreset(kind);
    addObject(new Textbox(preset.text, {
      width: px(kind === 'address' ? 1.4 : 1.55),
      fontSize: preset.size,
      fontFamily: DEFAULT_FONT,
      fontWeight: preset.weight || '400',
      fill: previewEngrave,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    }));
  };

  const addShape = (kind: ShapeKind) => {
    const common = { fill: 'transparent', stroke: previewEngrave, strokeWidth: 8, originX: 'center' as const, originY: 'center' as const };
    if (kind === 'rect') addObject(new Rect({ ...common, width: px(0.75), height: px(0.42), rx: 6, ry: 6 }));
    if (kind === 'roundRect') addObject(new Rect({ ...common, width: px(0.78), height: px(0.42), rx: 28, ry: 28 }));
    if (kind === 'circle') addObject(new FabricCircle({ ...common, radius: px(0.22) }));
    if (kind === 'oval') addObject(new FabricCircle({ ...common, radius: px(0.25), scaleX: 1.55, scaleY: 0.75 }));
    if (kind === 'line') addObject(new Line([-px(0.4), 0, px(0.4), 0], { stroke: previewEngrave, strokeWidth: 8, originX: 'center', originY: 'center' }));
    if (kind === 'dashedLine') addObject(new Line([-px(0.45), 0, px(0.45), 0], { stroke: previewEngrave, strokeWidth: 7, strokeDashArray: [24, 16], originX: 'center', originY: 'center' }));
    if (kind === 'hDivider') addObject(new Line([-px(1.25), 0, px(1.25), 0], { stroke: previewEngrave, strokeWidth: 5, originX: 'center', originY: 'center' }));
    if (kind === 'vDivider') addObject(new Line([0, -px(0.7), 0, px(0.7)], { stroke: previewEngrave, strokeWidth: 5, originX: 'center', originY: 'center' }));
    if (kind === 'diamond') addObject(new Polygon(polygonPoints(4, px(0.28)), common));
    if (kind === 'hexagon') addObject(new Polygon(polygonPoints(6, px(0.3)), common));
    if (kind === 'star') addObject(new Polygon(starPoints(0, 0, px(0.34), px(0.15), 5), common));
  };

  const borderObjects = (presetIndex: number, category: BorderCategory) => {
    const styleKind = BORDER_STYLE_KINDS[presetIndex % BORDER_STYLE_KINDS.length];
    const m = px(borderMargin);
    const sw = Math.max(1, px(borderStroke));
    const radius = px(borderRadius);
    const density = Math.max(3, borderDensity);
    const left = m;
    const top = m;
    const width = canvasWidth - m * 2;
    const height = canvasHeight - m * 2;
    const right = left + width;
    const bottom = top + height;
    const objects: FabricObject[] = [];
    const line = (points: [number, number, number, number], extra = {}) => new Line(points, { stroke: previewEngrave, strokeWidth: sw, fill: 'transparent', strokeLineCap: 'round', ...extra });
    const rect = (offset = 0, extra = {}) => new Rect({ left: left + offset, top: top + offset, width: width - offset * 2, height: height - offset * 2, fill: 'transparent', stroke: previewEngrave, strokeWidth: sw, rx: ['floral', 'wave'].includes(styleKind) ? radius : 0, ry: ['floral', 'wave'].includes(styleKind) ? radius : 0, ...extra });
    const path = (d: string, extra = {}) => new Path(d, { fill: 'transparent', stroke: previewEngrave, strokeWidth: sw, strokeLineCap: 'round', strokeLineJoin: 'round', ...extra });
    if (!['divider'].includes(styleKind)) objects.push(rect(0, { strokeDashArray: styleKind === 'minimal-gap' ? [px(0.08), px(0.05)] : undefined }));
    if (['double', 'triple', 'inner-corners'].includes(styleKind)) objects.push(rect(px(0.075), { strokeWidth: sw * 0.65 }));
    if (objects.length === 0) objects.push(rect(0));
    if (styleKind === 'side-bars') objects.push(line([left + px(0.08), top + height * 0.3, left + px(0.08), top + height * 0.7], { strokeWidth: sw * 0.6 }), line([right - px(0.08), top + height * 0.3, right - px(0.08), top + height * 0.7], { strokeWidth: sw * 0.6 }));
    if (styleKind === 'top-bottom') objects.push(line([left + width * 0.28, top + px(0.08), left + width * 0.72, top + px(0.08)], { strokeWidth: sw * 0.6 }), line([left + width * 0.28, bottom - px(0.08), left + width * 0.72, bottom - px(0.08)], { strokeWidth: sw * 0.6 }));
    if (styleKind === 'corner-caps' || styleKind === 'bold-corners') {
      const len = Math.min(width, height) * (styleKind === 'bold-corners' ? 0.2 : 0.14);
      objects.push(line([left, top + len, left, top], { strokeWidth: sw * 1.2 }), line([left, top, left + len, top], { strokeWidth: sw * 1.2 }), line([right - len, top, right, top], { strokeWidth: sw * 1.2 }), line([right, top, right, top + len], { strokeWidth: sw * 1.2 }), line([left, bottom - len, left, bottom], { strokeWidth: sw * 1.2 }), line([left, bottom, left + len, bottom], { strokeWidth: sw * 1.2 }), line([right - len, bottom, right, bottom], { strokeWidth: sw * 1.2 }), line([right, bottom - len, right, bottom], { strokeWidth: sw * 1.2 }));
    }
    if (styleKind === 'corner-steps' || styleKind === 'inner-corners') {
      const inset = styleKind === 'inner-corners' ? px(0.14) : px(0.06);
      const len = px(0.16);
      objects.push(line([left + inset, top + inset + len, left + inset, top + inset], { strokeWidth: sw * 0.7 }), line([left + inset, top + inset, left + inset + len, top + inset], { strokeWidth: sw * 0.7 }), line([right - inset - len, top + inset, right - inset, top + inset], { strokeWidth: sw * 0.7 }), line([right - inset, top + inset, right - inset, top + inset + len], { strokeWidth: sw * 0.7 }), line([left + inset, bottom - inset - len, left + inset, bottom - inset], { strokeWidth: sw * 0.7 }), line([left + inset, bottom - inset, left + inset + len, bottom - inset], { strokeWidth: sw * 0.7 }), line([right - inset - len, bottom - inset, right - inset, bottom - inset], { strokeWidth: sw * 0.7 }), line([right - inset, bottom - inset - len, right - inset, bottom - inset], { strokeWidth: sw * 0.7 }));
    }
    if (styleKind === 'corner-dots') {
      const dot = sw * 1.6;
      [[left + px(0.08), top + px(0.08)], [right - px(0.08), top + px(0.08)], [left + px(0.08), bottom - px(0.08)], [right - px(0.08), bottom - px(0.08)]].forEach(([cx, cy]) => objects.push(new FabricCircle({ left: cx - dot, top: cy - dot, radius: dot, fill: previewEngrave, stroke: previewEngrave })));
    }
    if (styleKind === 'center-notch') objects.push(line([canvasWidth / 2 - px(0.08), top, canvasWidth / 2 + px(0.08), top], { strokeWidth: sw * 1.1 }), line([canvasWidth / 2 - px(0.08), bottom, canvasWidth / 2 + px(0.08), bottom], { strokeWidth: sw * 1.1 }), line([left, canvasHeight / 2 - px(0.08), left, canvasHeight / 2 + px(0.08)], { strokeWidth: sw * 1.1 }), line([right, canvasHeight / 2 - px(0.08), right, canvasHeight / 2 + px(0.08)], { strokeWidth: sw * 1.1 }));
    if (styleKind === 'mid-dots') {
      const dot = sw * 1.7;
      [[canvasWidth / 2, top], [canvasWidth / 2, bottom], [left, canvasHeight / 2], [right, canvasHeight / 2]].forEach(([cx, cy]) => objects.push(new FabricCircle({ left: cx - dot, top: cy - dot, radius: dot, fill: previewEngrave, stroke: previewEngrave })));
    }
    if (styleKind === 'art-deco') objects.push(path(`M ${left + width * 0.28} ${top} L ${left + width * 0.36} ${top + px(0.08)} L ${left + width * 0.64} ${top + px(0.08)} L ${left + width * 0.72} ${top}`), path(`M ${left + width * 0.28} ${bottom} L ${left + width * 0.36} ${bottom - px(0.08)} L ${left + width * 0.64} ${bottom - px(0.08)} L ${left + width * 0.72} ${bottom}`));
    if (styleKind === 'diagonal-cuts') {
      const cut = px(0.18);
      const inset = px(0.06);
      objects.push(
        line([left + inset, top + cut, left + cut, top + inset], { strokeWidth: sw * 0.75 }),
        line([right - cut, top + inset, right - inset, top + cut], { strokeWidth: sw * 0.75 }),
        line([left + inset, bottom - cut, left + cut, bottom - inset], { strokeWidth: sw * 0.75 }),
        line([right - cut, bottom - inset, right - inset, bottom - cut], { strokeWidth: sw * 0.75 }),
        line([left + cut * 1.35, top + inset, right - cut * 1.35, top + inset], { strokeWidth: sw * 0.4 }),
        line([left + cut * 1.35, bottom - inset, right - cut * 1.35, bottom - inset], { strokeWidth: sw * 0.4 }),
        line([left + inset, top + cut * 1.35, left + inset, bottom - cut * 1.35], { strokeWidth: sw * 0.4 }),
        line([right - inset, top + cut * 1.35, right - inset, bottom - cut * 1.35], { strokeWidth: sw * 0.4 }),
      );
    }
    if (styleKind === 'industrial-slash') {
      const len = px(0.14);
      for (let i = 0; i < 5; i += 1) {
        const x = left + width * (0.18 + i * 0.16);
        objects.push(line([x, top, x + len, top + len], { strokeWidth: sw * 0.55 }), line([x, bottom, x + len, bottom - len], { strokeWidth: sw * 0.55 }));
      }
    }
    if (styleKind === 'short-rails') objects.push(line([left + width * 0.15, top + px(0.08), left + width * 0.34, top + px(0.08)], { strokeWidth: sw * 0.6 }), line([left + width * 0.66, top + px(0.08), left + width * 0.85, top + px(0.08)], { strokeWidth: sw * 0.6 }), line([left + width * 0.15, bottom - px(0.08), left + width * 0.34, bottom - px(0.08)], { strokeWidth: sw * 0.6 }), line([left + width * 0.66, bottom - px(0.08), left + width * 0.85, bottom - px(0.08)], { strokeWidth: sw * 0.6 }));
    if (styleKind === 'diamond-marks') {
      const makeDiamond = (cx: number, cy: number) => new Polygon([{ x: cx, y: cy - px(0.04) }, { x: cx + px(0.04), y: cy }, { x: cx, y: cy + px(0.04) }, { x: cx - px(0.04), y: cy }], { fill: 'transparent', stroke: previewEngrave, strokeWidth: sw * 0.65 });
      objects.push(makeDiamond(canvasWidth / 2, top + px(0.08)), makeDiamond(canvasWidth / 2, bottom - px(0.08)));
    }
    if (styleKind === 'tech-nodes' || styleKind === 'circuit') {
      objects.push(line([left + width * 0.25, top, left + width * 0.25, top + px(0.12)], { strokeWidth: sw * 0.55 }), line([right - width * 0.25, bottom, right - width * 0.25, bottom - px(0.12)], { strokeWidth: sw * 0.55 }));
      const dot = sw * 1.2;
      [[left + width * 0.25, top + px(0.12)], [right - width * 0.25, bottom - px(0.12)]].forEach(([cx, cy]) => objects.push(new FabricCircle({ left: cx - dot, top: cy - dot, radius: dot, fill: previewEngrave, stroke: previewEngrave })));
      if (styleKind === 'circuit') objects.push(line([left + width * 0.25, canvasHeight / 2, right - width * 0.25, canvasHeight / 2], { strokeWidth: sw * 0.45, strokeDashArray: [px(0.08), px(0.05)] }));
    }
    if (styleKind === 'bracket') objects.push(path(`M ${left + px(0.18)} ${top + px(0.12)} L ${left + px(0.08)} ${top + px(0.12)} L ${left + px(0.08)} ${bottom - px(0.12)} L ${left + px(0.18)} ${bottom - px(0.12)}`, { strokeWidth: sw * 0.75 }), path(`M ${right - px(0.18)} ${top + px(0.12)} L ${right - px(0.08)} ${top + px(0.12)} L ${right - px(0.08)} ${bottom - px(0.12)} L ${right - px(0.18)} ${bottom - px(0.12)}`, { strokeWidth: sw * 0.75 }));
    if (styleKind === 'floral') {
      const floralCorner = (cx: number, cy: number, sx: 1 | -1, sy: 1 | -1) => {
        const a = px(0.06);
        const b = px(0.14);
        const c = px(0.22);
        objects.push(
          path(`M ${cx} ${cy + sy * c} C ${cx + sx * a} ${cy + sy * b}, ${cx + sx * b} ${cy + sy * a}, ${cx + sx * c} ${cy}`),
          path(`M ${cx + sx * a} ${cy + sy * b} C ${cx + sx * b} ${cy + sy * b}, ${cx + sx * b} ${cy + sy * a}, ${cx + sx * a} ${cy + sy * a}`, { strokeWidth: sw * 0.55 }),
          new FabricCircle({ left: cx + sx * c - sw * 0.9, top: cy - sw * 0.9, radius: sw * 0.9, fill: 'transparent', stroke: previewEngrave, strokeWidth: sw * 0.5 }),
        );
      };
      floralCorner(left + px(0.08), top + px(0.08), 1, 1);
      floralCorner(right - px(0.08), top + px(0.08), -1, 1);
      floralCorner(left + px(0.08), bottom - px(0.08), 1, -1);
      floralCorner(right - px(0.08), bottom - px(0.08), -1, -1);
    }
    if (styleKind === 'wave') {
      const scrollTop = top + px(0.08);
      const scrollBottom = bottom - px(0.08);
      const scrollLeft = left + px(0.08);
      const scrollRight = right - px(0.08);
      objects.push(
        path(`M ${canvasWidth / 2 - px(0.28)} ${scrollTop} C ${canvasWidth / 2 - px(0.18)} ${scrollTop - px(0.08)}, ${canvasWidth / 2 - px(0.08)} ${scrollTop + px(0.08)}, ${canvasWidth / 2} ${scrollTop} C ${canvasWidth / 2 + px(0.08)} ${scrollTop - px(0.08)}, ${canvasWidth / 2 + px(0.18)} ${scrollTop + px(0.08)}, ${canvasWidth / 2 + px(0.28)} ${scrollTop}`),
        path(`M ${canvasWidth / 2 - px(0.28)} ${scrollBottom} C ${canvasWidth / 2 - px(0.18)} ${scrollBottom + px(0.08)}, ${canvasWidth / 2 - px(0.08)} ${scrollBottom - px(0.08)}, ${canvasWidth / 2} ${scrollBottom} C ${canvasWidth / 2 + px(0.08)} ${scrollBottom + px(0.08)}, ${canvasWidth / 2 + px(0.18)} ${scrollBottom - px(0.08)}, ${canvasWidth / 2 + px(0.28)} ${scrollBottom}`),
        path(`M ${scrollLeft} ${canvasHeight / 2 - px(0.18)} C ${scrollLeft - px(0.07)} ${canvasHeight / 2 - px(0.08)}, ${scrollLeft + px(0.07)} ${canvasHeight / 2}, ${scrollLeft} ${canvasHeight / 2 + px(0.18)}`, { strokeWidth: sw * 0.65 }),
        path(`M ${scrollRight} ${canvasHeight / 2 - px(0.18)} C ${scrollRight + px(0.07)} ${canvasHeight / 2 - px(0.08)}, ${scrollRight - px(0.07)} ${canvasHeight / 2}, ${scrollRight} ${canvasHeight / 2 + px(0.18)}`, { strokeWidth: sw * 0.65 }),
      );
    }
    if (styleKind === 'triple') objects.push(rect(px(0.13), { strokeWidth: sw * 0.45 }));
    if (styleKind === 'divider') {
      const y = canvasHeight / 2;
      objects.push(line([left, y, canvasWidth / 2 - px(0.12), y], { strokeWidth: sw }), line([canvasWidth / 2 + px(0.12), y, right, y], { strokeWidth: sw }), new Polygon([{ x: canvasWidth / 2, y: y - px(0.06) }, { x: canvasWidth / 2 + px(0.06), y }, { x: canvasWidth / 2, y: y + px(0.06) }, { x: canvasWidth / 2 - px(0.06), y }], { fill: 'transparent', stroke: previewEngrave, strokeWidth: sw * 0.65 }));
    }
    return objects;
  };

  const addBorder = (presetIndex = 0, category: BorderCategory = 'Simple line') => {
    removeBorders(false);
    const objects = borderObjects(presetIndex, category);
    objects.forEach((object) => setCustom(object, 'blackFoxBorderPreset', `${BORDER_STYLE_LABELS[BORDER_STYLE_KINDS[presetIndex]]} piece`));
    const group = new FabricGroup(objects, {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center',
      scaleX: borderMirrorX ? -1 : 1,
      scaleY: borderMirrorY ? -1 : 1,
    });
    setSelectedBorderIndex(presetIndex);
    setCustom(group, 'blackFoxBorderPreset', BORDER_STYLE_LABELS[BORDER_STYLE_KINDS[presetIndex]]);
    addObject(group, true, true);
  };

  const applyBorderToSide = async (target: Side) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (target === side) {
      addBorder();
      return;
    }
    saveCurrentSide();
    const currentJson = canvas.toJSON();
    const targetJson = sideDataRef.current[target];
    restoringRef.current = true;
    canvas.clear();
    if (targetJson) await canvas.loadFromJSON(targetJson);
    restoringRef.current = false;
    applyGuides();
    removeBorders(false);
    const targetObjects = borderObjects(selectedBorderIndex, 'Simple line');
    targetObjects.forEach((object) => setCustom(object, 'blackFoxBorderPreset', `${BORDER_STYLE_LABELS[BORDER_STYLE_KINDS[selectedBorderIndex]]} piece`));
    const group = new FabricGroup(targetObjects, {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center',
      scaleX: borderMirrorX ? -1 : 1,
      scaleY: borderMirrorY ? -1 : 1,
    });
    setCustom(group, 'blackFoxBorderPreset', `${BORDER_STYLE_LABELS[BORDER_STYLE_KINDS[selectedBorderIndex]]} applied to ${target}`);
    canvas.add(group);
    sideDataRef.current[target] = canvas.toJSON();
    restoringRef.current = true;
    canvas.clear();
    await canvas.loadFromJSON(currentJson);
    restoringRef.current = false;
    applyGuides();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const removeBorders = (rememberChange = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isBorderObject = (object: FabricObject): boolean => {
      if (Boolean(object.get('blackFoxBorderPreset' as keyof FabricObject))) return true;
      const children = (object as unknown as { _objects?: FabricObject[] })._objects || [];
      return children.some((child) => isBorderObject(child));
    };
    canvas.getObjects().filter((object) => isBorderObject(object)).forEach((object) => canvas.remove(object));
    canvas.discardActiveObject();
    canvas.renderAll();
    if (rememberChange) remember();
  };

  const addCornerElement = (corners: 1 | 2 | 4) => {
    const m = px(borderMargin);
    const sw = Math.max(1, px(borderStroke));
    const makeCorner = (x: number, y: number, sx: number, sy: number) => new FabricGroup([
      new Path(`M 0 ${px(0.18)} C ${px(0.07)} ${px(0.04)}, ${px(0.14)} ${px(0.02)}, ${px(0.3)} 0`, { fill: 'transparent', stroke: previewEngrave, strokeWidth: sw }),
      new Line([0, 0, px(0.22), px(0.22)], { stroke: previewEngrave, strokeWidth: sw * 0.65 }),
    ], { left: x, top: y, scaleX: sx, scaleY: sy });
    const pieces = [makeCorner(m, m, 1, 1)];
    if (corners >= 2) pieces.push(makeCorner(canvasWidth - m, m, -1, 1));
    if (corners === 4) pieces.push(makeCorner(m, canvasHeight - m, 1, -1), makeCorner(canvasWidth - m, canvasHeight - m, -1, -1));
    const group = new FabricGroup(pieces, { left: 0, top: 0 });
    setCustom(group, 'blackFoxBorderPreset', `Mirrored corner ${corners}`);
    addObject(group, true, true);
  };

  const addTemplate = (template: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.getObjects().some((object) => !isGuide(object)) && !window.confirm('Replace current artwork with this editable template?')) return;
    canvas.getObjects().filter((object) => !isGuide(object)).forEach((object) => canvas.remove(object));
    const templateLabels: Record<string, { name: string; title: string; org: string; note: string; icon: 'circle' | 'house' | 'gear' | 'camera' | 'spark' }> = {
      corporate: { name: 'Jordan Lee', title: 'Managing Partner', org: 'Northline Advisory', note: 'jordan@example.com', icon: 'circle' },
      minimal: { name: 'Avery Stone', title: 'Design Consultant', org: 'Stone Studio', note: 'stone.example', icon: 'spark' },
      elegant: { name: 'Morgan Vale', title: 'Creative Director', org: 'Vale & Co.', note: 'hello@vale.example', icon: 'circle' },
      realestate: { name: 'Taylor Reed', title: 'Real Estate Advisor', org: 'Reed Properties', note: '(555) 010-2222', icon: 'house' },
      education: { name: 'Dr. Casey Park', title: 'Educational Consultant', org: 'Learning Pathways', note: 'casey@example.com', icon: 'spark' },
      stem: { name: 'Riley Chen', title: 'STEM Consultant', org: 'LabBridge', note: 'labbridge.example', icon: 'gear' },
      creative: { name: 'Jamie Fox', title: 'Brand & Illustration', org: 'Brightmark Creative', note: '@brightmark', icon: 'spark' },
      beauty: { name: 'Sage Monroe', title: 'Esthetics Studio', org: 'Monroe Beauty', note: 'appointments@example.com', icon: 'circle' },
      construction: { name: 'Drew Carter', title: 'Project Lead', org: 'Carter Build Co.', note: 'licensed & insured', icon: 'gear' },
      technology: { name: 'Quinn Patel', title: 'Systems Architect', org: 'Signal Works', note: 'signal.example', icon: 'gear' },
      photography: { name: 'Harper Lane', title: 'Photographer', org: 'Lane Photo', note: 'portraits | products', icon: 'camera' },
      vertical: { name: 'Alex Morgan', title: 'Executive Consultant', org: 'Morgan Group', note: 'alex@example.com', icon: 'circle' },
    };
    const data = templateLabels[template] || templateLabels.minimal;
    const centerX = canvasWidth / 2;
    const isPortrait = orientation === 'portrait';
    const titleWidth = px(isPortrait ? 1.45 : 2.55);
    const nameWidth = px(isPortrait ? 1.45 : 2.0);
    const detailWidth = px(isPortrait ? 1.45 : 1.85);
    const orgTop = px(isPortrait ? 0.42 : 0.28);
    const dividerY = px(isPortrait ? 1.08 : 0.67);
    const nameTop = px(isPortrait ? 1.32 : 0.82);
    const detailTop = px(isPortrait ? 1.92 : 1.22);
    const iconY = px(isPortrait ? 2.78 : 1.66);
    const placeText = (text: string, top: number, width: number, fontSize: number, extra = {}) => {
      addObject(new Textbox(text, {
        left: centerX - width / 2,
        top,
        width,
        fontSize,
        fontFamily: DEFAULT_FONT,
        fill: previewEngrave,
        textAlign: 'center',
        ...extra,
      }), false, true);
    };
    placeText(data.org.toUpperCase(), orgTop, titleWidth, isPortrait ? 34 : 44, { fontWeight: '800', charSpacing: 55 });
    addObject(new Line([centerX - px(isPortrait ? 0.55 : 0.85), dividerY, centerX + px(isPortrait ? 0.55 : 0.85), dividerY], {
      stroke: previewEngrave,
      strokeWidth: 5,
      strokeLineCap: 'round',
    }), false, true);
    placeText(data.name, nameTop, nameWidth, isPortrait ? 40 : 46, { fontWeight: '700' });
    placeText(`${data.title}\n${data.note}`, detailTop, detailWidth, isPortrait ? 24 : 27, { lineHeight: 1.25 });
    if (data.icon === 'circle') addObject(new FabricCircle({ left: centerX, top: iconY, radius: px(0.15), originX: 'center', originY: 'center', fill: 'transparent', stroke: previewEngrave, strokeWidth: 7 }), false, true);
    if (data.icon === 'gear') addObject(new Polygon(polygonPoints(8, px(0.16)), { left: centerX, top: iconY, originX: 'center', originY: 'center', fill: 'transparent', stroke: previewEngrave, strokeWidth: 7 }), false, true);
    if (data.icon === 'camera') addObject(new FabricGroup([
      new Rect({ left: -px(0.18), top: -px(0.1), width: px(0.36), height: px(0.22), fill: 'transparent', stroke: previewEngrave, strokeWidth: 6, rx: 10, ry: 10 }),
      new FabricCircle({ left: 0, top: px(0.01), radius: px(0.055), originX: 'center', originY: 'center', fill: 'transparent', stroke: previewEngrave, strokeWidth: 5 }),
    ], { left: centerX, top: iconY, originX: 'center', originY: 'center' }), false, true);
    if (data.icon === 'house') addObject(new Polygon([{ x: -px(0.18), y: px(0.04) }, { x: 0, y: -px(0.16) }, { x: px(0.18), y: px(0.04) }, { x: px(0.13), y: px(0.04) }, { x: px(0.13), y: px(0.2) }, { x: -px(0.13), y: px(0.2) }, { x: -px(0.13), y: px(0.04) }], { left: centerX, top: iconY, originX: 'center', originY: 'center', fill: 'transparent', stroke: previewEngrave, strokeWidth: 6 }), false, true);
    if (data.icon === 'spark') addObject(new Polygon(starPoints(0, 0, px(0.17), px(0.07), 4), { left: centerX, top: iconY, originX: 'center', originY: 'center', fill: 'transparent', stroke: previewEngrave, strokeWidth: 6 }), false, true);
    canvas.discardActiveObject();
    canvas.renderAll();
    remember();
  };

  const updateActive = (patch: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if ('width' in patch) {
      const target = px(Number(patch.width));
      active.set({ scaleX: target / Math.max(active.width || 1, 1) });
      delete patch.width;
    }
    if ('height' in patch) {
      const target = px(Number(patch.height));
      active.set({ scaleY: target / Math.max(active.height || 1, 1) });
      delete patch.height;
    }
    if ('left' in patch) patch.left = px(Number(patch.left));
    if ('top' in patch) patch.top = px(Number(patch.top));
    if ('fontSize' in patch && active instanceof Textbox) patch.fontSize = Number(patch.fontSize);
    if ('strokeWidth' in patch) patch.strokeWidth = Number(patch.strokeWidth);
    active.set(patch);
    keepOnCard(active);
    active.setCoords();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const withSelection = (fn: (objects: FabricObject[], active: FabricObject) => void) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const objects = active instanceof ActiveSelection ? active.getObjects() : [active];
    fn(objects, active);
    objects.forEach((object) => object.setCoords());
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const deleteSelection = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const objects = active instanceof ActiveSelection ? active.getObjects() : [active];
    objects.forEach((object) => {
      if (!isGuide(object)) canvas.remove(object);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshSelection();
    remember();
  }, [refreshSelection, remember]);

  const duplicateSelection = useCallback(async () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const clone = await active.clone();
    clone.set({ left: (active.left || 0) + px(0.08), top: (active.top || 0) + px(0.08) });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
    refreshSelection();
    remember();
  }, [refreshSelection, remember]);

  const copySelection = useCallback(async () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const objects = active instanceof ActiveSelection ? active.getObjects() : [active];
    clipboardRef.current = await Promise.all(objects.map((object) => object.clone()));
  }, []);

  const pasteSelection = useCallback(async () => {
    const canvas = canvasRef.current;
    const copied = clipboardRef.current;
    if (!canvas || !copied?.length) return;
    const clones = await Promise.all(copied.map((object) => object.clone()));
    clones.forEach((clone) => {
      clone.set({ left: (clone.left || 0) + px(0.1), top: (clone.top || 0) + px(0.1) });
      canvas.add(clone);
    });
    if (clones.length > 1) {
      canvas.setActiveObject(new ActiveSelection(clones, { canvas }));
    } else {
      canvas.setActiveObject(clones[0]);
    }
    canvas.renderAll();
    refreshSelection();
    remember();
  }, [refreshSelection, remember]);

  const undo = useCallback(async () => {
    const canvas = canvasRef.current;
    const history = historyRef.current;
    if (!canvas || history.length < 2) return;
    const current = history.pop();
    if (current) redoRef.current.push(current);
    const previous = history[history.length - 1];
    restoringRef.current = true;
    await canvas.loadFromJSON(previous);
    restoringRef.current = false;
    applyGuides();
    canvas.renderAll();
    refreshSelection();
  }, [applyGuides, refreshSelection]);

  const redo = useCallback(async () => {
    const canvas = canvasRef.current;
    const next = redoRef.current.pop();
    if (!canvas || !next) return;
    restoringRef.current = true;
    await canvas.loadFromJSON(next);
    restoringRef.current = false;
    historyRef.current.push(next);
    applyGuides();
    canvas.renderAll();
    refreshSelection();
  }, [applyGuides, refreshSelection]);

  const align = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    withSelection((objects) => {
      objects.forEach((object) => {
        const bounds = object.getBoundingRect();
        if (mode === 'left') object.set({ left: (object.left || 0) - bounds.left });
        if (mode === 'center') object.set({ left: (object.left || 0) + canvasWidth / 2 - (bounds.left + bounds.width / 2) });
        if (mode === 'right') object.set({ left: (object.left || 0) + canvasWidth - (bounds.left + bounds.width) });
        if (mode === 'top') object.set({ top: (object.top || 0) - bounds.top });
        if (mode === 'middle') object.set({ top: (object.top || 0) + canvasHeight / 2 - (bounds.top + bounds.height / 2) });
        if (mode === 'bottom') object.set({ top: (object.top || 0) + canvasHeight - (bounds.top + bounds.height) });
      });
    });
  };

  const distribute = (axis: 'x' | 'y') => {
    withSelection((objects) => {
      if (objects.length < 3) return;
      const sorted = [...objects].sort((a, b) => axis === 'x' ? (a.left || 0) - (b.left || 0) : (a.top || 0) - (b.top || 0));
      const first = axis === 'x' ? sorted[0].left || 0 : sorted[0].top || 0;
      const last = axis === 'x' ? sorted[sorted.length - 1].left || 0 : sorted[sorted.length - 1].top || 0;
      const step = (last - first) / (sorted.length - 1);
      sorted.forEach((object, index) => object.set(axis === 'x' ? { left: first + step * index } : { top: first + step * index }));
    });
  };

  const groupSelection = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof ActiveSelection)) return;
    (active as unknown as { toGroup: () => FabricGroup }).toGroup();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const ungroupSelection = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof FabricGroup)) return;
    (active as unknown as { toActiveSelection: () => ActiveSelection }).toActiveSelection();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const layer = (mode: 'front' | 'forward' | 'back' | 'backward') => {
    withSelection((objects) => {
      objects.forEach((object) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (mode === 'front') canvas.bringObjectToFront(object);
        if (mode === 'forward') canvas.bringObjectForward(object);
        if (mode === 'back') canvas.sendObjectToBack(object);
        if (mode === 'backward') canvas.sendObjectBackwards(object);
      });
      applyGuides();
    });
  };

  const saveCurrentSide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sideDataRef.current[side] = canvas.toJSON();
  }, [side]);

  const switchSide = async (next: Side) => {
    const canvas = canvasRef.current;
    if (!canvas || next === side) return;
    saveCurrentSide();
    setSide(next);
    restoringRef.current = true;
    canvas.clear();
    const sideData = sideDataRef.current[next];
    if (sideData) await canvas.loadFromJSON(sideData);
    restoringRef.current = false;
    applyGuides();
    canvas.discardActiveObject();
    canvas.renderAll();
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    redoRef.current = [];
    refreshSelection();
  };

  const newProject = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.getObjects().some((object) => !isGuide(object)) && !window.confirm('Clear the current unsaved design and start a new project?')) return;
    setProjectName('Untitled Card');
    sideDataRef.current = { front: null, back: null };
    setSide('front');
    canvas.clear();
    applyGuides();
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    redoRef.current = [];
    refreshSelection();
  };

  const restoreAutosave = async () => {
    const raw = localStorage.getItem('black-fox-autosave');
    const canvas = canvasRef.current;
    if (!raw || !canvas) {
      setExportNotice('No autosave was found in this browser.');
      return;
    }
    try {
      const project = JSON.parse(raw) as ProjectRecord;
      await openProject(project);
    } catch {
      setExportNotice('Autosave could not be restored.');
    }
  };

  const saveProject = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveCurrentSide();
    const projects = projectList();
    const name = projectName.trim() || 'Untitled Card';
    const existing = projects.find((project) => project.name === name);
    const record: ProjectRecord = {
      id: existing?.id || uid(),
      name,
      updatedAt: Date.now(),
      orientation,
      cardColor,
      engravingMode,
      front: sideDataRef.current.front || canvas.toJSON(),
      back: sideDataRef.current.back || null,
    };
    writeProjectList([record, ...projects.filter((project) => project.id !== record.id)].slice(0, 20));
    setSavedProjects(projectList());
  };

  const openProject = async (project: ProjectRecord) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setProjectName(project.name);
    setOrientation(project.orientation);
    setCardColor(project.cardColor);
    setEngravingMode(project.engravingMode);
    sideDataRef.current = { front: project.front, back: project.back };
    setSide('front');
    restoringRef.current = true;
    canvas.clear();
    if (project.front) await canvas.loadFromJSON(project.front);
    restoringRef.current = false;
    setShowOpen(false);
    setTimeout(() => {
      applyGuides();
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      redoRef.current = [];
      canvas.renderAll();
      refreshSelection();
    });
  };

  const sideJson = (target: Side) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (target === side) return canvas.toJSON();
    return sideDataRef.current[target];
  };

  const renderSideSvg = async (target: Side) => {
    const json = sideJson(target);
    const tempEl = document.createElement('canvas');
    const temp = new Canvas(tempEl, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });
    if (json) await temp.loadFromJSON(json);
    temp.backgroundColor = 'transparent';
    temp.getObjects().filter(isGuide).forEach((object) => temp.remove(object));
    temp.getObjects().forEach((object) => {
      if (object.visible === false) return;
      const fill = String(object.get('fill') || '');
      const stroke = String(object.get('stroke') || '');
      if (fill && fill !== 'transparent' && fill !== 'none') object.set({ fill: svgInvert ? '#ffffff' : '#000000' });
      if (stroke && stroke !== 'transparent' && stroke !== 'none') object.set({ stroke: svgInvert ? '#ffffff' : '#000000' });
      if (svgMode === 'strokes') object.set({ fill: 'none' });
      if (svgMode === 'fills') object.set({ stroke: 'none' });
    });
    const raw = temp.toSVG({
      width: `${size.width}in`,
      height: `${size.height}in`,
      viewBox: { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
    } as Parameters<Canvas['toSVG']>[0]);
    temp.dispose();
    return normalizeLaserSvg(raw, {
      orientation,
      side: target,
      artworkSvg: raw,
      invert: svgInvert,
      mode: svgMode,
      includeCardOutline: svgOutline,
      flattenTransforms: svgFlatten,
    });
  };

  const exportSideSvg = async (target: Side) => {
    saveCurrentSide();
    const svg = await renderSideSvg(target);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${projectName.replace(/\W+/g, '-').toLowerCase()}-${target}.svg`);
  };

  const exportBothZip = async () => {
    saveCurrentSide();
    const frontSvg = await renderSideSvg('front');
    const backSvg = await renderSideSvg('back');
    const zip = makeStoredZip([
      { name: 'front.svg', content: frontSvg },
      { name: 'back.svg', content: backSvg },
    ]);
    downloadBlob(new Blob([zip], { type: 'application/zip' }), `${projectName.replace(/\W+/g, '-').toLowerCase()}-front-back.zip`);
  };

  const exportPreviewPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hidden = canvas.getObjects().filter(isGuide);
    hidden.forEach((object) => object.set({ visible: false }));
    const previousBg = canvas.backgroundColor;
    canvas.backgroundColor = exportMockup ? CARD_COLORS[cardColor].color : (pngTransparent ? 'transparent' : '#ffffff');
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: pngDpi / DPI });
    canvas.backgroundColor = previousBg;
    hidden.forEach((object) => object.set({ visible: true }));
    canvas.renderAll();
    const response = await fetch(dataUrl);
    downloadBlob(await response.blob(), `${projectName.replace(/\W+/g, '-').toLowerCase()}-${side}-${pngDpi}dpi.png`);
  };

  const exportPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hidden = canvas.getObjects().filter(isGuide);
    hidden.forEach((object) => object.set({ visible: false }));
    canvas.renderAll();
    const imageData = canvas.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: 1 });
    hidden.forEach((object) => object.set({ visible: true }));
    canvas.renderAll();
    const imageBinary = atob(imageData.split(',')[1]);
    const pageW = size.width * 72;
    const pageH = size.height * 72;
    const proofText = `Customer/Project: ${pdfEscape(projectName)} | Date: ${new Date().toLocaleDateString()} | Card: ${CARD_COLORS[cardColor].label}, ${orientation}, ${size.width} x ${size.height} in | Preview color is a simulation; actual engraving results may vary.`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH + 72}] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 6 0 R >> >> /Contents 5 0 R >> endobj`,
      `4 0 obj << /Type /XObject /Subtype /Image /Width ${canvasWidth} /Height ${canvasHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBinary.length} >> stream\n${imageBinary}\nendstream endobj`,
      `5 0 obj << /Length ${`q ${pageW} 0 0 ${pageH} 0 72 cm /Im0 Do Q BT /F1 8 Tf 10 42 Td (${proofText}) Tj ET`.length} >> stream\nq ${pageW} 0 0 ${pageH} 0 72 cm /Im0 Do Q BT /F1 8 Tf 10 42 Td (${proofText}) Tj ET\nendstream endobj`,
      '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];
    let pdf = `%PDF-1.4\n% Black Fox Business Card Designer\n`;
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`;
    pdf += `trailer << /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(pdf.length);
    for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 0xff;
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${projectName.replace(/\W+/g, '-').toLowerCase()}-proof.pdf`);
  };

  const warnExportFonts = () => {
    const fonts = new Set<string>();
    exportableObjects().forEach((object) => {
      if (object instanceof Textbox && object.fontFamily) fonts.add(object.fontFamily);
    });
    const list = [...fonts].filter((font) => !font.includes('Arial') && !font.includes('Courier') && !font.includes('Georgia') && !font.includes('Trebuchet'));
    setExportNotice(list.length
      ? `Editable SVG exported. Make sure these fonts are installed on the engraving computer when opening the SVG: ${list.join(', ')}. Use PDF export when appearance must be preserved. Full Convert Text to Paths is coming in the next build.`
      : 'Editable SVG exported. Browser-safe fonts should remain editable; use PDF export when exact appearance is required.');
  };

  const exportSvgWithNotice = () => {
    void exportSideSvg(side);
    warnExportFonts();
  };

  const downloadProjectFile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveCurrentSide();
    const allObjects = [...canvas.getObjects()];
    const project = makeProjectFile({
      orientation,
      cardColor,
      front: sideDataRef.current.front || canvas.toJSON(),
      back: sideDataRef.current.back || null,
      uploadedGraphics: allObjects.map((object) => ({
        name: custom(object, 'blackFoxOriginalName', ''),
        kind: custom(object, 'blackFoxUploadKind', ''),
        width: custom(object, 'blackFoxOriginalWidth', ''),
        height: custom(object, 'blackFoxOriginalHeight', ''),
      })).filter((item) => item.name),
      fontInformation: allObjects.filter((object) => object instanceof Textbox).map((object) => ({ fontFamily: (object as Textbox).fontFamily, uploaded: custom(object, 'blackFoxFontDataUrl', '') ? true : false })),
      borderSettings: { borderCategory, borderMargin, borderStroke, borderRadius, borderDensity, borderMirrorX, borderMirrorY, borderCornerStyle },
      objectLayers: allObjects.map((object, index) => ({ index, type: object.type, visible: object.visible !== false })),
      lockedAndHiddenStates: allObjects.map((object, index) => ({ index, locked: custom(object, 'blackFoxLocked', false), hidden: object.visible === false })),
      exportPreferences: { pngDpi, pngTransparent, exportMockup, svgMode, svgInvert, svgFlatten, svgOutline },
    });
    downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), `${projectName.replace(/\W+/g, '-').toLowerCase()}.bfbcd.json`);
  };

  const handleProjectFileOpen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvasRef.current) return;
    try {
      const project = JSON.parse(await file.text()) as ProjectFilePayload;
      if (project.app !== 'Black Fox Business Card Designer') throw new Error('Not a Black Fox project file.');
      setProjectName(file.name.replace(/\.bfbcd\.json$|\.json$/i, ''));
      setOrientation(project.orientation);
      setCardColor(project.cardColor as CardColor);
      sideDataRef.current = { front: project.front, back: project.back };
      await openProject({
        id: uid(),
        name: file.name,
        updatedAt: Date.now(),
        orientation: project.orientation,
        cardColor: project.cardColor as CardColor,
        engravingMode,
        front: project.front,
        back: project.back,
      });
    } catch (error) {
      setExportNotice(`Project import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    event.target.value = '';
  };

  const placeRasterImage = async (src: string, fileName: string, replace = false) => {
    const htmlImage = await imageFromSource(src);
    const image = replace && canvasRef.current?.getActiveObject() instanceof FabricImage
      ? canvasRef.current.getActiveObject() as FabricImage
      : await FabricImage.fromURL(src);
    if (!replace) {
      image.scaleToWidth(Math.min(px(1.05), canvasWidth * 0.42));
      image.set({ originX: 'center', originY: 'center' });
    } else {
      await image.setSrc(src);
    }
    setCustom(image, 'blackFoxUploadKind', 'raster');
    setCustom(image, 'blackFoxOriginalSrc', src);
    setCustom(image, 'blackFoxOriginalName', fileName);
    setCustom(image, 'blackFoxOriginalWidth', htmlImage.naturalWidth);
    setCustom(image, 'blackFoxOriginalHeight', htmlImage.naturalHeight);
    setCustom(image, 'blackFoxBrightness', 0);
    setCustom(image, 'blackFoxContrast', 0);
    setCustom(image, 'blackFoxGrayscale', false);
    setCustom(image, 'blackFoxThreshold', 128);
    setCustom(image, 'blackFoxPrepared', false);
    setCustom(image, 'blackFoxCropInset', 0);
    const displayedWidth = image.getScaledWidth();
    const displayedHeight = image.getScaledHeight();
    const ppi = Math.min(htmlImage.naturalWidth / inches(displayedWidth), htmlImage.naturalHeight / inches(displayedHeight));
    setCustom(image, 'blackFoxLowResWarning', ppi < 250 ? `Raster source is about ${Math.round(ppi)} PPI at this size. For engraving, 300 PPI or higher is recommended.` : '');
    if (replace) {
      canvasRef.current?.renderAll();
      refreshSelection();
      remember();
    } else {
      addObject(image);
    }
  };

  const placeSvgGraphic = async (svgText: string, fileName: string, replace = false) => {
    const sanitized = sanitizeSvg(svgText);
    const result = await loadSVGFromString(sanitized);
    const graphic = util.groupSVGElements(result.objects.filter(Boolean) as FabricObject[], result.options);
    graphic.set({ fill: previewEngrave, stroke: previewEngrave, originX: 'center', originY: 'center' });
    setCustom(graphic, 'blackFoxUploadKind', 'svg');
    setCustom(graphic, 'blackFoxOriginalName', fileName);
    setCustom(graphic, 'blackFoxOriginalSrc', sanitized);
    graphic.scaleToWidth(Math.min(px(1.05), canvasWidth * 0.42));
    if (replace) deleteSelection();
    addObject(graphic);
  };

  const handleGraphicFile = async (file: File, replace = false) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'svg' || file.type === 'image/svg+xml') {
      await placeSvgGraphic(await file.text(), file.name, replace);
      return;
    }
    await placeRasterImage(await fileToDataUrl(file), file.name, replace);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleGraphicFile(file);
    event.target.value = '';
  };

  const handleReplaceImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleGraphicFile(file, true);
    event.target.value = '';
  };

  const applyRasterSettings = async (patch: Partial<{ brightness: number; contrast: number; grayscale: boolean; threshold: number; prepared: boolean; cropInset: number }>) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof FabricImage)) return;
    const src = custom<string>(active, 'blackFoxOriginalSrc', '');
    if (!src || custom<string>(active, 'blackFoxUploadKind', '') !== 'raster') return;
    const next = {
      brightness: custom(active, 'blackFoxBrightness', 0),
      contrast: custom(active, 'blackFoxContrast', 0),
      grayscale: custom(active, 'blackFoxGrayscale', false),
      threshold: custom(active, 'blackFoxThreshold', 128),
      prepared: custom(active, 'blackFoxPrepared', false),
      cropInset: custom(active, 'blackFoxCropInset', 0),
      ...patch,
    };
    await active.setSrc(await adjustedRasterDataUrl(src, next));
    setCustom(active, 'blackFoxBrightness', next.brightness);
    setCustom(active, 'blackFoxContrast', next.contrast);
    setCustom(active, 'blackFoxGrayscale', next.grayscale);
    setCustom(active, 'blackFoxThreshold', next.threshold);
    setCustom(active, 'blackFoxPrepared', next.prepared);
    setCustom(active, 'blackFoxCropInset', next.cropInset);
    active.setCoords();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const loadWebFont = async (family: string, css: string, fallback: string) => {
    const id = `bf-font-${family.replace(/\W+/g, '-')}`;
    if (!document.getElementById(id)) {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://fonts.gstatic.com';
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${css}&display=swap`;
      document.head.appendChild(link);
    }
    const stack = `"${family}", ${fallback}`;
    try {
      await document.fonts.load(`16px "${family}"`);
    } catch {
      // The CSS link may still load later; keep the family stack editable.
    }
    updateActive({ fontFamily: stack });
  };

  const handleFontUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const family = `Uploaded ${file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, ' ')}`.trim();
    const style = document.createElement('style');
    style.textContent = `@font-face{font-family:${JSON.stringify(family)};src:url(${JSON.stringify(dataUrl)});font-display:swap;}`;
    document.head.appendChild(style);
    setUploadedFonts((fonts) => [...new Set([...fonts, family])]);
    const active = canvasRef.current?.getActiveObject();
    if (active) {
      setCustom(active, 'blackFoxFontDataUrl', dataUrl);
      setCustom(active, 'blackFoxFontNotice', 'Uploaded font is stored locally for this browser project. Confirm you have permission to use it.');
    }
    updateActive({ fontFamily: `"${family}", sans-serif` });
    event.target.value = '';
  };

  const chooseLocalFont = async () => {
    const queryLocalFonts = (window as unknown as { queryLocalFonts?: () => Promise<{ family: string; fullName: string }[]> }).queryLocalFonts;
    if (!queryLocalFonts) {
      fontInputRef.current?.click();
      return;
    }
    try {
      const fontsAvailable = await queryLocalFonts();
      const names = [...new Set(fontsAvailable.map((font) => font.family))].slice(0, 30);
      const picked = window.prompt(`Choose a local font by typing one of these names:\n${names.join('\n')}`, names[0]);
      if (picked) updateActive({ fontFamily: `"${picked}", sans-serif` });
    } catch {
      fontInputRef.current?.click();
    }
  };

  const transformTextCase = (mode: 'upper' | 'lower') => {
    const active = canvasRef.current?.getActiveObject();
    if (!(active instanceof Textbox)) return;
    active.set({ text: mode === 'upper' ? active.text.toUpperCase() : active.text.toLowerCase() });
    canvasRef.current?.renderAll();
    refreshSelection();
    remember();
  };

  const centerActiveOnCard = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.centerObject(active);
    active.setCoords();
    canvas.renderAll();
    refreshSelection();
    remember();
  };

  const fitTextToWidth = () => {
    const active = canvasRef.current?.getActiveObject();
    if (!(active instanceof Textbox)) return;
    const width = Number(window.prompt('Fit selected text to width in inches:', String(selection?.width || 1.4)));
    if (!Number.isFinite(width) || width <= 0) return;
    active.set({ width: px(width) });
    canvasRef.current?.renderAll();
    refreshSelection();
    remember();
  };

  const curveActiveText = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof Textbox)) return;
    const text = active.text || '';
    if (!text.trim()) return;
    const radius = Math.max(active.width || px(1), px(0.75));
    const chars = [...text].map((char, index, arr) => {
      const angle = arr.length === 1 ? 0 : -55 + (110 * index) / (arr.length - 1);
      const rad = (angle * Math.PI) / 180;
      return new Textbox(char, {
        left: Math.cos(rad) * radius * 0.45,
        top: Math.sin(rad) * radius * 0.25,
        width: px(0.12),
        fontSize: active.fontSize,
        fontFamily: active.fontFamily,
        fontWeight: active.fontWeight,
        fontStyle: active.fontStyle,
        fill: active.fill,
        stroke: active.stroke,
        strokeWidth: active.strokeWidth,
        angle: angle + 90,
        originX: 'center',
        originY: 'center',
      });
    });
    const group = new FabricGroup(chars, { left: active.left, top: active.top, originX: 'center', originY: 'center' });
    canvas.remove(active);
    addObject(group);
  };

  const addQrCode = async () => {
    try {
      const payload = qrPayload(qrType, qrValue);
      const matrix = makeQrMatrix(payload, qrCorrection);
      const total = matrix.count + qrQuietZone * 2;
      const sizePx = px(qrSize);
      const cell = sizePx / total;
      const pieces: FabricObject[] = [
        new Rect({ left: 0, top: 0, width: sizePx, height: sizePx, fill: '#ffffff', stroke: 'none', excludeFromExport: true }),
      ];
      setCustom(pieces[0], 'blackFoxQrBackground', true);
      for (let row = 0; row < matrix.count; row += 1) {
        for (let col = 0; col < matrix.count; col += 1) {
          if (matrix.isDark(row, col)) {
            pieces.push(new Rect({
              left: (col + qrQuietZone) * cell,
              top: (row + qrQuietZone) * cell,
              width: Math.ceil(cell * 1000) / 1000,
              height: Math.ceil(cell * 1000) / 1000,
              fill: '#000000',
              stroke: 'none',
            }));
          }
        }
      }
      const qr = new FabricGroup(pieces, { originX: 'center', originY: 'center' });
      setCustom(qr, 'blackFoxUploadKind', 'qr');
      setCustom(qr, 'blackFoxQrSizeIn', qrSize);
      setCustom(qr, 'blackFoxQrPayload', payload);
      addObject(qr);
    } catch (error) {
      setExportNotice(`QR code creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const validateQr = () => {
    setExportNotice(qrSize < ENGRAVING_VALIDATION.minimumQrSizeIn
      ? `QR code is below ${ENGRAVING_VALIDATION.minimumQrSizeIn} in and may not engrave reliably.`
      : 'QR code size is within the practical starting range. Scan-test the exported proof before production.');
  };

  const checkDesign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const findings = validateDesign({
      cardWidthPx: canvasWidth,
      cardHeightPx: canvasHeight,
      backHasArtwork: Boolean(sideDataRef.current.back && JSON.stringify(sideDataRef.current.back).includes('"objects"')),
      objects: canvas.getObjects().filter((object) => !isGuide(object)).map((object, index) => {
        setCustom(object, 'blackFoxValidationId', `object-${index}`);
        const bounds = object.getBoundingRect();
        const originalWidth = custom<number>(object, 'blackFoxOriginalWidth', 0);
        const originalHeight = custom<number>(object, 'blackFoxOriginalHeight', 0);
        const rasterPpi = originalWidth && originalHeight
          ? Math.min(originalWidth / inches(bounds.width), originalHeight / inches(bounds.height))
          : undefined;
        return {
          id: `object-${index}`,
          type: object.type || 'object',
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          strokeWidth: Number(object.get('strokeWidth') || 0),
          fontSize: object instanceof Textbox ? Number(object.fontSize || 0) : undefined,
          hidden: object.visible === false,
          rasterPpi,
          qrSizeIn: custom<number | undefined>(object, 'blackFoxQrSizeIn', undefined),
          fontFamily: object instanceof Textbox ? object.fontFamily : undefined,
        };
      }),
    });
    setValidationFindings(findings);
    setShowValidation(true);
  };

  const selectFindingObject = (finding: ValidationFinding) => {
    const canvas = canvasRef.current;
    if (!canvas || !finding.objectId) return;
    const target = canvas.getObjects().find((object) => custom(object, 'blackFoxValidationId', '') === finding.objectId);
    if (!target) return;
    canvas.setActiveObject(target);
    canvas.renderAll();
    refreshSelection();
  };

  useEffect(() => {
    if (!canvasEl.current) return;
    const canvas = new Canvas(canvasEl.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: CARD_COLORS[cardColor].color,
      preserveObjectStacking: true,
      selection: true,
    });
    canvasRef.current = canvas;
    canvas.on('selection:created', refreshSelection);
    canvas.on('selection:updated', refreshSelection);
    canvas.on('selection:cleared', refreshSelection);
    canvas.on('object:moving', (event: FabricEvent) => {
      const target = event.target;
      if (!target) return;
      snapObject(target);
      keepOnCard(target);
      refreshSelection();
    });
    canvas.on('object:scaling', (event: FabricEvent) => {
      if (event.target) keepOnCard(event.target);
      refreshSelection();
    });
    canvas.on('object:rotating', refreshSelection);
    canvas.on('object:modified', () => {
      refreshSelection();
      remember();
    });
    applyGuides();
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    setSavedProjects(projectList());

    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    canvas.backgroundColor = CARD_COLORS[cardColor].color;
    applyGuides();
    canvas.renderAll();
  }, [applyGuides, canvasHeight, canvasWidth, cardColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportableObjects().forEach((object) => {
      const fill = String(object.get('fill') || '');
      const stroke = String(object.get('stroke') || '');
      if ([ENGRAVE_LIGHT, ENGRAVE_DARK].includes(fill)) object.set({ fill: previewEngrave });
      if ([ENGRAVE_LIGHT, ENGRAVE_DARK].includes(stroke)) object.set({ stroke: previewEngrave });
    });
    canvas.renderAll();
    refreshSelection();
  }, [exportableObjects, previewEngrave, refreshSelection]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      saveCurrentSide();
      const autosave: ProjectRecord = {
        id: 'autosave',
        name: projectName,
        updatedAt: Date.now(),
        orientation,
        cardColor,
        engravingMode,
        front: sideDataRef.current.front || canvas.toJSON(),
        back: sideDataRef.current.back || null,
      };
      localStorage.setItem('black-fox-autosave', JSON.stringify(autosave));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [cardColor, engravingMode, orientation, projectName, saveCurrentSide]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const canvas = canvasRef.current;
      const active = canvas?.getActiveObject();
      const target = event.target as HTMLElement;
      const editingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (active instanceof Textbox && active.isEditing);
      const meta = event.metaKey || event.ctrlKey;
      if (editingText && !(meta && ['c', 'v', 'z'].includes(event.key.toLowerCase()))) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }
      if (meta && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        void copySelection();
      }
      if (meta && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        void pasteSelection();
      }
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) void redo();
        else void undo();
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && canvas && active) {
        event.preventDefault();
        const delta = event.shiftKey ? px(0.05) : px(0.01);
        const move = {
          ArrowLeft: { left: (active.left || 0) - delta },
          ArrowRight: { left: (active.left || 0) + delta },
          ArrowUp: { top: (active.top || 0) - delta },
          ArrowDown: { top: (active.top || 0) + delta },
        }[event.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'];
        active.set(move);
        keepOnCard(active);
        active.setCoords();
        canvas.renderAll();
        refreshSelection();
        remember();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [copySelection, deleteSelection, keepOnCard, pasteSelection, redo, refreshSelection, remember, undo]);

  const rulerX = Array.from({ length: Math.floor(size.width * 4) + 1 }, (_, index) => index / 4);
  const rulerY = Array.from({ length: Math.floor(size.height * 4) + 1 }, (_, index) => index / 4);

  return (
    <div className={`app ${highContrast ? 'high-contrast' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="fox-mark">BF</div>
          <div>
            <h1>Black Fox Business Card Designer</h1>
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Project name" />
          </div>
        </div>
        <div className="toolbar">
          <IconButton title="New" onClick={newProject}><Plus size={18} /></IconButton>
          <IconButton title="Open Project" onClick={() => { setSavedProjects(projectList()); setShowOpen(true); }}><ArchiveRestore size={18} /></IconButton>
          <input ref={projectFileInputRef} type="file" accept=".json,.bfbcd.json,application/json" hidden onChange={handleProjectFileOpen} />
          <IconButton title="Save Project" onClick={saveProject}><Save size={18} /></IconButton>
          <IconButton title="Restore Autosave" onClick={() => void restoreAutosave()}><ArchiveRestore size={18} /></IconButton>
          <span className="divider" />
          <IconButton title="Undo" onClick={undo}><Undo2 size={18} /></IconButton>
          <IconButton title="Redo" onClick={redo}><Redo2 size={18} /></IconButton>
          <IconButton title="Copy" onClick={copySelection}><Copy size={18} /></IconButton>
          <IconButton title="Paste" onClick={pasteSelection}><Upload size={18} /></IconButton>
          <IconButton title="Duplicate" onClick={duplicateSelection}><FlipHorizontal size={18} /></IconButton>
          <IconButton title="Delete" onClick={deleteSelection}><Trash2 size={18} /></IconButton>
          <span className="divider" />
          <IconButton title="Preview" onClick={() => setShowPreview(true)}><Eye size={18} /></IconButton>
          <IconButton title="Check My Design" onClick={checkDesign}><Wand2 size={18} /></IconButton>
          <IconButton title="Export" onClick={() => setShowExportDialog(true)}><Download size={18} /></IconButton>
          <IconButton title="High Contrast" active={highContrast} onClick={() => setHighContrast((value) => !value)}><Eye size={18} /></IconButton>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel left-panel">
          <section>
            <h2><PanelLeft size={17} /> Add</h2>
            <button className="tool-row" onClick={() => addText('custom')}><Type size={18} /> Add Text</button>
            <button className="tool-row" onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} /> Upload Graphic</button>
            <input ref={fileInputRef} type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={handleImageUpload} />
            <input ref={replaceFileInputRef} type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={handleReplaceImage} />
            <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" hidden onChange={handleFontUpload} />
          </section>

          <section>
            <h2><Type size={17} /> Text Objects</h2>
            <div className="button-grid">
              {(['name', 'title', 'business', 'phone', 'email', 'website', 'address', 'custom'] as TextKind[]).map((kind) => (
                <button key={kind} onClick={() => addText(kind)}>{textPreset(kind).label}</button>
              ))}
            </div>
          </section>

          <section>
            <h2><Square size={17} /> Shapes</h2>
            <div className="button-grid">
              <button onClick={() => addShape('rect')}><Square size={17} /> Rectangle</button>
              <button onClick={() => addShape('roundRect')}><Square size={17} /> Rounded</button>
              <button onClick={() => addShape('circle')}><Circle size={17} /> Circle</button>
              <button onClick={() => addShape('oval')}><Circle size={17} /> Oval</button>
              <button onClick={() => addShape('line')}><Minus size={17} /> Line</button>
              <button onClick={() => addShape('dashedLine')}><Minus size={17} /> Dashed</button>
              <button onClick={() => addShape('hDivider')}><MoveHorizontal size={17} /> H Divider</button>
              <button onClick={() => addShape('vDivider')}><MoveVertical size={17} /> V Divider</button>
              <button onClick={() => addShape('diamond')}>Diamond</button>
              <button onClick={() => addShape('hexagon')}>Hexagon</button>
              <button onClick={() => addShape('star')}>Star</button>
            </div>
          </section>

          <section>
            <h2><Layers size={17} /> Borders</h2>
            <div className="slider-stack">
              <label>Margin {borderMargin.toFixed(2)} in<input type="range" min="0.04" max="0.25" step="0.01" value={borderMargin} onChange={(event) => setBorderMargin(Number(event.target.value))} /></label>
              <label>Line {borderStroke.toFixed(3)} in<input type="range" min="0.006" max="0.04" step="0.002" value={borderStroke} onChange={(event) => setBorderStroke(Number(event.target.value))} /></label>
              <label>Radius {borderRadius.toFixed(2)} in<input type="range" min="0" max="0.25" step="0.01" value={borderRadius} onChange={(event) => setBorderRadius(Number(event.target.value))} /></label>
              <label>Density {borderDensity}<input type="range" min="3" max="14" step="1" value={borderDensity} onChange={(event) => setBorderDensity(Number(event.target.value))} /></label>
            </div>
            <div className="toggles small-toggles">
              <label><input type="checkbox" checked={borderMirrorX} onChange={(event) => setBorderMirrorX(event.target.checked)} /> Mirror H</label>
              <label><input type="checkbox" checked={borderMirrorY} onChange={(event) => setBorderMirrorY(event.target.checked)} /> Mirror V</label>
            </div>
            <details className="border-style-menu">
              <summary>Choose border style</summary>
              <div className="button-grid preset-grid">
                {Array.from({ length: BORDER_STYLE_COUNT }, (_, index) => {
                  const kind = BORDER_STYLE_KINDS[index];
                  return (
                    <button
                      key={`${borderCategory}-${kind}`}
                      className="border-preview-button"
                      onClick={() => addBorder(index)}
                      title={`${BORDER_STYLE_LABELS[kind]} border`}
                    >
                      <img src={borderPreviewSvg(index, 'Simple line')} alt="" />
                      <span>{BORDER_STYLE_LABELS[kind]}</span>
                    </button>
                  );
                })}
              </div>
            </details>
            <div className="button-grid">
              <button onClick={() => void applyBorderToSide('front')}>Apply to front</button>
              <button onClick={() => void applyBorderToSide('back')}>Apply to back</button>
              <button onClick={() => addCornerElement(1)}>1 Corner</button>
              <button onClick={() => addCornerElement(2)}>2 Corners</button>
              <button onClick={() => addCornerElement(4)}>4 Corners</button>
              <button onClick={() => removeBorders()}>Remove Border</button>
            </div>
          </section>

          <section>
            <h2><Grid3X3 size={17} /> QR Code</h2>
            <label className="compact-label">Type
              <select value={qrType} onChange={(event) => setQrType(event.target.value as QrType)}>
                <option value="website">Website</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="wifi">Wi-Fi</option>
                <option value="vcard">vCard contact</option>
              </select>
            </label>
            <label className="compact-label">QR content
              <input value={qrValue} onChange={(event) => setQrValue(event.target.value)} />
            </label>
            <div className="slider-stack">
              <label>Size {qrSize.toFixed(2)} in<input type="range" min="0.35" max="1.25" step="0.05" value={qrSize} onChange={(event) => setQrSize(Number(event.target.value))} /></label>
              <label>Quiet zone {qrQuietZone}<input type="range" min="2" max="8" step="1" value={qrQuietZone} onChange={(event) => setQrQuietZone(Number(event.target.value))} /></label>
            </div>
            <label className="compact-label">Error correction
              <select value={qrCorrection} onChange={(event) => setQrCorrection(event.target.value as QrCorrection)}>
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H">H</option>
              </select>
            </label>
            {qrSize < ENGRAVING_VALIDATION.minimumQrSizeIn && <div className="warning">QR code may be too small for dependable engraving.</div>}
            <div className="button-grid">
              <button onClick={() => void addQrCode()}>Add QR</button>
              <button onClick={validateQr}>Validate QR</button>
            </div>
          </section>

          <section>
            <h2><Palette size={17} /> Templates</h2>
            <div className="button-grid">
              <button onClick={() => addTemplate('corporate')}>Professional corporate</button>
              <button onClick={() => addTemplate('minimal')}>Modern minimal</button>
              <button onClick={() => addTemplate('elegant')}>Elegant</button>
              <button onClick={() => addTemplate('realestate')}>Real estate</button>
              <button onClick={() => addTemplate('education')}>Educational consultant</button>
              <button onClick={() => addTemplate('stem')}>STEM consultant</button>
              <button onClick={() => addTemplate('creative')}>Creative business</button>
              <button onClick={() => addTemplate('beauty')}>Beauty business</button>
              <button onClick={() => addTemplate('construction')}>Construction</button>
              <button onClick={() => addTemplate('technology')}>Technology</button>
              <button onClick={() => addTemplate('photography')}>Photography</button>
              <button onClick={() => addTemplate('vertical')}>Vertical executive</button>
            </div>
            <button className="tool-row" onClick={() => addTemplate('corporate')}>Load Sample Project</button>
          </section>
        </aside>

        <section className="center-panel">
          <div className="canvas-controls">
            <div className="tabs">
              <button className={side === 'front' ? 'active' : ''} onClick={() => void switchSide('front')}>Front</button>
              <button className={side === 'back' ? 'active' : ''} onClick={() => void switchSide('back')}>Back</button>
            </div>
            <label>
              Orientation
              <select value={orientation} onChange={(event) => setOrientation(event.target.value as Orientation)}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
            <div className="swatches" aria-label="Card color preview selector">
              {(Object.keys(CARD_COLORS) as CardColor[]).map((color) => (
                <button
                  key={color}
                  className={cardColor === color ? 'active' : ''}
                  title={CARD_COLORS[color].label}
                  onClick={() => setCardColor(color)}
                >
                  <span style={{ background: CARD_COLORS[color].color }} />
                  {CARD_COLORS[color].label}
                </button>
              ))}
            </div>
            <label>
              Engraving
              <select value={engravingMode} onChange={(event) => setEngravingMode(event.target.value as EngraveMode)}>
                <option value="auto">Auto preview</option>
                <option value="light">Light preview</option>
                <option value="dark">Dark preview</option>
              </select>
            </label>
          </div>

          <div className="canvas-stage">
            <div className="ruler corner" />
            <div className="ruler x-ruler" style={{ width: canvasWidth * zoom }}>
              {rulerX.map((mark) => <span key={mark} style={{ left: mark * DPI * zoom }}>{mark % 1 === 0 ? `${mark}"` : ''}</span>)}
            </div>
            <div className="ruler y-ruler" style={{ height: canvasHeight * zoom }}>
              {rulerY.map((mark) => <span key={mark} style={{ top: mark * DPI * zoom }}>{mark % 1 === 0 ? `${mark}"` : ''}</span>)}
            </div>
            <div className="canvas-shell" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
              <canvas
                ref={canvasEl}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              />
            </div>
          </div>

          <div className="bottom-controls">
            <div className="zoom-controls">
              <IconButton title="Zoom out" onClick={() => setZoom((value) => clamp(value - 0.08, 0.25, 1.25))}><ZoomOut size={18} /></IconButton>
              <button onClick={() => setZoom(1)}>100%</button>
              <button onClick={() => setZoom(0.72)}><Maximize size={16} /> Fit</button>
              <IconButton title="Zoom in" onClick={() => setZoom((value) => clamp(value + 0.08, 0.25, 1.25))}><ZoomIn size={18} /></IconButton>
              <strong>{Math.round(zoom * 100)}%</strong>
            </div>
            <div className="toggles">
              <label><input type="checkbox" checked={gridVisible} onChange={(event) => setGridVisible(event.target.checked)} /> Grid</label>
              <label><input type="checkbox" checked={guidesVisible} onChange={(event) => setGuidesVisible(event.target.checked)} /> Safe area</label>
              <label><input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} /> Snap</label>
            </div>
          </div>
        </section>

        <aside className="panel right-panel">
          <section>
            <h2><PanelRight size={17} /> Properties</h2>
            {!selection ? (
              <div className="empty-state">Select an object to edit position, size, typography, stroke, fill, layers, lock, or visibility.</div>
            ) : (
              <>
                <div className="selection-name">{selection.type}</div>
                <div className="property-grid">
                  <label>X<input type="number" step="0.01" value={selection.left} onChange={(event) => updateActive({ left: event.target.value })} /></label>
                  <label>Y<input type="number" step="0.01" value={selection.top} onChange={(event) => updateActive({ top: event.target.value })} /></label>
                  <label>W<input type="number" step="0.01" value={selection.width} onChange={(event) => updateActive({ width: event.target.value })} /></label>
                  <label>H<input type="number" step="0.01" value={selection.height} onChange={(event) => updateActive({ height: event.target.value })} /></label>
                  <label>Rot<input type="number" step="1" value={selection.angle} onChange={(event) => updateActive({ angle: Number(event.target.value) })} /></label>
                </div>
                {selection.fontFamily && (
                  <div className="font-controls">
                    <label>Font
                      <select value={selection.fontFamily} onChange={(event) => updateActive({ fontFamily: event.target.value })}>
                        {BROWSER_SAFE_FONTS.map((font) => <option key={font} value={font}>{font.replace(/,.*/, '')}</option>)}
                        {uploadedFonts.map((font) => <option key={font} value={`"${font}", sans-serif`}>{font}</option>)}
                      </select>
                    </label>
                    <label>Open-source fonts
                      <select value={fontCategory} onChange={(event) => setFontCategory(event.target.value)}>
                        {Object.keys(FONT_LIBRARY).map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <div className="button-grid font-picks">
                      {FONT_LIBRARY[fontCategory].map((font) => (
                        <button key={font.family} onClick={() => void loadWebFont(font.family, font.css, font.fallback)}>{font.family}</button>
                      ))}
                    </div>
                    <div className="notice">Uploaded fonts stay local to this browser/project. Use only fonts you have permission to use. Local system font access is browser-dependent.</div>
                    <div className="button-grid">
                      <button onClick={() => fontInputRef.current?.click()}>Upload Font</button>
                      <button onClick={() => void chooseLocalFont()}>Choose Local Font</button>
                    </div>
                    <label>Size<input type="number" value={selection.fontSize} onChange={(event) => updateActive({ fontSize: event.target.value })} /></label>
                    <label>Letter spacing<input type="number" step="10" value={selection.charSpacing} onChange={(event) => updateActive({ charSpacing: Number(event.target.value) })} /></label>
                    <label>Line spacing<input type="number" step="0.05" value={selection.lineHeight} onChange={(event) => updateActive({ lineHeight: Number(event.target.value) })} /></label>
                    <div className="icon-row">
                      <IconButton title="Align text left" active={selection.textAlign === 'left'} onClick={() => updateActive({ textAlign: 'left' })}><AlignLeft size={17} /></IconButton>
                      <IconButton title="Align text center" active={selection.textAlign === 'center'} onClick={() => updateActive({ textAlign: 'center' })}><AlignCenter size={17} /></IconButton>
                      <IconButton title="Align text right" active={selection.textAlign === 'right'} onClick={() => updateActive({ textAlign: 'right' })}><AlignRight size={17} /></IconButton>
                      <IconButton title="Bold" active={selection.fontWeight === '700'} onClick={() => updateActive({ fontWeight: selection.fontWeight === '700' ? '400' : '700' })}><Bold size={17} /></IconButton>
                      <IconButton title="Italic" active={selection.fontStyle === 'italic'} onClick={() => updateActive({ fontStyle: selection.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={17} /></IconButton>
                      <IconButton title="Underline" active={selection.underline} onClick={() => updateActive({ underline: !selection.underline })}><Underline size={17} /></IconButton>
                    </div>
                    <div className="button-grid">
                      <button onClick={() => transformTextCase('upper')}><CaseSensitive size={16} /> Uppercase</button>
                      <button onClick={() => transformTextCase('lower')}><CaseSensitive size={16} /> Lowercase</button>
                      <button onClick={centerActiveOnCard}>Center on card</button>
                      <button onClick={fitTextToWidth}>Fit to width</button>
                      <button onClick={curveActiveText}>Curve text</button>
                      <button disabled title="Coming in the next build">Convert Text to Paths</button>
                    </div>
                  </div>
                )}
                {selection.isImage && (
                  <div className="image-controls">
                    <h3>Graphic</h3>
                    <div className="button-grid">
                      <button onClick={() => replaceFileInputRef.current?.click()}><ImageUp size={16} /> Replace Image</button>
                      <button onClick={() => withSelection((objects) => objects.forEach((object) => object.set({ flipX: !object.flipX })))}><FlipHorizontal size={16} /> Flip H</button>
                      <button onClick={() => withSelection((objects) => objects.forEach((object) => object.set({ flipY: !object.flipY })))}><FlipVertical size={16} /> Flip V</button>
                      <button disabled title="Coming in the next build">Remove Background</button>
                    </div>
                    <label>Opacity<input type="range" min="0.05" max="1" step="0.05" value={selection.opacity} onChange={(event) => updateActive({ opacity: Number(event.target.value) })} /></label>
                    {selection.imageWarning && <div className="warning">{selection.imageWarning}</div>}
                    {selection.isRaster ? (
                      <>
                        <label>Crop inset {selection.imageCropInset}%<input type="range" min="0" max="40" step="1" value={selection.imageCropInset} onChange={(event) => void applyRasterSettings({ cropInset: Number(event.target.value) })} /></label>
                        <label>Brightness {selection.imageBrightness}<input type="range" min="-100" max="100" step="1" value={selection.imageBrightness} onChange={(event) => void applyRasterSettings({ brightness: Number(event.target.value) })} /></label>
                        <label>Contrast {selection.imageContrast}<input type="range" min="-100" max="100" step="1" value={selection.imageContrast} onChange={(event) => void applyRasterSettings({ contrast: Number(event.target.value) })} /></label>
                        <label>Threshold {selection.imageThreshold}<input type="range" min="1" max="254" step="1" value={selection.imageThreshold} onChange={(event) => void applyRasterSettings({ threshold: Number(event.target.value), prepared: selection.imagePrepared })} /></label>
                        <div className="button-grid">
                          <button onClick={() => void applyRasterSettings({ grayscale: !selection.imageGrayscale })}>Grayscale {selection.imageGrayscale ? 'On' : 'Off'}</button>
                          <button onClick={() => void applyRasterSettings({ prepared: true, grayscale: true })}><Wand2 size={16} /> Prepare for Engraving</button>
                          <button onClick={() => void applyRasterSettings({ prepared: false, grayscale: false, brightness: 0, contrast: 0, threshold: 128, cropInset: 0 })}>Reset Image</button>
                          <button onClick={() => void applyRasterSettings({ cropInset: Math.min(40, (selection.imageCropInset || 0) + 5) })}><Scissors size={16} /> Crop +5%</button>
                        </div>
                      </>
                    ) : (
                      <div className="notice">SVG imported as sanitized vector artwork. Scripts, embedded images, and unsafe external content are removed before rendering.</div>
                    )}
                  </div>
                )}
                <div className="color-controls">
                  <label>Fill<input type="color" value={selection.fill.startsWith('#') ? selection.fill : previewEngrave} onChange={(event) => updateActive({ fill: event.target.value })} /></label>
                  <label>Stroke<input type="color" value={selection.stroke.startsWith('#') ? selection.stroke : previewEngrave} onChange={(event) => updateActive({ stroke: event.target.value })} /></label>
                  <label>Stroke width<input type="number" min="0" value={selection.strokeWidth} onChange={(event) => updateActive({ strokeWidth: event.target.value })} /></label>
                </div>

                <div className="action-group">
                  <h3>Align</h3>
                  <div className="icon-row wrap">
                    <IconButton title="Align left" onClick={() => align('left')}><AlignLeft size={17} /></IconButton>
                    <IconButton title="Align center" onClick={() => align('center')}><AlignCenter size={17} /></IconButton>
                    <IconButton title="Align right" onClick={() => align('right')}><AlignRight size={17} /></IconButton>
                    <IconButton title="Align top" onClick={() => align('top')}><MoveVertical size={17} /></IconButton>
                    <IconButton title="Align middle" onClick={() => align('middle')}><Minus size={17} /></IconButton>
                    <IconButton title="Align bottom" onClick={() => align('bottom')}><MoveHorizontal size={17} /></IconButton>
                    <IconButton title="Distribute horizontally" onClick={() => distribute('x')}><AlignHorizontalDistributeCenter size={17} /></IconButton>
                    <IconButton title="Distribute vertically" onClick={() => distribute('y')}><AlignVerticalDistributeCenter size={17} /></IconButton>
                  </div>
                </div>

                <div className="action-group">
                  <h3>Layers</h3>
                  <div className="icon-row wrap">
                    <IconButton title="Bring to front" onClick={() => layer('front')}><BringToFront size={17} /></IconButton>
                    <IconButton title="Bring forward" onClick={() => layer('forward')}><Plus size={17} /></IconButton>
                    <IconButton title="Send backward" onClick={() => layer('backward')}><Minus size={17} /></IconButton>
                    <IconButton title="Send to back" onClick={() => layer('back')}><SendToBack size={17} /></IconButton>
                    <IconButton title="Group" onClick={groupSelection}><Group size={17} /></IconButton>
                    <IconButton title="Ungroup" onClick={ungroupSelection}><Ungroup size={17} /></IconButton>
                  </div>
                </div>

                <div className="action-group">
                  <h3>Object</h3>
                  <div className="icon-row wrap">
                    <IconButton title={selection.locked ? 'Unlock' : 'Lock'} onClick={() => withSelection((objects) => objects.forEach((object) => setObjectLock(object, !selection.locked)))}>
                      {selection.locked ? <Unlock size={17} /> : <Lock size={17} />}
                    </IconButton>
                    <IconButton title={selection.visible ? 'Hide' : 'Show'} onClick={() => updateActive({ visible: !selection.visible })}>
                      {selection.visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </IconButton>
                    <IconButton title="Rotate 90 degrees" onClick={() => updateActive({ angle: (selection.angle + 90) % 360 })}><RotateCw size={17} /></IconButton>
                  </div>
                </div>
              </>
            )}
          </section>
        </aside>
      </main>

      {showOpen && (
        <div className="modal-backdrop" onClick={() => setShowOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Open Project</h2>
            <button className="tool-row" onClick={() => projectFileInputRef.current?.click()}>Open Project File</button>
            {savedProjects.length === 0 ? <p>No saved local projects yet.</p> : savedProjects.map((project) => (
              <button className="project-row" key={project.id} onClick={() => void openProject(project)}>
                <strong>{project.name}</strong>
                <span>{new Date(project.updatedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showExportDialog && (
        <div className="modal-backdrop" onClick={() => setShowExportDialog(false)}>
          <div className="modal export-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Export</h2>
            <div className="export-grid">
              <label>SVG artwork mode
                <select value={svgMode} onChange={(event) => setSvgMode(event.target.value as SvgExportMode)}>
                  <option value="both">Strokes and fills</option>
                  <option value="strokes">Strokes only</option>
                  <option value="fills">Fills only</option>
                </select>
              </label>
              <label>PNG DPI
                <select value={pngDpi} onChange={(event) => setPngDpi(Number(event.target.value))}>
                  <option value={300}>300 DPI</option>
                  <option value={600}>600 DPI</option>
                  <option value={1200}>1200 DPI</option>
                </select>
              </label>
              <label><input type="checkbox" checked={svgInvert} onChange={(event) => setSvgInvert(event.target.checked)} /> Invert black and white</label>
              <label><input type="checkbox" checked={svgFlatten} onChange={(event) => setSvgFlatten(event.target.checked)} /> Flatten/simplify transforms</label>
              <label><input type="checkbox" checked={svgOutline} onChange={(event) => setSvgOutline(event.target.checked)} /> Include card-outline layer</label>
              <label><input type="checkbox" checked={pngTransparent} onChange={(event) => setPngTransparent(event.target.checked)} /> Transparent PNG background</label>
              <label><input type="checkbox" checked={exportMockup} onChange={(event) => setExportMockup(event.target.checked)} /> Export Mockup color</label>
            </div>
            <div className="button-grid export-buttons">
              <button onClick={() => void exportSideSvg('front')}>Download Front SVG</button>
              <button onClick={() => void exportSideSvg('back')}>Download Back SVG</button>
              <button onClick={() => void exportBothZip()}>Download Both as ZIP</button>
              <button onClick={() => void exportPreviewPng()}>Download Preview PNG</button>
              <button onClick={exportPdf}>Download PDF Proof</button>
              <button onClick={downloadProjectFile}>Download Project File</button>
            </div>
            <div className="notice">SVG is the primary xTool-ready export. It exports black artwork only and excludes rulers, grids, safe-area guides, selection boxes, and preview card color.</div>
          </div>
        </div>
      )}

      {showValidation && (
        <div className="modal-backdrop" onClick={() => setShowValidation(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Design Check</h2>
            {validationFindings.length === 0 ? (
              <div className="notice">No production issues found with the current thresholds.</div>
            ) : validationFindings.map((finding, index) => (
              <button className={`finding ${finding.severity.toLowerCase()}`} key={`${finding.message}-${index}`} onClick={() => selectFindingObject(finding)}>
                <strong>{finding.severity}</strong>
                <span>{finding.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showPreview && (
        <div className="modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="preview-modal full-preview" onClick={(event) => event.stopPropagation()}>
            <h2>Preview</h2>
            <div className="preview-options">
              <span>Design artwork</span>
              <span>Engraving simulation</span>
              <span>Zoomed detail</span>
              <span>100% actual-size depends on screen calibration</span>
            </div>
            <div className="color-preview-grid">
              {(Object.keys(CARD_COLORS) as CardColor[]).map((color) => (
                <div key={color} className="mockup-wrap">
                  <h3>{CARD_COLORS[color].label}</h3>
                  <div className="preview-card metallic" style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}`, backgroundColor: CARD_COLORS[color].color }}>
                    <canvas
                      width={canvasWidth}
                      height={canvasHeight}
                      ref={(node) => {
                        if (!node) return;
                        const context = node.getContext('2d');
                        const source = canvasEl.current;
                        if (context && source) context.drawImage(source, 0, 0);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPreview(false)}>Close</button>
          </div>
        </div>
      )}

      {showWalkthrough && (
        <div className="modal-backdrop">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Quick Start</h2>
            <p>Choose a template or add text, upload graphics, check the safe area, then use Export for xTool-ready SVG files.</p>
            <p>Autosave runs locally in this browser. Use Check My Design before sending artwork to the laser.</p>
            <button className="tool-row" onClick={() => { localStorage.setItem('black-fox-walkthrough-seen', 'true'); setShowWalkthrough(false); }}>Start Designing</button>
          </div>
        </div>
      )}

      {exportNotice && (
        <div className="modal-backdrop" onClick={() => setExportNotice(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Export Notice</h2>
            <p>{exportNotice}</p>
            <button className="tool-row" onClick={() => setExportNotice(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
