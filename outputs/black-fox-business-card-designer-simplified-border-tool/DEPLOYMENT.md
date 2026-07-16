# Deployment Guide

## GitHub

1. Create a new GitHub repository.
2. Push this project folder to the repository.
3. Confirm these files are included:
   - `package.json`
   - `pnpm-lock.yaml`
   - `src/`
   - `index.html`
   - `vite.config.ts`
   - `tsconfig.json`
   - `tsconfig.test.json`
   - `render.yaml`
   - `README.md`

Do not commit:

- `node_modules/`
- `dist/`
- `dist-tests/`

These are ignored by `.gitignore`.

## Render Static Site

1. In Render, choose **New +**.
2. Select **Static Site**.
3. Connect the GitHub repository.
4. Render should detect `render.yaml`.
5. If setting up manually:
   - Build Command: `pnpm install --frozen-lockfile && pnpm run build`
   - Publish Directory: `dist`
6. Deploy.

## Webador

Use the Render live URL as a link from Webador, such as:

```html
<a href="https://your-render-url.onrender.com" target="_blank" rel="noopener">Open Black Fox Business Card Designer</a>
```
