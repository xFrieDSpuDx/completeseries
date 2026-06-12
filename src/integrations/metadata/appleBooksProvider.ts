import type {
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  RegionCode,
} from "../../domain/audiobook";
import { normaliseIsbn } from "../../domain/normalise";
import {
  buildAppleBooksIsbnLookupPath,
  buildAppleBooksLookupPath,
  buildAppleBooksSearchPath,
  fetchAppleBooksJson,
} from "./appleBooksApi";
import type {
  AppleBooksAudiobookResult,
  AppleBooksSearchResponse,
} from "./appleBooksTypes";
import type {
  BookLookupRequest,
  MetadataProvider,
  SeriesLookupRequest,
  SeriesSearchRequest,
} from "./metadataProvider";
import {
  deduplicateAppleBooksResults,
  filterAppleBooksResultsByRegionLanguage,
  isRelevantAppleBooksResult,
  mapAppleBooksResultToProviderBook,
  selectAppleBooksCandidateResults,
} from "./appleBooks/appleBooksHelpers";
import {
  buildAppleBooksSeriesId,
  getAppleStorefrontCountry,
  parseAppleBooksSeriesQuery,
  parseAppleBooksTrackId,
} from "./appleBooks/appleBooksIds";

const APPLE_BOOKS_SEARCH_LIMIT = 50;
const APPLE_BOOKS_AUTHOR_CATALOGUE_LIMIT = 200;

export const appleBooksProvider: MetadataProvider = {
  id: "appleBooks",
  displayName: "Apple Books",
  evidenceLevel: "review",
  capabilities: {
    supportsAudiobooks: true,
    supportsAvailability: false,
    supportsBookLookup: false,
    supportsCovers: true,
    supportsRegion: true,
    supportsSeriesLookup: false,
    supportsSeriesSearch: true,
  },
  getBookByAsin,
  getSeriesBooks,
  searchSeries,
};

/**
 * Purpose: Look up one Apple Books audiobook when Complete Series has a
 * synthetic Apple track identifier.
 *
 * @param request - Book lookup details. Normal Audible ASINs are ignored
 * because Apple does not use ASIN identifiers.
 * @returns Provider book metadata, or `null` when the identifier is not an
 * Apple Books track id.
 */
async function getBookByAsin(request: BookLookupRequest): Promise<ProviderSeriesBook | null> {
  const trackId = parseAppleBooksTrackId(request.asin);
  if (!trackId) return null;

  const payload = await fetchAppleBooksJson<AppleBooksSearchResponse>(
    buildAppleBooksLookupPath(trackId, getAppleStorefrontCountry(request.region)),
    request.cache
  );
  const result = payload?.results?.[0];

  return result ? mapAppleBooksResultToProviderBook(result, request.region, "Apple Books") : null;
}

/**
 * Purpose: Rebuild an experimental Apple Books search candidate from its
 * synthetic series id, mainly so saved manual matches remain loadable.
 *
 * @param request - Series lookup details containing a synthetic Apple search id.
 * @returns A provider series candidate, or `null` when the id was not created
 * by the Apple Books provider.
 */
async function getSeriesBooks(
  request: SeriesLookupRequest
): Promise<ProviderSeriesCandidate | null> {
  const query = parseAppleBooksSeriesQuery(request.seriesAsin);
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
 * Purpose: Search Apple Books audiobook results for candidate series evidence.
 *
 * @param request - Search text and local evidence from Audiobookshelf.
 * @returns At most one experimental provider candidate built from Apple Books
 * audiobook search results.
 */
async function searchSeries(request: SeriesSearchRequest): Promise<ProviderSeriesCandidate[]> {
  const query = request.query.trim();
  if (!query) return [];

  const country = getAppleStorefrontCountry(request.region);
  const isbnResults = filterAppleBooksResultsByRegionLanguage(
    await fetchAppleBooksIsbnLookupResults(request, country),
    request.region
  );
  const searchResults = filterAppleBooksResultsByRegionLanguage(
    await fetchAppleBooksSearchResults(query, country, APPLE_BOOKS_SEARCH_LIMIT, request.cache),
    request.region
  );
  const initialRelevantResults = searchResults.filter((result) =>
    isRelevantAppleBooksResult(result, request)
  );
  const authorCatalogueResults = filterAppleBooksResultsByRegionLanguage(
    await fetchAppleBooksAuthorCatalogueResults(request, country, initialRelevantResults.length),
    request.region
  );
  const combinedResults = deduplicateAppleBooksResults([
    ...isbnResults,
    ...searchResults,
    ...authorCatalogueResults,
  ]);
  const relevantResults = selectAppleBooksCandidateResults(combinedResults, searchResults, request);
  const books = relevantResults
    .map((result) => mapAppleBooksResultToProviderBook(result, request.region, query));

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
      seriesAsin: buildAppleBooksSeriesId(query),
    },
  ];
}

/**
 * Purpose: Look up local ISBNs in Apple Books before falling back to text
 * search evidence.
 *
 * @param request - Series search request containing local ISBN evidence.
 * @param country - Two-letter Apple storefront country code.
 * @returns Apple audiobook results found by ISBN.
 */
async function fetchAppleBooksIsbnLookupResults(
  request: SeriesSearchRequest,
  country: string
): Promise<AppleBooksAudiobookResult[]> {
  const uniqueIsbns = [
    ...new Set(request.knownIsbns.map(normaliseIsbn).filter(Boolean)),
  ].slice(0, 3);
  const results: AppleBooksAudiobookResult[] = [];

  for (const isbn of uniqueIsbns) {
    const payload = await fetchAppleBooksJson<AppleBooksSearchResponse>(
      buildAppleBooksIsbnLookupPath(isbn, country),
      request.cache
    );
    results.push(
      ...(payload?.results ?? []).map((result) => ({ ...result, lookupIsbn: isbn }))
    );
  }

  return results;
}

/**
 * Purpose: Fetch one Apple Books audiobook search result set through the local
 * proxy.
 *
 * @param query - Apple Search API term.
 * @param country - Two-letter Apple storefront country code.
 * @param limit - Maximum result count to request.
 * @param cache - Whether the shared provider cache should be used.
 * @returns Raw Apple audiobook results, or an empty list when Apple returned no
 * results.
 */
async function fetchAppleBooksSearchResults(
  query: string,
  country: string,
  limit: number,
  cache: boolean
): Promise<AppleBooksAudiobookResult[]> {
  const payload = await fetchAppleBooksJson<AppleBooksSearchResponse>(
    buildAppleBooksSearchPath(query, country, limit),
    cache
  );

  return payload?.results ?? [];
}

/**
 * Purpose: Use local author evidence to gather a broader Apple catalogue when
 * the series-name search is too thin to be useful.
 *
 * @param request - Series search request containing local author evidence.
 * @param country - Two-letter Apple storefront country code.
 * @param initialRelevantCount - Number of useful results already found from
 * the series-name search.
 * @returns Additional Apple audiobook results to filter as review evidence.
 */
async function fetchAppleBooksAuthorCatalogueResults(
  request: SeriesSearchRequest,
  country: string,
  initialRelevantCount: number
): Promise<AppleBooksAudiobookResult[]> {
  if (initialRelevantCount >= Math.min(3, request.knownTitles.length + 1)) return [];

  const authorName = request.authorNames.find((name) => name.trim());
  if (!authorName) return [];

  return fetchAppleBooksSearchResults(
    authorName,
    country,
    APPLE_BOOKS_AUTHOR_CATALOGUE_LIMIT,
    request.cache
  );
}
