import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const audibleHosts = {
  au: "api.audible.com.au",
  br: "api.audible.com.br",
  ca: "api.audible.ca",
  de: "api.audible.de",
  es: "api.audible.es",
  fr: "api.audible.fr",
  in: "api.audible.in",
  it: "api.audible.it",
  jp: "api.audible.co.jp",
  uk: "api.audible.co.uk",
  us: "api.audible.com",
};

const allowedForwardingMethods = new Set(["GET", "HEAD"]);
const defaultDistDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist"
);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"],
]);

/**
 * Purpose: Build the cPanel-compatible HTTP server used when NGINX is not
 * available.
 *
 * @param options - Server configuration.
 * @param options.distDirectory - Built Vite output directory to serve.
 * @returns A Node HTTP server that serves the app and provider forwarding
 * routes.
 */
export function createCompleteSeriesServer({ distDirectory = defaultDistDirectory } = {}) {
  return createServer((request, response) => {
    handleRequest(request, response, { distDirectory }).catch((error) => {
      sendJson(response, 500, {
        error: "Complete Series could not handle this request.",
        detail: error instanceof Error ? error.message : "Unknown server error.",
      });
    });
  });
}

/**
 * Purpose: Route one incoming browser request to provider forwarding or static
 * file handling.
 *
 * @param request - Incoming cPanel/Node request.
 * @param response - HTTP response writer.
 * @param options - Request handling options.
 * @param options.distDirectory - Built Vite output directory to serve.
 * @returns A promise that resolves when the request has been handled.
 */
export async function handleRequest(request, response, { distDirectory = defaultDistDirectory } = {}) {
  const providerTarget = resolveProviderTarget(request.url ?? "/", request.method ?? "GET");

  if (providerTarget.kind === "provider") {
    forwardProviderRequest(request, response, providerTarget.url);
    return;
  }

  if (providerTarget.kind === "blocked") {
    sendJson(response, providerTarget.status, { error: providerTarget.reason });
    return;
  }

  await serveStaticFile(request, response, distDirectory);
}

/**
 * Purpose: Resolve a local provider route to a public catalogue API URL while
 * rejecting unsupported paths and methods.
 *
 * @param requestUrl - Incoming request URL from the browser.
 * @param method - Incoming HTTP method.
 * @returns A forwarding target, a blocked request, or `null` when the request
 * is not a provider route.
 */
export function resolveProviderTarget(requestUrl, method) {
  const url = new URL(requestUrl, "http://complete-series.local");
  const pathName = url.pathname;

  if (!pathName.startsWith("/api/")) return { kind: "none" };

  if (!allowedForwardingMethods.has(method)) {
    return {
      kind: "blocked",
      reason: "Provider forwarding only accepts GET and HEAD requests.",
      status: 405,
    };
  }

  const audibleMatch = pathName.match(
    /^\/api\/audible\/(au|br|ca|de|es|fr|in|it|jp|uk|us)(\/1\.0\/catalog\/products(?:\/[^/?]+)?)$/
  );

  if (audibleMatch) {
    const [, region, audiblePath] = audibleMatch;
    return {
      kind: "provider",
      url: new URL(`https://${audibleHosts[region]}${audiblePath}${url.search}`),
    };
  }

  const appleBooksMatch = pathName.match(/^\/api\/apple-books\/(search|lookup)$/);

  if (appleBooksMatch) {
    return {
      kind: "provider",
      url: new URL(`https://itunes.apple.com/${appleBooksMatch[1]}${url.search}`),
    };
  }

  return {
    kind: "blocked",
    reason: "Provider forwarding path is not allowed.",
    status: 404,
  };
}

/**
 * Purpose: Serve the built app bundle and fall back to `index.html` for client
 * routes.
 *
 * @param request - Incoming browser request.
 * @param response - HTTP response writer.
 * @param distDirectory - Built Vite output directory.
 * @returns A promise that resolves when the static response has started.
 */
