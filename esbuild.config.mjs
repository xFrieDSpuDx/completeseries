/* eslint-env node */
/**
 * Production build for CompleteSeries
 * -----------------------------------
 * - Bundles ALL JS referenced in ANY HTML page into a single hashed file.
 * - Reads ONLY stylesheet links from `index.html`, minifies each, writes hashed CSS files.
 * - Removes every legacy stylesheet link (rel=stylesheet or href in styles/*) and all <script src> tags.
 * - Rewrites every HTML to reference only the hashed CSS + JS, using per-page relative URLs.
 * - Copies `assets/` and `php/` directories into `dist/`.
 * - Forces fresh file names (hashes) on EVERY build via a per-run build ID banner.
 */

import * as esbuild from "esbuild";
import { parse } from "node-html-parser";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import process from "process";

/** Output directory for built files. */
const OUTPUT_DIRECTORY = "dist";

/** If true, scan subdirectories for HTML too; otherwise only project root. */
const SHOULD_RECURSE_FOR_HTML = false;

/** Folders copied verbatim into OUTPUT_DIRECTORY. */
const PASSTHROUGH_DIRECTORIES = ["assets", "php"];

/** Unique build ID to force fresh hashes on every build (even if content is unchanged). */
const BUILD_ID = (() => {
  const randomFragment = Math.random().toString(36).slice(2, 10);
  const timestampFragment = Date.now().toString(36);
  return `${timestampFragment}${randomFragment}`;
})();

/* -------------------------------------------------------
 * Utility helpers
 * ----------------------------------------------------- */

const ensureDirectory = (directoryPath) => fs.mkdir(directoryPath, { recursive: true });
const readTextFile = (filePath) => fs.readFile(filePath, "utf8");
const writeTextFile = (filePath, content) => fs.writeFile(filePath, content, "utf8");
const toPosixPath = (filePath) => filePath.split(path.sep).join("/");

