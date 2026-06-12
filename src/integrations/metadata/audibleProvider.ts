import type {
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  RegionCode,
} from "../../domain/audiobook";
import {
  normaliseIdentifier,
  normaliseText,
  textSimilarity,
  valuesOverlap,
} from "../../domain/normalise";
import { buildAudibleApiPath, fetchAudibleJson } from "./audibleApi";
import {
  applySeriesRelationship,
  getSeriesChildRelationships,
  mapAudibleProductToProviderBook,
} from "./audibleMappers";
import type { AudibleProduct, AudibleProductResponse } from "./audibleTypes";
import type {
  BookLookupRequest,
  MetadataProvider,
  SeriesLookupRequest,
  SeriesSearchRequest,
} from "./metadataProvider";
import { cleanProviderText } from "./providerText";

const MAX_BATCH_ASINS = 50;
const MAX_SEARCH_SERIES = 2;

type SearchSeriesGroup = {
  seriesAsin: string;
  seriesName: string;
  score: number;
  books: ProviderSeriesBook[];
};

export const audibleProvider: MetadataProvider = {
  id: "audible",
  displayName: "Audible catalogue",
  evidenceLevel: "trusted",
  capabilities: {
    supportsAudiobooks: true,
    supportsAvailability: true,
    supportsBookLookup: true,
    supportsCovers: true,
    supportsRegion: true,
    supportsSeriesLookup: true,
    supportsSeriesSearch: true,
  },
  getBookByAsin,
  getSeriesBooks,
  searchSeries,
};

/**
 * Purpose: Fetch one public Audible catalogue product by ASIN.
 *
 * @param request - Book lookup details, including ASIN, Audible region, and
 * cache preference.
 * @returns Provider book metadata mapped from Audible, or `null` when Audible
 * does not return a product.
 */
async function getBookByAsin(request: BookLookupRequest): Promise<ProviderSeriesBook | null> {
  const payload = await fetchAudibleJson<AudibleProductResponse>(
    buildAudibleApiPath(
      request.region,
      `/1.0/catalog/products/${encodeURIComponent(request.asin)}`
    ),
    request.cache
  );

  return payload?.product ? mapAudibleProductToProviderBook(payload.product, request.region) : null;
}

/**
 * Purpose: Fetch a complete Audible series by requesting the series placeholder
 * product, then loading its child products in ASIN batches.
 *
 * @param request - Series lookup details, including Audible series ASIN,
 * Audible region, and cache preference.
 * @returns A provider series candidate with books sorted by Audible's
 * relationship order, or `null` when the series cannot be found.
 */
async function getSeriesBooks(
  request: SeriesLookupRequest
): Promise<ProviderSeriesCandidate | null> {
  const seriesPayload = await fetchAudibleJson<AudibleProductResponse>(
    buildAudibleApiPath(
      request.region,
      `/1.0/catalog/products/${encodeURIComponent(request.seriesAsin)}`
    ),
    request.cache
  );
  const seriesProduct = seriesPayload?.product;
  if (!seriesProduct) return null;

  const relationships = getSeriesChildRelationships(seriesProduct);
  const childAsins = relationships.map((relationship) => relationship.asin).filter(isPresent);
  const childProducts = await fetchProductsByAsins(childAsins, request.region, request.cache);
  const childBooksByAsin = new Map(
    childProducts.map((product) => [
      normaliseIdentifier(product.asin),
      mapAudibleProductToProviderBook(product, request.region),
    ])
  );

  const seriesAsin = normaliseIdentifier(request.seriesAsin);
  const seriesName = cleanProviderText(seriesProduct.title) ?? request.seriesAsin;
  const books = relationships
    .map((relationship) => {
      const book = childBooksByAsin.get(normaliseIdentifier(relationship.asin));
      return book ? applySeriesRelationship(book, seriesAsin, seriesName, relationship) : null;
    })
    .filter(isPresent);

  if (books.length === 0) return null;

  return {
    seriesAsin: request.seriesAsin,
    name: seriesName,
    region: request.region,
    books,
  };
}

/**
 * Purpose: Search public Audible catalogue data for likely series when ASIN-based
 * discovery fails.
 *
 * @param request - Search text and local evidence, including the local series
 * name, author names, known local titles, Audible region, and cache preference.
 * @returns Full provider series candidates for the best matching Audible series.
 */
