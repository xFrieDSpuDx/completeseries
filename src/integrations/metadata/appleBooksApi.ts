import {
  loadCachedProviderResponse,
  saveCachedProviderResponse,
} from "./cache/providerResponseCache";

const APPLE_BOOKS_API_ORIGIN = "https://itunes.apple.com";
const APPLE_BOOKS_PROXY_PREFIX = "/api/apple-books";

const requestCache = new Map<string, Promise<unknown | null>>();
let shouldUseFallbackFirst = false;

/**
 * Purpose: Fetch and parse JSON directly from the Apple Search API.
 *
 * @param path - Full Apple Search API URL to request.
 * @param cache - Whether repeated requests in this browser session should reuse
 * an in-memory promise cache.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
export async function fetchAppleBooksJson<T>(path: string, cache: boolean): Promise<T | null> {
  if (cache && requestCache.has(path)) {
    return requestCache.get(path) as Promise<T | null>;
  }

  const requestPromise = fetchAppleBooksJsonFromCacheOrNetwork<T>(path, cache);

  if (cache) requestCache.set(path, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    requestCache.delete(path);
    throw error;
  }
}

/**
 * Purpose: Clear Apple Books responses cached in the current browser session.
 *
 * @returns Nothing. The next cached Apple Books request must check persistent
 * storage or the network again.
 */
export function clearAppleBooksRequestMemoryCache(): void {
  requestCache.clear();
}

/**
 * Purpose: Resolve an Apple Books request from persistent cache first, then
 * the network, so expensive catalogue calls survive page reloads.
 *
 * @param path - Apple Search API URL to request.
 * @param cache - Whether cache lookup and persistence are enabled.
 * @returns Parsed JSON data, or `null` for cached or live 404 responses.
 */
async function fetchAppleBooksJsonFromCacheOrNetwork<T>(
  path: string,
  cache: boolean
): Promise<T | null> {
  if (cache) {
    const cachedResponse = await loadCachedProviderResponse<T>("appleBooks", path);
    if (cachedResponse.hit) return cachedResponse.payload;
  }

  const payload = await fetchAppleBooksJsonFromNetwork<T>(path);
  if (cache) await saveCachedProviderResponse("appleBooks", path, payload);

  return payload;
}

/**
 * Purpose: Fetch one Apple Books API response from the user's browser.
 *
 * @param path - Full Apple Search API URL to request.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
async function fetchAppleBooksJsonFromNetwork<T>(path: string): Promise<T | null> {
  const response = await fetchAppleBooksResponse(path);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Apple Books metadata request failed: ${response.status}`);

  return (await response.json()) as T;
}

/**
 * Purpose: Fetch Apple Books directly first, then fall back to the app-hosted
 * route if the browser refuses the cross-origin response.
 *
 * @param path - Full Apple Search API URL to request.
 * @returns Fetch response from Apple Books or the local fallback route.
 */
async function fetchAppleBooksResponse(path: string): Promise<Response> {
  const fallbackPath = buildAppleBooksFallbackPath(path);

  if (shouldUseFallbackFirst && fallbackPath) {
    return fetchAppleBooksUrl(fallbackPath);
  }

  try {
    return await fetchAppleBooksUrl(path);
  } catch (error) {
    if (!fallbackPath) throw error;

    shouldUseFallbackFirst = true;
    return fetchAppleBooksUrl(fallbackPath);
  }
}

/**
 * Purpose: Perform one Apple Books request with the headers expected by the
 * Search API.
 *
 * @param path - Direct Apple URL or app-hosted fallback URL.
 * @returns Fetch response.
 */
function fetchAppleBooksUrl(path: string): Promise<Response> {
  return fetch(path, {
    headers: {
      Accept: "application/json",
    },
  });
}

/**
 * Purpose: Convert a direct Apple Search API URL into the app-hosted fallback
 * route used only when a browser blocks direct access.
 *
 * @param path - Full Apple Search API URL.
 * @returns Local fallback path, or `null` when the URL is not an Apple URL.
 */
function buildAppleBooksFallbackPath(path: string): string | null {
  if (!path.startsWith(APPLE_BOOKS_API_ORIGIN)) return null;

  return `${APPLE_BOOKS_PROXY_PREFIX}${path.slice(APPLE_BOOKS_API_ORIGIN.length)}`;
}

/**
 * Purpose: Build the Apple Search API URL used for audiobook searches.
 *
 * @param query - Search term, usually a local Audiobookshelf series name.
 * @param country - Two-letter Apple storefront country code.
 * @param limit - Maximum result count to request.
 * @returns Full Apple Search API search URL.
 */
export function buildAppleBooksSearchPath(query: string, country: string, limit = 50): string {
  const searchParams = new URLSearchParams({
    country,
    entity: "audiobook",
    limit: String(limit),
    media: "audiobook",
    term: query,
  });

  return `${APPLE_BOOKS_API_ORIGIN}/search?${searchParams.toString()}`;
}

/**
 * Purpose: Build the Apple Search API URL used for synthetic Apple track-id
 * lookups.
 *
 * @param trackId - Apple audiobook track identifier.
 * @param country - Two-letter Apple storefront country code.
 * @returns Full Apple Search API lookup URL.
 */
export function buildAppleBooksLookupPath(trackId: string, country: string): string {
  const searchParams = new URLSearchParams({
    country,
    entity: "audiobook",
    id: trackId,
  });

  return `${APPLE_BOOKS_API_ORIGIN}/lookup?${searchParams.toString()}`;
}

/**
 * Purpose: Build the Apple Search API URL used for ISBN lookups.
 *
 * @param isbn - ISBN value from local Audiobookshelf metadata.
 * @param country - Two-letter Apple storefront country code.
 * @returns Full Apple Search API lookup URL.
 */
export function buildAppleBooksIsbnLookupPath(isbn: string, country: string): string {
  const searchParams = new URLSearchParams({
    country,
    entity: "audiobook",
    isbn,
    media: "audiobook",
  });

  return `${APPLE_BOOKS_API_ORIGIN}/lookup?${searchParams.toString()}`;
}

/**
 * Purpose: Reset Apple Books transport state between unit tests so a simulated
 * CORS failure in one test does not affect the next test.
 *
 * @returns Nothing. The direct-first transport mode is restored.
 */
export function resetAppleBooksTransportForTests(): void {
  shouldUseFallbackFirst = false;
}
