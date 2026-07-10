# Black Fox Business Card Designer

A browser-based React + TypeScript app for designing anodized aluminum business cards for laser engraving with tools such as the xTool F2 or xTool M1.

## Features

- Real-world business card sizing: 3.5 x 2 in landscape or 2 x 3.5 in portrait.
- Fabric.js design canvas with rulers, grid, safe-area guide, snapping, front/back sides, and card color previews.
- Text tools, uploaded graphics, vector shapes, QR codes, editable templates, and border tools.
- Laser-ready SVG export, PNG export, PDF proof, ZIP front/back export, and project JSON export.
- Local project saving and autosave in the browser.
- Render Static Site deployment configuration included.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm run dev
```

Open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Tests

Run automated tests:

```bash
pnpm run test
```

## Production Build

Create a production build:

```bash
pnpm run build
```

The production files will be generated in:

```text
dist/
```

## Render Deployment

This project includes `render.yaml` for Render Static Site deployment.

Render uses:

```bash
pnpm install --frozen-lockfile && pnpm run build
```

Publish directory:

```text
dist
```

## Notes

- SVG is the primary laser-ready export format.
- Card color previews are visual simulations and are excluded from laser-ready SVG exports.
- QR code generation uses vector artwork and should still be scan-tested before production engraving.