async function serveStaticFile(request, response, distDirectory) {
  if (!allowedForwardingMethods.has(request.method ?? "GET")) {
    sendJson(response, 405, { error: "Only GET requests are supported." });
    return;
  }

  const url = new URL(request.url ?? "/", "http://complete-series.local");
  const requestedPath = decodePath(url.pathname);

  if (!requestedPath || requestedPath.includes("\0")) {
    sendJson(response, 400, { error: "Invalid request path." });
    return;
  }

  const filePath = await resolveStaticFilePath(distDirectory, requestedPath);

  if (!filePath) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  const headers = buildStaticHeaders(filePath);
  response.writeHead(200, headers);

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

/**
 * Purpose: Resolve a safe filesystem path for a static app request.
 *
 * @param distDirectory - Built Vite output directory.
 * @param requestedPath - Browser request path.
 * @returns A readable file path, an SPA fallback path, or `null` when no file
 * is available.
 */
export async function resolveStaticFilePath(distDirectory, requestedPath) {
  const safePath = requestedPath === "/" ? "/index.html" : requestedPath;
  const candidate = path.resolve(distDirectory, `.${safePath}`);
  const distRoot = path.resolve(distDirectory);

  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${path.sep}`)) {
    return null;
  }

  if (await isReadableFile(candidate)) {
    return candidate;
  }

  if (path.extname(candidate)) {
    return null;
  }

  const fallback = path.join(distRoot, "index.html");
  return (await isReadableFile(fallback)) ? fallback : null;
}

/**
 * Purpose: Decode request paths without throwing malformed URI errors into the
 * main request handler.
 *
 * @param pathName - URL path from the browser.
 * @returns The decoded path, or an empty string when decoding fails.
 */
export function decodePath(pathName) {
  try {
    return decodeURIComponent(pathName);
  } catch {
    return "";
  }
}

/**
 * Purpose: Build static response headers with long caching for fingerprinted
 * assets and no-store for the app shell.
 *
 * @param filePath - Static file path being served.
 * @returns HTTP headers for the file response.
 */
export function buildStaticHeaders(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
  };

  if (path.basename(filePath) === "index.html") {
    headers["Cache-Control"] = "no-store";
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  }

  return headers;
}

/**
 * Purpose: Check whether a path points to a readable regular file.
 *
 * @param filePath - Filesystem path to inspect.
 * @returns `true` when the path is a readable file.
 */
async function isReadableFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Purpose: Forward a restricted catalogue request without sending local user
 * credentials or browser-origin headers upstream.
 *
 * @param request - Incoming browser request.
 * @param response - HTTP response writer.
 * @param targetUrl - Public provider URL to request.
 * @returns Nothing. The provider response is streamed to the browser.
 */
function forwardProviderRequest(request, response, targetUrl) {
  const providerRequest = httpsRequest(
    targetUrl,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "CompleteSeriesV2",
      },
      method: request.method,
    },
    (providerResponse) => {
      const headers = filterProviderResponseHeaders(providerResponse.headers);
      response.writeHead(providerResponse.statusCode ?? 502, headers);

      if (request.method === "HEAD") {
        response.end();
        providerResponse.resume();
        return;
      }

      providerResponse.pipe(response);
    }
  );

  providerRequest.on("error", (error) => {
    sendJson(response, 502, {
      error: "Provider request failed.",
      detail: error.message,
    });
  });

  request.on("aborted", () => providerRequest.destroy());
  providerRequest.end();
}

/**
 * Purpose: Copy useful provider response headers while dropping cookies and
 * forwarding metadata.
 *
 * @param headers - Headers returned by the provider.
 * @returns Headers safe to send back to the browser.
 */
export function filterProviderResponseHeaders(headers) {
  const allowedHeaders = new Set([
    "cache-control",
    "content-encoding",
    "content-language",
    "content-length",
    "content-type",
    "etag",
    "expires",
    "last-modified",
  ]);
  const filteredHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || !allowedHeaders.has(name.toLowerCase())) continue;
    filteredHeaders[name] = value;
  }

  if (!filteredHeaders["content-type"] && !filteredHeaders["Content-Type"]) {
    filteredHeaders["Content-Type"] = "application/json; charset=utf-8";
  }

  return filteredHeaders;
}

/**
 * Purpose: Send a small JSON error response.
 *
 * @param response - HTTP response writer.
 * @param status - HTTP status code.
 * @param payload - Serializable error payload.
 * @returns Nothing. The response is completed.
 */
function sendJson(response, status, payload) {
  if (response.headersSent) return;

  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? "0.0.0.0";

  createCompleteSeriesServer().listen(port, host, () => {
    console.log(`Complete Series is listening on ${host}:${port}`);
  });
}
