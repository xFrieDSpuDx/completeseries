import {
  loadCachedProviderResponse,
  saveCachedProviderResponse,
} from "./cache/providerResponseCache";

const OPEN_LIBRARY_API_ORIGIN = "https://openlibrary.org";
const OPEN_LIBRARY_SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "isbn",
  "cover_i",
  "first_publish_year",
  "publish_year",
  "publisher",
  "edition_key",
  "language",
].join(",");

const requestCache = new Map<string, Promise<unknown | null>>();

/**
 * Purpose: Fetch and parse JSON directly from the Open Library API.
 *
 * @param path - Full Open Library API URL to request.
 * @param cache - Whether repeated requests in this browser session should reuse
 * an in-memory promise cache.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
export async function fetchOpenLibraryJson<T>(path: string, cache: boolean): Promise<T | null> {
  if (cache && requestCache.has(path)) {
    return requestCache.get(path) as Promise<T | null>;
  }

  const requestPromise = fetchOpenLibraryJsonFromCacheOrNetwork<T>(path, cache);

  if (cache) requestCache.set(path, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    requestCache.delete(path);
    throw error;
  }
}

/**
 * Purpose: Clear Open Library responses cached in the current browser session.
 *
 * @returns Nothing. The next cached Open Library request must check persistent
 * storage or the network again.
 */
export function clearOpenLibraryRequestMemoryCache(): void {
  requestCache.clear();
}

/**
 * Purpose: Resolve an Open Library request from persistent cache first, then
 * the network, so expensive catalogue calls survive page reloads.
 *
 * @param path - Full Open Library API URL to request.
 * @param cache - Whether cache lookup and persistence are enabled.
 * @returns Parsed JSON data, or `null` for cached or live 404 responses.
 */
async function fetchOpenLibraryJsonFromCacheOrNetwork<T>(
  path: string,
  cache: boolean
): Promise<T | null> {
  if (cache) {
    const cachedResponse = await loadCachedProviderResponse<T>("openLibrary", path);
    if (cachedResponse.hit) return cachedResponse.payload;
  }

  const payload = await fetchOpenLibraryJsonFromNetwork<T>(path);
  if (cache) await saveCachedProviderResponse("openLibrary", path, payload);

  return payload;
}

/**
 * Purpose: Fetch one Open Library API response from the user's browser.
 *
 * @param path - Full Open Library API URL to request.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
async function fetchOpenLibraryJsonFromNetwork<T>(path: string): Promise<T | null> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Library metadata request failed: ${response.status}`);

  return (await response.json()) as T;
}

/**
 * Purpose: Build the Open Library URL used for broad work searches.
 *
 * @param query - Search term, usually a local Audiobookshelf series name.
 * @param limit - Maximum result count to request.
 * @returns Full Open Library `search.json` URL.
 */
export function buildOpenLibrarySearchPath(query: string, limit = 50): string {
  const searchParams = new URLSearchParams({
    fields: OPEN_LIBRARY_SEARCH_FIELDS,
    limit: String(limit),
    q: query,
  });

  return `${OPEN_LIBRARY_API_ORIGIN}/search.json?${searchParams.toString()}`;
}

/**
 * Purpose: Build the Open Library URL used for ISBN searches.
 *
 * @param isbn - ISBN value from local Audiobookshelf metadata.
 * @returns Full Open Library `search.json` URL narrowed to one ISBN.
 */
export function buildOpenLibraryIsbnSearchPath(isbn: string): string {
  const searchParams = new URLSearchParams({
    fields: OPEN_LIBRARY_SEARCH_FIELDS,
    isbn,
    limit: "10",
  });

  return `${OPEN_LIBRARY_API_ORIGIN}/search.json?${searchParams.toString()}`;
}
