# Build & Optimize

## Prereqs

```bash
npm install
```

## Build

```bash
npm run build
```

Outputs to `dist/` with:

- Bundled & minified JS (esbuild)
- Minified CSS (PostCSS + cssnano + autoprefixer)
- Content-hashed filenames for cache busting
- Original PHP and static files copied through

## Dev (rebuild on change)

```bash
npm run watch
```

## Preview build

```bash
npm run serve:dist
```
