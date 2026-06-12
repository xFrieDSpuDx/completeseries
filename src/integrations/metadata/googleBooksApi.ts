import {
  loadCachedProviderResponse,
  saveCachedProviderResponse,
} from "./cache/providerResponseCache";
import type { RegionCode } from "../../domain/audiobook";
import { getSingleRegionLanguageCode } from "./regionLanguage";

const GOOGLE_BOOKS_API_ORIGIN = "https://www.googleapis.com";
const GOOGLE_BOOKS_VOLUME_FIELDS = [
  "items(id,selfLink,volumeInfo(title,subtitle,authors,publisher,publishedDate,description,industryIdentifiers,categories,imageLinks,language,previewLink))",
  "totalItems",
].join(",");

const requestCache = new Map<string, Promise<unknown | null>>();

/**
 * Purpose: Fetch and parse JSON directly from the Google Books API.
 *
 * @param path - Full Google Books API URL to request.
 * @param cache - Whether repeated requests in this browser session should
 * reuse an in-memory promise cache.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
export async function fetchGoogleBooksJson<T>(
  path: string,
  cache: boolean,
  googleBooksApiKey?: string
): Promise<T | null> {
  if (cache && requestCache.has(path)) {
    return requestCache.get(path) as Promise<T | null>;
  }

  const requestPromise = fetchGoogleBooksJsonFromCacheOrNetwork<T>(
    path,
    cache,
    googleBooksApiKey
  );

  if (cache) requestCache.set(path, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    requestCache.delete(path);
    throw error;
  }
}

/**
 * Purpose: Clear Google Books responses cached in the current browser session.
 *
 * @returns Nothing. The next cached Google Books request must check persistent
 * storage or the network again.
 */
export function clearGoogleBooksRequestMemoryCache(): void {
  requestCache.clear();
}

/**
 * Purpose: Resolve a Google Books request from persistent cache first, then
 * the network, so expensive catalogue calls survive page reloads.
 *
 * @param path - Full Google Books API URL to request.
 * @param cache - Whether cache lookup and persistence are enabled.
 * @returns Parsed JSON data, or `null` for cached or live 404 responses.
 */
async function fetchGoogleBooksJsonFromCacheOrNetwork<T>(
  path: string,
  cache: boolean,
  googleBooksApiKey?: string
): Promise<T | null> {
  if (cache) {
    const cachedResponse = await loadCachedProviderResponse<T>("googleBooks", path);
    if (cachedResponse.hit) return cachedResponse.payload;
  }

  const payload = await fetchGoogleBooksJsonFromNetwork<T>(
    buildGoogleBooksRequestPath(path, googleBooksApiKey)
  );
  if (cache) await saveCachedProviderResponse("googleBooks", path, payload);

  return payload;
}

/**
 * Purpose: Add the configured Google Books API key to the outgoing request
 * without changing the provider cache key.
 *
 * @param path - Google Books API URL without private query values.
 * @param googleBooksApiKey - User-supplied API key from scan preferences.
 * @returns Request URL containing `key` when a user or deployment key exists.
 */
function buildGoogleBooksRequestPath(path: string, googleBooksApiKey?: string): string {
  const apiKey = getGoogleBooksApiKey(googleBooksApiKey);
  if (!apiKey) return path;

  const url = new URL(path);
  url.searchParams.set("key", apiKey);

  return url.toString();
}

/**
 * Purpose: Fetch one Google Books API response from the user's browser.
 *
 * @param path - Full Google Books API URL to request.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
async function fetchGoogleBooksJsonFromNetwork<T>(path: string): Promise<T | null> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Google Books metadata request failed: ${response.status}. ${await readGoogleBooksErrorDetail(
        response
      )}`
    );
  }

  return (await response.json()) as T;
}

/**
 * Purpose: Read a useful Google Books error message without exposing the full
 * provider response in normal UI.
 *
 * @param response - Failed Google Books fetch response.
 * @returns Short explanation suitable for Review provider traces.
 */
async function readGoogleBooksErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; status?: string };
    };
    const message = payload.error?.message?.trim();
    if (!message) return getGoogleBooksApiKeyHelp(response.status);

    return `${message} ${getGoogleBooksApiKeyHelp(response.status)}`.trim();
  } catch {
    return getGoogleBooksApiKeyHelp(response.status);
  }
}

/**
 * Purpose: Explain Google Books key/quota failures in the terms a Complete
 * Series host can act on.
 *
 * @param status - HTTP status from Google Books.
 * @returns Deployment guidance for common key and quota statuses.
 */
function getGoogleBooksApiKeyHelp(status: number): string {
  if (status === 401 || status === 403 || status === 429) {
    return "Enter a Google Books API key in the scan filters.";
  }

  return "";
}

/**
 * Purpose: Build the Google Books URL used for broad volume searches.
 *
 * @param query - Search term, usually a local Audiobookshelf series name.
 * @param limit - Maximum result count to request. Google Books allows up to
 * forty volumes per page.
 * @returns Full Google Books volumes URL.
 */
export function buildGoogleBooksSearchPath(
  query: string,
  limit = 40,
  region?: RegionCode
): string {
  return buildGoogleBooksVolumesPath(
    {
      maxResults: String(limit),
      q: query,
    },
    region
  );
}

/**
 * Purpose: Build the Google Books URL used for ISBN searches.
 *
 * @param isbn - ISBN value from local Audiobookshelf metadata.
 * @param region - Selected catalogue region used for language restriction.
 * @returns Full Google Books volumes URL narrowed to one ISBN.
 */
export function buildGoogleBooksIsbnSearchPath(isbn: string, region?: RegionCode): string {
  return buildGoogleBooksVolumesPath(
    {
      maxResults: "10",
      q: `isbn:${isbn}`,
    },
    region
  );
}

/**
 * Purpose: Build a Google Books volumes URL while applying shared response
 * fields and optional deployment API key.
 *
 * @param params - Query parameters specific to the search type.
 * @param region - Selected catalogue region used for language restriction.
 * @returns Full Google Books volumes URL.
 */
function buildGoogleBooksVolumesPath(
  params: Record<string, string>,
  region?: RegionCode
): string {
  const languageCode = region ? getSingleRegionLanguageCode(region) : null;
  const searchParams = new URLSearchParams({
    fields: GOOGLE_BOOKS_VOLUME_FIELDS,
    printType: "books",
    projection: "lite",
    ...params,
  });
  if (languageCode) searchParams.set("langRestrict", languageCode);

  return `${GOOGLE_BOOKS_API_ORIGIN}/books/v1/volumes?${searchParams.toString()}`;
}

/**
 * Purpose: Read the optional Vite-exposed Google Books API key.
 *
 * @returns API key configured by the deployment, or an empty string when none
 * is available.
 */
function getGoogleBooksApiKey(googleBooksApiKey?: string): string {
  return googleBooksApiKey?.trim() || import.meta.env.VITE_GOOGLE_BOOKS_API_KEY?.trim() || "";
}

/**
 * Purpose: Report whether the current browser bundle was built with a Google
 * Books API key.
 *
 * @returns `true` when a user-entered or Vite-provided Google Books API key is
 * present.
 */
export function isGoogleBooksApiKeyConfigured(googleBooksApiKey?: string): boolean {
  return Boolean(getGoogleBooksApiKey(googleBooksApiKey));
}
