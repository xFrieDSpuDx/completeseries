import type {
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "../../domain/audiobook";
import { normaliseIsbn } from "../../domain/normalise";
import {
  buildOpenLibraryIsbnSearchPath,
  buildOpenLibrarySearchPath,
  fetchOpenLibraryJson,
} from "./openLibraryApi";
import {
  buildOpenLibrarySeriesId,
  deduplicateOpenLibraryDocs,
  filterRelevantOpenLibraryDocs,
  mapOpenLibraryDocToProviderBook,
  parseOpenLibrarySeriesQuery,
} from "./openLibrary/openLibraryHelpers";
import type { OpenLibrarySearchDoc, OpenLibrarySearchResponse } from "./openLibraryTypes";
import type {
  BookLookupRequest,
  MetadataProvider,
  SeriesLookupRequest,
  SeriesSearchRequest,
} from "./metadataProvider";

const OPEN_LIBRARY_SEARCH_LIMIT = 50;
const OPEN_LIBRARY_ISBN_LOOKUP_LIMIT = 8;

export const openLibraryProvider: MetadataProvider = {
  id: "openLibrary",
  displayName: "Open Library",
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
 * Purpose: Ignore normal Audible ASIN lookup for Open Library because the
 * catalogue uses Open Library work and edition identifiers instead.
 *
 * @param request - Book lookup details supplied by the shared metadata
 * discovery flow.
 * @returns Always `null` for now; Open Library is search-only in V2.
 */
async function getBookByAsin(request: BookLookupRequest): Promise<ProviderSeriesBook | null> {
  void request;
  return null;
}

/**
 * Purpose: Rebuild an Open Library search candidate from a saved synthetic
 * provider-series id, mainly so manual matches remain loadable.
 *
 * @param request - Series lookup details containing a synthetic Open Library
 * search id.
 * @returns A provider series candidate, or `null` when the id was not created
 * by the Open Library provider.
 */
async function getSeriesBooks(
  request: SeriesLookupRequest
): Promise<ProviderSeriesCandidate | null> {
  const query = parseOpenLibrarySeriesQuery(request.seriesAsin);
  if (!query) return null;

  const candidates = await searchSeries({
    authorNames: [],
    cache: request.cache,
    knownIsbns: [],
    knownTitles: [],
    query,
    region: request.region,
  });

  return candidates[0] ?? null;
}

/**
 * Purpose: Search Open Library for work-level book evidence that may help
 * identify a series when audiobook-first providers are unavailable or
 * incomplete.
 *
 * @param request - Search text and local evidence from Audiobookshelf.
 * @returns At most one review-only provider candidate built from Open Library
 * search results.
 */
async function searchSeries(request: SeriesSearchRequest): Promise<ProviderSeriesCandidate[]> {
  const query = request.query.trim();
  if (!query) return [];

  const isbnResults = await fetchOpenLibraryIsbnLookupResults(request);
  const searchResults = await fetchOpenLibrarySearchResults(
    query,
    OPEN_LIBRARY_SEARCH_LIMIT,
    request.cache
  );
  const combinedResults = deduplicateOpenLibraryDocs([...isbnResults, ...searchResults]);
  const relevantResults = filterRelevantOpenLibraryDocs(combinedResults, request);
  const books = relevantResults.map((result) =>
    mapOpenLibraryDocToProviderBook(result, request.region, query)
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
      seriesAsin: buildOpenLibrarySeriesId(query),
    },
  ];
}

/**
 * Purpose: Look up local ISBNs in Open Library before broad text search.
 *
 * @param request - Series search request containing local ISBN evidence.
 * @returns Open Library docs found by ISBN.
 */
async function fetchOpenLibraryIsbnLookupResults(
  request: SeriesSearchRequest
): Promise<OpenLibrarySearchDoc[]> {
  const uniqueIsbns = [
    ...new Set(request.knownIsbns.map(normaliseIsbn).filter(Boolean)),
  ].slice(0, OPEN_LIBRARY_ISBN_LOOKUP_LIMIT);
  const results: OpenLibrarySearchDoc[] = [];

  for (const isbn of uniqueIsbns) {
    const payload = await fetchOpenLibraryJson<OpenLibrarySearchResponse>(
      buildOpenLibraryIsbnSearchPath(isbn),
      request.cache
    );
    results.push(...(payload?.docs ?? []).map((doc) => ({ ...doc, lookupIsbn: isbn })));
  }

  return results;
}

/**
 * Purpose: Fetch one Open Library search result set directly from Open
 * Library.
 *
 * @param query - Open Library search term.
 * @param limit - Maximum result count to request.
 * @param cache - Whether the shared provider cache should be used.
 * @returns Raw Open Library docs, or an empty list when none are returned.
 */
async function fetchOpenLibrarySearchResults(
  query: string,
  limit: number,
  cache: boolean
): Promise<OpenLibrarySearchDoc[]> {
  const payload = await fetchOpenLibraryJson<OpenLibrarySearchResponse>(
    buildOpenLibrarySearchPath(query, limit),
    cache
  );

  return payload?.docs ?? [];
}
