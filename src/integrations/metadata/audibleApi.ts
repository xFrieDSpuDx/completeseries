import type { RegionCode } from "../../domain/audiobook";
import {
  loadCachedAudibleResponse,
  saveCachedAudibleResponse,
} from "./cache/audibleResponseCache";

const AUDIBLE_RESPONSE_GROUPS =
  "contributors,media,price,product_attrs,product_desc,product_details,product_extended_attrs,sample,series,sku,relationships";
const AUDIBLE_CATALOGUE_ROUTE_PREFIX = "/api/audible";

const requestCache = new Map<string, Promise<unknown | null>>();

/**
 * Purpose: Fetch and parse JSON from the same-origin Audible catalogue route.
 *
 * @param path - Same-origin Audible catalogue route to request.
 * @param cache - Whether repeated requests in this browser session should reuse
 * an in-memory promise cache.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
export async function fetchAudibleJson<T>(path: string, cache: boolean): Promise<T | null> {
  if (cache && requestCache.has(path)) {
    return requestCache.get(path) as Promise<T | null>;
  }

  const requestPromise = fetchAudibleJsonFromCacheOrNetwork<T>(path, cache);

  if (cache) requestCache.set(path, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    requestCache.delete(path);
    throw error;
  }
}

/**
 * Purpose: Clear Audible responses cached in the current browser session.
 *
 * @returns Nothing. The next cached Audible request must check persistent
 * storage or the network again.
 */
export function clearAudibleRequestMemoryCache(): void {
  requestCache.clear();
}

/**
 * Purpose: Resolve an Audible API request from persistent cache first, then the
 * network, so expensive catalogue calls survive page reloads.
 *
 * @param path - Same-origin Audible catalogue route to request.
 * @param cache - Whether cache lookup and persistence are enabled.
 * @returns Parsed JSON data, or `null` for cached or live 404 responses.
 */
async function fetchAudibleJsonFromCacheOrNetwork<T>(
  path: string,
  cache: boolean
): Promise<T | null> {
  if (cache) {
    const cachedResponse = await loadCachedAudibleResponse<T>(path);
    if (cachedResponse.hit) return cachedResponse.payload;
  }

  const payload = await fetchAudibleJsonFromNetwork<T>(path);
  if (cache) await saveCachedAudibleResponse(path, payload);

  return payload;
}

/**
 * Purpose: Fetch one Audible API response through the same-origin catalogue
 * route.
 *
 * @param path - Same-origin Audible catalogue route to request.
 * @returns Parsed JSON data, or `null` for 404 responses.
 */
async function fetchAudibleJsonFromNetwork<T>(path: string): Promise<T | null> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Audible metadata request failed: ${response.status}`);

  return (await response.json()) as T;
}

/**
 * Purpose: Build the same-origin Audible catalogue route used by the browser
 * app.
 *
 * @param region - Audible marketplace region.
 * @param pathname - Audible API pathname, beginning with `/`.
 * @param query - Optional query parameters to append.
 * @returns Same-origin route for the selected Audible marketplace.
 */
export function buildAudibleApiPath(
  region: RegionCode,
  pathname: string,
  query: Record<string, string> = {}
): string {
  const searchParams = new URLSearchParams({
    response_groups: AUDIBLE_RESPONSE_GROUPS,
    ...query,
  });

  return `${AUDIBLE_CATALOGUE_ROUTE_PREFIX}/${region}${pathname}?${searchParams.toString()}`;
}