/** Strip ?query and #hash from a URL-like string. */
const stripQueryOrHash = (href = "") => href.replace(/[?#].*$/, "");

/** True if href points to an external URL (CDN, absolute HTTP(S), protocol-relative). */
const isExternalUrl = (href) => /^https?:\/\//i.test(href) || href.startsWith("//");

/**
 * Resolve an asset href relative to the HTML file that references it,
 * returning a project-root-relative POSIX path suitable for esbuild imports.
 * Returns null for external URLs.
 */
function resolvePathFromHtml(htmlFilePath, href) {
  if (!href || isExternalUrl(href)) return null;
  const cleaned = stripQueryOrHash(href).replace(/^\//, "");
  const absolute = path.resolve(path.dirname(htmlFilePath), cleaned);
  return toPosixPath(path.relative(".", absolute));
}

/** De-duplicate while preserving first-seen order. */
function dedupePreserveOrder(list) {
  const seenValues = new Set();
  const ordered = [];
  for (const item of list) {
    if (!seenValues.has(item)) {
      seenValues.add(item);
      ordered.push(item);
    }
  }
  return ordered;
}

/** Fail early with a readable error if any required files are missing. */
async function verifyFilesExist(label, filePaths) {
  const missingPaths = [];
  for (const candidate of filePaths) {
    try {
      await fs.stat(candidate);
    } catch {
      missingPaths.push(candidate);
    }
  }
  if (missingPaths.length) {
    globalThis.console.error(`\n✘ Missing ${label}:`);
    for (const missing of missingPaths) {
      globalThis.console.error(`  - ${missing}`);
    }
    globalThis.console.error("\nFix the paths and re-run the build.\n");
    globalThis.process.exit(1);
  }
}

/* -------------------------------------------------------
 * JS bundling
 * ----------------------------------------------------- */

/**
 * Create a small virtual entry that imports all script files in the correct order.
 * @param {string[]} scriptPaths project-root-relative paths
 * @param {string} entryVirtualFile path to write (e.g., .build/bundle-entry.js)
 */
async function createVirtualJsEntry(scriptPaths, entryVirtualFile) {
  const entryDirectory = path.dirname(entryVirtualFile);
  const importLines = scriptPaths.map((projectRelativePath) => {
    const absoluteImportPath = path.resolve(".", projectRelativePath);
    let relativeFromEntry = path.relative(entryDirectory, absoluteImportPath);
    if (!relativeFromEntry.startsWith(".")) relativeFromEntry = `./${relativeFromEntry}`;
    return `/* build:${BUILD_ID} */\nimport "${toPosixPath(relativeFromEntry)}";`;
  });
  await ensureDirectory(entryDirectory);
  await writeTextFile(entryVirtualFile, importLines.join("\n"));
}

/**
 * Run esbuild to output one hashed JS bundle into OUTPUT_DIRECTORY/assets/.
 * @returns {Promise<string>} dist-relative path to the emitted JS bundle (e.g., "assets/bundle-<hash>.js")
 */
async function bundleJavaScript(entryVirtualFile) {
  const buildResult = await esbuild.build({
    entryPoints: [entryVirtualFile],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: "es2019",
    outdir: OUTPUT_DIRECTORY,
    entryNames: "assets/bundle-[hash]",
    assetNames: "assets/[name]-[hash]",
    chunkNames: "assets/chunk-[name]-[hash]",
    define: {
      "process.env.NODE_ENV": "\"production\"",
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    banner: { js: `/* build:${BUILD_ID} */` },
    loader: { ".svg": "file" },
    metafile: true,
    logLevel: "info",
  });

  const outputPath = Object.keys(buildResult.metafile.outputs).find(
    (output) => output.endsWith(".js") && output.includes("assets/bundle-"),
  );
  return outputPath ? outputPath.replace(/^dist\//, "") : "assets/bundle.js";
}

/* -------------------------------------------------------
 * CSS (from index.html only) → hashed files
 * ----------------------------------------------------- */

/**
 * Minify CSS via PostCSS (autoprefixer + cssnano). Falls back to a tiny inlined minifier
 * if postcss-cli is unavailable.
 */
async function minifyCss(cssContent) {
  try {
    const { execa } = await import("execa");
    const tempDirectory = path.join(".build");
    const inputCssPath = path.join(tempDirectory, "in.css");
    const outputCssPath = path.join(tempDirectory, "out.css");
    await ensureDirectory(tempDirectory);
    await writeTextFile(inputCssPath, cssContent);
    await execa("npx", ["postcss", inputCssPath, "--config", "postcss.config.cjs", "--output", outputCssPath]);
    return readTextFile(outputCssPath);
  } catch {
    return cssContent
      .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{}:;,])\s*/g, "$1")
      .trim();
  }
}

function hashContent(content) {
  const hashBuilder = crypto.createHash("sha256");
  hashBuilder.update(content);
  return hashBuilder.digest("hex").slice(0, 8);
}

/**
 * Parse ONLY index.html, collect stylesheet links, and emit a hashed CSS file for each.
 * Returned paths are relative to OUTPUT_DIRECTORY (e.g., "assets/style-<hash>.css"), in original order.
 */
async function processStylesFromIndex(indexHtmlPath = "index.html") {
  const htmlText = await readTextFile(indexHtmlPath);
  const domRoot = parse(htmlText);

  // Collect any <link> that either:
  //  - has rel containing "stylesheet"
  //  - OR its href (sans query/hash) starts with "styles/"
  const linkNodes = domRoot.querySelectorAll("link").filter((element) => {
    const relValue = (element.getAttribute("rel") || "").toLowerCase();
    const hrefValue = element.getAttribute("href") || "";
    const cleanedHref = stripQueryOrHash(hrefValue).replace(/^\.\//, "");
    return relValue.includes("stylesheet") || cleanedHref.startsWith("styles/");
  });

  // Original HREFs as written (no ?v=)
  const originalHrefList = linkNodes
    .map((element) => stripQueryOrHash(element.getAttribute("href") || ""))
    .filter(Boolean);

  // Resolve to project-root-relative paths for file IO
  const resolvedPaths = originalHrefList
    .map((href) => resolvePathFromHtml(indexHtmlPath, href))
    .filter(Boolean);

  if (!resolvedPaths.length) {
    return { hashedCssPathsFromDistRoot: [], originalHrefList };
  }

  await verifyFilesExist("CSS files (from index.html)", resolvedPaths);

  const hashedCssPathsFromDistRoot = [];
  for (const projectRelativePath of resolvedPaths) {
    const absolutePath = path.resolve(".", projectRelativePath);
    const rawCss = await readTextFile(absolutePath);
    const minifiedCss = `/* build:${BUILD_ID} */\n${await minifyCss(rawCss)}`;

    const baseName = path.basename(projectRelativePath, path.extname(projectRelativePath));
    const cssHash = hashContent(minifiedCss);
    const distRelativeCss = `assets/${baseName}-${cssHash}.css`;
    const distAbsoluteCss = path.resolve(OUTPUT_DIRECTORY, distRelativeCss);

    await ensureDirectory(path.dirname(distAbsoluteCss));
    await writeTextFile(distAbsoluteCss, minifiedCss);
    hashedCssPathsFromDistRoot.push(distRelativeCss);
  }

  return { hashedCssPathsFromDistRoot, originalHrefList };
}

/* -------------------------------------------------------
 * HTML rewriting (DOM-based, no brittle regex)
 * ----------------------------------------------------- */

/**
 * Remove legacy stylesheet/script tags from the DOM:
 *  - any <link> with rel containing "stylesheet"
 *  - any <link> whose href (sans query/hash) begins with "styles/"
 *  - any <link> whose href exactly matches an original index.html href (sans query/hash)
 *  - any <script src="...">
 */
function stripLegacyAssets(domRoot, originalHrefList) {
  const originalHrefSet = new Set(
    originalHrefList.map((href) => stripQueryOrHash(href).replace(/^\.\//, "")),
  );

  // Remove stylesheet links (by rel or styles/*) and any exact original
  domRoot.querySelectorAll("link").forEach((element) => {
    const relValue = (element.getAttribute("rel") || "").toLowerCase();
    const cleanedHref = stripQueryOrHash(element.getAttribute("href") || "").replace(/^\.\//, "");
    if (relValue.includes("stylesheet") || cleanedHref.startsWith("styles/") || originalHrefSet.has(cleanedHref)) {
      element.remove();
    }
  });

  // Remove all <script src="...">
  domRoot.querySelectorAll("script").forEach((element) => {
    if (element.getAttribute("src")) element.remove();
  });
}

/**
 * Inject hashed CSS and JS into the DOM, using per-page relative URLs inside OUTPUT_DIRECTORY.
 * Ensures <head> exists, and appends CSS first, then a deferred JS <script>.
 */
function injectHashedAssets(domRoot, pageOutputDirectoryAbsolute, jsDistAbsolute, cssDistAbsoluteList) {
  /** Convert absolute path to a per-page relative POSIX URL. */
  const toRelativeUrl = (absolutePath) => toPosixPath(path.relative(pageOutputDirectoryAbsolute, absolutePath) || "");

  // Ensure <head> exists
  let headElement = domRoot.querySelector("head");
  if (!headElement) {
    const htmlElement = domRoot.querySelector("html") || domRoot;
    htmlElement.insertAdjacentHTML("afterbegin", "<head></head>");
    headElement = domRoot.querySelector("head");
  }

  // CSS first (keep order)
  for (const cssAbsolute of cssDistAbsoluteList) {
    const href = toRelativeUrl(cssAbsolute) || path.basename(cssAbsolute);
    headElement.insertAdjacentHTML("beforeend", `\n  <link rel="stylesheet" href="${href}">`);
  }

  // JS (defer)
  const jsHref = toRelativeUrl(jsDistAbsolute) || path.basename(jsDistAbsolute);
  headElement.insertAdjacentHTML("beforeend", `\n  <script defer src="${jsHref}"></script>`);
}

/**
 * Rewrite a single HTML file:
 *  - parse DOM
 *  - strip legacy assets
 *  - inject hashed CSS/JS with per-page relative URLs
 *  - write to OUTPUT_DIRECTORY, preserving the same directory structure
 */
async function rewriteHtmlPage(sourceHtmlPath, jsRelFromDistRoot, cssRelListFromDistRoot, originalHrefList) {
  const htmlText = await readTextFile(sourceHtmlPath);
  const domRoot = parse(htmlText);

  // 1) Remove legacy links and scripts
  stripLegacyAssets(domRoot, originalHrefList);

  // 2) Compute per-page relative URLs for injected assets
  const pageOutputAbsolute = path.resolve(OUTPUT_DIRECTORY, sourceHtmlPath);
  const pageOutputDirectoryAbsolute = path.dirname(pageOutputAbsolute);
  const jsDistAbsolute = path.resolve(OUTPUT_DIRECTORY, jsRelFromDistRoot);
  const cssDistAbsoluteList = cssRelListFromDistRoot.map((distRelative) =>
    path.resolve(OUTPUT_DIRECTORY, distRelative),
  );

  // 3) Inject new assets
  injectHashedAssets(domRoot, pageOutputDirectoryAbsolute, jsDistAbsolute, cssDistAbsoluteList);

  // 4) Write
  await ensureDirectory(pageOutputDirectoryAbsolute);
  await writeTextFile(pageOutputAbsolute, domRoot.toString());

  globalThis.console.info(`Rewrote ${sourceHtmlPath}`);
}

/* -------------------------------------------------------
 * Asset copy
 * ----------------------------------------------------- */

async function copyDirectoryRecursive(sourceDirectory, destinationDirectory) {
  try {
    const sourceStat = await fs.stat(sourceDirectory);
    if (!sourceStat.isDirectory()) return;
  } catch {
    return;
  }
  await ensureDirectory(destinationDirectory);
  const directoryEntries = await fs.readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of directoryEntries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, destinationPath);
    } else {
      await ensureDirectory(path.dirname(destinationPath));
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

/* -------------------------------------------------------
 * HTML discovery
 * ----------------------------------------------------- */

async function findHtmlFiles(rootDirectory = ".") {
  const foundFiles = [];
  async function walkDirectory(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidatePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SHOULD_RECURSE_FOR_HTML) await walkDirectory(candidatePath);
      } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        foundFiles.push(candidatePath);
      }
    }
  }
  await walkDirectory(rootDirectory);

  // Put index.html first (often the main entry)
  foundFiles.sort(
    (left, right) =>
      (path.basename(left) === "index.html" ? -1 : 0) - (path.basename(right) === "index.html" ? -1 : 0),
  );
  return foundFiles;
}

/* -------------------------------------------------------
 * Main build
 * ----------------------------------------------------- */

async function buildAll() {
  // Start clean
  await fs.rm(OUTPUT_DIRECTORY, { recursive: true, force: true });

  // 1) Discover HTML pages
  const htmlFiles = await findHtmlFiles(".");
  if (!htmlFiles.length) {
    globalThis.console.error("No HTML files found.");
    globalThis.process.exit(1);
  }

  // 2) Collect JS from ALL pages (document order per page, then dedupe)
  const allScriptPaths = [];
  for (const htmlFile of htmlFiles) {
    const htmlText = await readTextFile(htmlFile);
    const domRoot = parse(htmlText);
    domRoot.querySelectorAll("script").forEach((scriptElement) => {
      const scriptSource = scriptElement.getAttribute("src");
      if (scriptSource && !isExternalUrl(scriptSource)) {
        const resolved = resolvePathFromHtml(htmlFile, scriptSource);
        if (resolved) allScriptPaths.push(resolved);
      }
    });
  }
  const scriptList = dedupePreserveOrder(allScriptPaths);
  await verifyFilesExist("script files", scriptList);

  // 3) Bundle JS into one hashed file
  const virtualEntryPath = path.join(".build", "bundle-entry.js");
  await createVirtualJsEntry(scriptList, virtualEntryPath);
  const jsRelFromDistRoot = await bundleJavaScript(virtualEntryPath); // e.g., "assets/bundle-<hash>.js"

  // 4) Styles: ONLY from index.html → one hashed file per <link> in original order
  const { hashedCssPathsFromDistRoot, originalHrefList } = await processStylesFromIndex("index.html");

  // 5) Rewrite every HTML page with per-page relative asset URLs
  for (const htmlFile of htmlFiles) {
    await rewriteHtmlPage(htmlFile, jsRelFromDistRoot, hashedCssPathsFromDistRoot, originalHrefList);
  }

  // 6) Copy passthrough directories
  for (const passthrough of PASSTHROUGH_DIRECTORIES) {
    await copyDirectoryRecursive(passthrough, path.join(OUTPUT_DIRECTORY, passthrough));
  }

  globalThis.console.info(`Build complete → ${OUTPUT_DIRECTORY}/ (BUILD_ID=${BUILD_ID})`);
}

/* -------------------------------------------------------
 * Entrypoint
 * ----------------------------------------------------- */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch((error) => {
    globalThis.console.error(error);
    globalThis.process.exit(1);
  });
}

export default buildAll;