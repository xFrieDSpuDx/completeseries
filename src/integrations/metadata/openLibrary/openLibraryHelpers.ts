import type {
  ProviderSeriesBook,
  RegionCode,
} from "../../../domain/audiobook";
import { normaliseIsbn, normaliseText, valuesOverlap } from "../../../domain/normalise";
import type { SeriesSearchRequest } from "../metadataProvider";
import type { OpenLibrarySearchDoc } from "../openLibraryTypes";
import { cleanProviderText } from "../providerText";
import { hasRegionLanguageCode } from "../regionLanguage";

const OPEN_LIBRARY_SERIES_ID_PREFIX = "open-library:search:";
const OPEN_LIBRARY_WORK_ID_PREFIX = "open-library:work:";

/**
 * Purpose: Filter Open Library docs to the selected region language and local
 * title, author, series-name, or ISBN evidence.
 *
 * @param docs - Open Library docs from one or more request paths.
 * @param request - Series search request containing local evidence.
 * @returns Docs suitable for one review-only provider candidate.
 */
export function filterRelevantOpenLibraryDocs(
  docs: OpenLibrarySearchDoc[],
  request: SeriesSearchRequest
): OpenLibrarySearchDoc[] {
  return docs
    .filter((doc) => hasRegionLanguageCode(doc.language, request.region))
    .filter((doc) => isRelevantOpenLibraryDoc(doc, request));
}

/**
 * Purpose: Remove repeated Open Library docs when ISBN and text searches return
 * the same work.
 *
 * @param docs - Raw Open Library docs from one or more searches.
 * @returns Docs with duplicate work ids or title/author pairs removed.
 */
export function deduplicateOpenLibraryDocs(
  docs: OpenLibrarySearchDoc[]
): OpenLibrarySearchDoc[] {
  const seenKeys = new Set<string>();
  const uniqueDocs: OpenLibrarySearchDoc[] = [];

  for (const doc of docs) {
    const key = getOpenLibraryDocKey(doc);
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    uniqueDocs.push(doc);
  }

  return uniqueDocs;
}

/**
 * Purpose: Convert one Open Library search doc into Complete Series' provider
 * book shape.
 *
 * @param doc - Raw Open Library search doc.
 * @param region - Complete Series region selected for the scan.
 * @param seriesName - Local series query that produced this candidate.
 * @returns Provider book metadata used by review and tentative missing results.
 */
export function mapOpenLibraryDocToProviderBook(
  doc: OpenLibrarySearchDoc,
  region: RegionCode,
  seriesName: string
): ProviderSeriesBook {
  const title = cleanProviderText(doc.title) ?? "Unknown Title";
  const workId = parseOpenLibraryWorkId(doc.key) ?? (normaliseText(title) || "unknown");
  const isbn = getBestOpenLibraryIsbn(doc);

  return {
    asin: `${OPEN_LIBRARY_WORK_ID_PREFIX}${workId}`,
    title,
    subtitle: null,
    description: null,
    summary: null,
    isbn,
    region,
    authors: cleanOpenLibraryList(doc.author_name),
    narrators: [],
    genres: [],
    series: [
      {
        asin: buildOpenLibrarySeriesId(seriesName),
        name: seriesName,
        position: null,
      },
    ],
    bookFormat: null,
    releaseDate: null,
    imageUrl: buildOpenLibraryCoverUrl(doc, isbn),
    link: buildOpenLibraryLink(doc),
    publisher: cleanProviderText(doc.publisher?.[0]) ?? null,
  };
}

/**
 * Purpose: Build a stable synthetic provider series id for Open Library search
 * candidates.
 *
 * @param query - Series search query.
 * @returns Synthetic provider series id.
 */
export function buildOpenLibrarySeriesId(query: string): string {
  return `${OPEN_LIBRARY_SERIES_ID_PREFIX}${encodeURIComponent(query.trim())}`;
}

/**
 * Purpose: Extract the original search query from a synthetic Open Library
 * series id.
 *
 * @param seriesAsin - Synthetic provider series id.
 * @returns Original query, or `null` for ids from other providers.
 */
export function parseOpenLibrarySeriesQuery(seriesAsin: string): string | null {
  if (!seriesAsin.startsWith(OPEN_LIBRARY_SERIES_ID_PREFIX)) return null;

  try {
    return decodeURIComponent(seriesAsin.slice(OPEN_LIBRARY_SERIES_ID_PREFIX.length));
  } catch {
    return null;
  }
}