async function searchSeries(request: SeriesSearchRequest): Promise<ProviderSeriesCandidate[]> {
  const products = await searchProductsByKeywords(request.query, request.region, request.cache);
  const groupedSeries = rankSearchSeriesGroups(products, request).slice(0, MAX_SEARCH_SERIES);
  const candidates: ProviderSeriesCandidate[] = [];

  for (const group of groupedSeries) {
    try {
      const fullSeries = await getSeriesBooks({
        seriesAsin: group.seriesAsin,
        region: request.region,
        cache: request.cache,
      });

      candidates.push(
        fullSeries ?? {
          seriesAsin: group.seriesAsin,
          name: group.seriesName,
          region: request.region,
          books: group.books,
        }
      );
    } catch {
      candidates.push({
        seriesAsin: group.seriesAsin,
        name: group.seriesName,
        region: request.region,
        books: group.books,
      });
    }
  }

  return candidates;
}

/**
 * Purpose: Fetch a batch of public Audible catalogue products by ASIN.
 *
 * @param asins - Audible product ASINs to request.
 * @param region - Audible marketplace region used to choose the API host.
 * @param cache - Whether repeated requests in this browser session should reuse
 * an in-memory promise cache.
 * @returns Raw Audible product records returned by the catalogue endpoint.
 */
async function fetchProductsByAsins(
  asins: string[],
  region: RegionCode,
  cache: boolean
): Promise<AudibleProduct[]> {
  const products: AudibleProduct[] = [];

  for (let start = 0; start < asins.length; start += MAX_BATCH_ASINS) {
    const batchAsins = asins.slice(start, start + MAX_BATCH_ASINS);
    const payload = await fetchAudibleJson<AudibleProductResponse>(
      buildAudibleApiPath(region, "/1.0/catalog/products", {
        asins: batchAsins.join(","),
      }),
      cache
    );

    products.push(...(payload?.products ?? []));
  }

  return products;
}

/**
 * Purpose: Search Audible products with a text query and request enough
 * response groups to expose series, contributor, SKU, and cover metadata.
 *
 * @param query - Text query, usually the local Audiobookshelf series name.
 * @param region - Audible marketplace region used to choose the API host.
 * @param cache - Whether repeated requests in this browser session should reuse
 * an in-memory promise cache.
 * @returns Raw Audible products returned by the catalogue search endpoint.
 */
async function searchProductsByKeywords(
  query: string,
  region: RegionCode,
  cache: boolean
): Promise<AudibleProduct[]> {
  const payload = await fetchAudibleJson<AudibleProductResponse>(
    buildAudibleApiPath(region, "/1.0/catalog/products", {
      keywords: query,
      num_results: "50",
    }),
    cache
  );

  return payload?.products ?? [];
}

/**
 * Purpose: Group searched Audible books by series and rank the groups against
 * local Audiobookshelf evidence.
 *
 * @param products - Audible products returned by a keyword search.
 * @param request - Search request containing local series, author, and title
 * evidence.
 * @returns Series groups ordered from most to least likely to be the correct
 * provider series.
 */
function rankSearchSeriesGroups(
  products: AudibleProduct[],
  request: SeriesSearchRequest
): SearchSeriesGroup[] {
  const groups = new Map<string, SearchSeriesGroup>();
  const knownTitles = new Set(request.knownTitles.map(normaliseText).filter(Boolean));

  for (const product of products) {
    const providerBook = mapAudibleProductToProviderBook(product, request.region);

    for (const seriesEntry of providerBook.series) {
      if (!seriesEntry.asin) continue;

      const seriesAsin = normaliseIdentifier(seriesEntry.asin);
      const existingGroup = groups.get(seriesAsin) ?? {
        seriesAsin: seriesEntry.asin,
        seriesName: seriesEntry.name,
        score: 0,
        books: [],
      };

      existingGroup.books.push(providerBook);
      existingGroup.score += scoreSearchSeriesEntry(
        seriesEntry.name,
        providerBook,
        request,
        knownTitles
      );
      groups.set(seriesAsin, existingGroup);
    }
  }

  return [...groups.values()].sort((first, second) => second.score - first.score);
}

/**
 * Purpose: Score one searched series entry using local series name, author, and
 * title evidence.
 *
 * @param seriesName - Audible series title from a searched product.
 * @param providerBook - Audible book that exposed the series entry.
 * @param request - Local search evidence from Audiobookshelf.
 * @param knownTitles - Normalised set of titles already known locally.
 * @returns A numeric relevance score for ranking searched series groups.
 */
function scoreSearchSeriesEntry(
  seriesName: string,
  providerBook: ProviderSeriesBook,
  request: SeriesSearchRequest,
  knownTitles: Set<string>
): number {
  let score = textSimilarity(request.query, seriesName) * 10;

  if (valuesOverlap(request.authorNames, providerBook.authors)) score += 3;
  if (knownTitles.has(normaliseText(providerBook.title))) score += 2;

  return score;
}

/**
 * Purpose: Narrow nullable values when mapping arrays.
 *
 * @param value - Value that may be null or undefined.
 * @returns `true` when the value is present.
 */
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
