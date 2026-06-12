import type {
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  RegionCode,
} from "../../domain/audiobook";
import { normaliseIsbn } from "../../domain/normalise";
import {
  buildGoogleBooksIsbnSearchPath,
  buildGoogleBooksSearchPath,
  fetchGoogleBooksJson,
} from "./googleBooksApi";
import type { GoogleBooksVolume, GoogleBooksVolumesResponse } from "./googleBooksTypes";
import {
  buildGoogleBooksSeriesId,
  buildGoogleBooksSeriesSearchQuery,
  deduplicateGoogleBooksVolumes,
  filterRelevantGoogleBooksVolumes,
  getGoogleBooksIsbnLookupLimit,
  mapGoogleBooksVolumeToProviderBook,
  parseGoogleBooksSeriesQuery,
} from "./googleBooks/googleBooksHelpers";
import type {
  BookLookupRequest,
  MetadataProvider,
  SeriesLookupRequest,
  SeriesSearchRequest,
} from "./metadataProvider";

const GOOGLE_BOOKS_SEARCH_LIMIT = 40;

export const googleBooksProvider: MetadataProvider = {
  id: "googleBooks",
  displayName: "Google Books",
  evidenceLevel: "review",
  capabilities: {
    supportsAudiobooks: false,
    supportsAvailability: false,
    supportsBookLookup: false,
    supportsCovers: true,
    supportsRegion: false,
    supportsSeriesLookup: false,
    supportsSeriesSearch: true,
  },
  getBookByAsin,
  getSeriesBooks,
  searchSeries,
};

/**
 * Purpose: Ignore normal Audible ASIN lookup for Google Books because the
 * catalogue uses Google volume identifiers instead.
 *
 * @param request - Book lookup details supplied by the shared metadata
 * discovery flow.
 * @returns Always `null` for now; Google Books is search-only in V2.
 */
async function getBookByAsin(request: BookLookupRequest): Promise<ProviderSeriesBook | null> {
  void request;
  return null;
}

/**
 * Purpose: Rebuild a Google Books search candidate from a saved synthetic
 * provider-series id, mainly so manual matches remain loadable.
 *
 * @param request - Series lookup details containing a synthetic Google Books
 * search id.
 * @returns A provider series candidate, or `null` when the id was not created
 * by the Google Books provider.
 */
async function getSeriesBooks(
  request: SeriesLookupRequest
): Promise<ProviderSeriesCandidate | null> {
  const query = parseGoogleBooksSeriesQuery(request.seriesAsin);
  if (!query) return null;

  const candidates = await searchSeries({
    authorNames: [],
    cache: request.cache,
    googleBooksApiKey: request.googleBooksApiKey,
    knownIsbns: [],
    knownTitles: [],
    query,
    region: request.region,
  });

  return candidates[0] ?? null;
}

/**
 * Purpose: Search Google Books for book-catalogue evidence that may help
 * identify a series when audiobook-first providers are unavailable or
 * incomplete.
 *
 * @param request - Search text and local evidence from Audiobookshelf.
 * @returns At most one review-only provider candidate built from Google Books
 * volume results.
 */
async function searchSeries(request: SeriesSearchRequest): Promise<ProviderSeriesCandidate[]> {
  const query = request.query.trim();
  if (!query) return [];

  const searchResults = await fetchGoogleBooksSearchResults(
    buildGoogleBooksSeriesSearchQuery(request),
    GOOGLE_BOOKS_SEARCH_LIMIT,
    request.cache,
    request.googleBooksApiKey,
    request.region
  );
  const relevantSearchResults = filterRelevantGoogleBooksVolumes(searchResults, request);
  const isbnResults =
    relevantSearchResults.length > 0
      ? []
      : await fetchGoogleBooksIsbnLookupResults(
          request,
          getGoogleBooksIsbnLookupLimit(request.metadataLookupMode)
        );
  const relevantResults = filterRelevantGoogleBooksVolumes(
    deduplicateGoogleBooksVolumes([...relevantSearchResults, ...isbnResults]),
    request
  );
  const books = relevantResults.map((volume) =>
    mapGoogleBooksVolumeToProviderBook(volume, request.region, query)
  );

  if (books.length === 0) return [];

  return [
    {
      automaticMatch: false,
      books,
      evidenceLevel: "review",
      matchingRules: {
        includeFormat: false,
        includeSeriesPosition: false,
        includeSubtitle: false,
      },
      name: query,
      region: request.region,
      seriesAsin: buildGoogleBooksSeriesId(query),
    },
  ];
}

/**
 * Purpose: Look up local ISBNs in Google Books before broad text search.
 *
 * @param request - Series search request containing local ISBN evidence.
 * @returns Google Books volumes found by ISBN.
 */
async function fetchGoogleBooksIsbnLookupResults(
  request: SeriesSearchRequest,
  limit: number
): Promise<GoogleBooksVolume[]> {
  if (limit === 0) return [];

  const uniqueIsbns = [
    ...new Set(request.knownIsbns.map(normaliseIsbn).filter(Boolean)),
  ].slice(0, limit);
  const volumes: GoogleBooksVolume[] = [];

  for (const isbn of uniqueIsbns) {
    const payload = await fetchGoogleBooksJson<GoogleBooksVolumesResponse>(
      buildGoogleBooksIsbnSearchPath(isbn, request.region),
      request.cache,
      request.googleBooksApiKey
    );
    volumes.push(...(payload?.items ?? []).map((volume) => ({ ...volume, lookupIsbn: isbn })));
  }

  return volumes;
}

/**
 * Purpose: Fetch one Google Books volume search result set directly from
 * Google.
 *
 * @param query - Google Books search query.
 * @param limit - Maximum result count to request.
 * @param cache - Whether the shared provider cache should be used.
 * @param googleBooksApiKey - Optional user-entered Google Books API key.
 * @param region - Selected catalogue region used for language restriction.
 * @returns Raw Google Books volumes, or an empty list when none are returned.
 */
async function fetchGoogleBooksSearchResults(
  query: string,
  limit: number,
  cache: boolean,
  googleBooksApiKey: string | undefined,
  region: RegionCode
): Promise<GoogleBooksVolume[]> {
  const payload = await fetchGoogleBooksJson<GoogleBooksVolumesResponse>(
    buildGoogleBooksSearchPath(query, limit, region),
    cache,
    googleBooksApiKey
  );

  return payload?.items ?? [];
}