/**
 * Purpose: Build a stable de-duplication key for an Open Library search doc.
 *
 * @param doc - Raw Open Library search doc.
 * @returns Work id key when available, otherwise a title/author fallback.
 */
function getOpenLibraryDocKey(doc: OpenLibrarySearchDoc): string {
  const workId = parseOpenLibraryWorkId(doc.key);
  if (workId) return `work:${workId}`;

  return `text:${normaliseText(`${doc.title ?? ""} ${(doc.author_name ?? []).join(" ")}`)}`;
}

/**
 * Purpose: Decide whether an Open Library result is useful enough to include in
 * an experimental candidate.
 *
 * @param doc - Raw Open Library search doc.
 * @param request - Search request containing local title, author, and ISBN
 * evidence.
 * @returns `true` when the doc shares title, author, series-name, or ISBN
 * evidence.
 */
function isRelevantOpenLibraryDoc(
  doc: OpenLibrarySearchDoc,
  request: SeriesSearchRequest
): boolean {
  if (!doc.title) return false;
  if (
    request.knownTitles.length === 0 &&
    request.authorNames.length === 0 &&
    request.knownIsbns.length === 0
  ) {
    return true;
  }

  const titleText = normaliseText(doc.title);
  const queryText = normaliseText(request.query);
  const knownTitleMatches = request.knownTitles.some((title) =>
    textIncludesEither(titleText, normaliseText(title))
  );
  const knownIsbns = new Set(request.knownIsbns.map(normaliseIsbn).filter(Boolean));
  const docIsbns = [doc.lookupIsbn, ...(doc.isbn ?? [])].map(normaliseIsbn).filter(Boolean);
  const knownIsbnMatches = docIsbns.some((isbn) => knownIsbns.has(isbn));

  return (
    knownIsbnMatches ||
    knownTitleMatches ||
    valuesOverlap(request.authorNames, cleanOpenLibraryList(doc.author_name)) ||
    (queryText.length > 0 && titleText.includes(queryText))
  );
}

/**
 * Purpose: Compare two normalised title fragments in either direction so
 * provider subtitles folded into titles can still match local title evidence.
 *
 * @param firstText - First normalised title text.
 * @param secondText - Second normalised title text.
 * @returns `true` when either value contains the other.
 */
function textIncludesEither(firstText: string, secondText: string): boolean {
  if (!firstText || !secondText) return false;
  return firstText.includes(secondText) || secondText.includes(firstText);
}

/**
 * Purpose: Choose the most useful ISBN exposed by an Open Library result.
 *
 * @param doc - Raw Open Library search doc.
 * @returns Normalised ISBN, preferring the ISBN that came from a local lookup.
 */
function getBestOpenLibraryIsbn(doc: OpenLibrarySearchDoc): string | null {
  return normaliseIsbn(doc.lookupIsbn) || doc.isbn?.map(normaliseIsbn).find(Boolean) || null;
}

/**
 * Purpose: Build a cover image URL using Open Library's supported cover IDs or
 * ISBN cover route.
 *
 * @param doc - Raw Open Library search doc.
 * @param isbn - Best normalised ISBN for the doc, if available.
 * @returns Open Library cover URL, or `null` when no cover key is available.
 */
function buildOpenLibraryCoverUrl(doc: OpenLibrarySearchDoc, isbn: string | null): string | null {
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

  return null;
}

/**
 * Purpose: Build a human-facing Open Library page link for a result.
 *
 * @param doc - Raw Open Library search doc.
 * @returns Open Library page URL, or `null` when the doc has no key.
 */
function buildOpenLibraryLink(doc: OpenLibrarySearchDoc): string | null {
  return doc.key ? `https://openlibrary.org${doc.key}` : null;
}

/**
 * Purpose: Extract an Open Library work id from a search doc key.
 *
 * @param key - Raw Open Library key such as `/works/OL123W`.
 * @returns Work id, or `null` when the key is not a work key.
 */
function parseOpenLibraryWorkId(key: string | null | undefined): string | null {
  const match = /^\/works\/([^/]+)$/.exec(key ?? "");
  return match?.[1] ?? null;
}

/**
 * Purpose: Clean nullable Open Library string arrays while dropping empty
 * values.
 *
 * @param values - Optional Open Library string values.
 * @returns Cleaned display strings.
 */
function cleanOpenLibraryList(values: Array<string | null | undefined> | undefined): string[] {
  return (values ?? []).map((value) => cleanProviderText(value)).filter(isPresent);
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
