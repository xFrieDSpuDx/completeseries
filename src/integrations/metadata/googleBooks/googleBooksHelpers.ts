import type {
  ProviderSeriesBook,
  RegionCode,
} from "../../../domain/audiobook";
import { normaliseIsbn, normaliseText, valuesOverlap } from "../../../domain/normalise";
import type { SeriesSearchRequest } from "../metadataProvider";
import type { GoogleBooksVolume } from "../googleBooksTypes";
import { cleanProviderText } from "../providerText";
import { hasRegionLanguageCode } from "../regionLanguage";

const GOOGLE_BOOKS_ISBN_LOOKUP_LIMIT_BY_DEPTH = {
  quick: 0,
  balanced: 1,
  thorough: 3,
};
const GOOGLE_BOOKS_SERIES_ID_PREFIX = "google-books:search:";
const GOOGLE_BOOKS_VOLUME_ID_PREFIX = "google-books:volume:";

/**
 * Purpose: Filter Google Books results to the selected region language and
 * local title, author, series-name, or ISBN evidence.
 *
 * @param volumes - Google Books volumes from one or more request paths.
 * @param request - Series search request containing local evidence.
 * @returns Volumes suitable for one review-only provider candidate.
 */
export function filterRelevantGoogleBooksVolumes(
  volumes: GoogleBooksVolume[],
  request: SeriesSearchRequest
): GoogleBooksVolume[] {
  return volumes
    .filter((volume) => hasRegionLanguageCode(getGoogleBooksLanguages(volume), request.region))
    .filter((volume) => isRelevantGoogleBooksVolume(volume, request));
}

/**
 * Purpose: Limit Google Books ISBN fallback requests according to the selected
 * scan depth so broad scans do not spend one request per local book by
 * default.
 *
 * @param metadataLookupMode - Current scan depth.
 * @returns Maximum number of local ISBNs to look up after broad search fails.
 */
export function getGoogleBooksIsbnLookupLimit(
  metadataLookupMode: SeriesSearchRequest["metadataLookupMode"]
): number {
  return GOOGLE_BOOKS_ISBN_LOOKUP_LIMIT_BY_DEPTH[metadataLookupMode ?? "balanced"];
}

/**
 * Purpose: Build a Google Books query from local series, title, and author
 * evidence without over-constraining sparse catalogues.
 *
 * @param request - Series search request containing local evidence.
 * @returns Google Books query text.
 */
export function buildGoogleBooksSeriesSearchQuery(request: SeriesSearchRequest): string {
  const authorName = request.authorNames.find((name) => name.trim());
  if (!authorName) return request.query;

  return `${request.query} inauthor:${authorName}`;
}

/**
 * Purpose: Remove repeated Google Books volumes when ISBN and text searches
 * return the same book.
 *
 * @param volumes - Raw Google Books volumes from one or more searches.
 * @returns Volumes with duplicate ids or title/author pairs removed.
 */
export function deduplicateGoogleBooksVolumes(volumes: GoogleBooksVolume[]): GoogleBooksVolume[] {
  const seenKeys = new Set<string>();
  const uniqueVolumes: GoogleBooksVolume[] = [];

  for (const volume of volumes) {
    const key = getGoogleBooksVolumeKey(volume);
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    uniqueVolumes.push(volume);
  }

  return uniqueVolumes;
}

/**
 * Purpose: Convert one Google Books volume into Complete Series' provider book
 * shape.
 *
 * @param volume - Raw Google Books volume.
 * @param region - Complete Series region selected for the scan.
 * @param seriesName - Local series query that produced this candidate.
 * @returns Provider book metadata used by review and tentative missing results.
 */
export function mapGoogleBooksVolumeToProviderBook(
  volume: GoogleBooksVolume,
  region: RegionCode,
  seriesName: string
): ProviderSeriesBook {
  const volumeInfo = volume.volumeInfo ?? {};
  const title = cleanProviderText(volumeInfo.title) ?? "Unknown Title";
  const volumeId = (volume.id ?? normaliseText(title)) || "unknown";
  const isbn = getBestGoogleBooksIsbn(volume);

  return {
    asin: `${GOOGLE_BOOKS_VOLUME_ID_PREFIX}${volumeId}`,
    title,
    subtitle: cleanProviderText(volumeInfo.subtitle),
    description: cleanProviderText(volumeInfo.description),
    summary: null,
    isbn,
    region,
    authors: cleanGoogleBooksList(volumeInfo.authors),
    narrators: [],
    genres: cleanGoogleBooksList(volumeInfo.categories),
    series: [
      {
        asin: buildGoogleBooksSeriesId(seriesName),
        name: seriesName,
        position: null,
      },
    ],
    bookFormat: null,
    releaseDate: normaliseGoogleBooksPublishedDate(volumeInfo.publishedDate),
    imageUrl: volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail ?? null,
    link: volumeInfo.previewLink ?? null,
    publisher: cleanProviderText(volumeInfo.publisher) ?? null,
  };
}

/**
 * Purpose: Build a stable synthetic provider series id for Google Books search
 * candidates.
 *
 * @param query - Series search query.
 * @returns Synthetic provider series id.
 */
export function buildGoogleBooksSeriesId(query: string): string {
  return `${GOOGLE_BOOKS_SERIES_ID_PREFIX}${encodeURIComponent(query.trim())}`;
}

/**
 * Purpose: Extract the original search query from a synthetic Google Books
 * series id.
 *
 * @param seriesAsin - Synthetic provider series id.
 * @returns Original query, or `null` for ids from other providers.
 */
export function parseGoogleBooksSeriesQuery(seriesAsin: string): string | null {
  if (!seriesAsin.startsWith(GOOGLE_BOOKS_SERIES_ID_PREFIX)) return null;

  try {
    return decodeURIComponent(seriesAsin.slice(GOOGLE_BOOKS_SERIES_ID_PREFIX.length));
  } catch {
    return null;
  }
}

/**
 * Purpose: Build a stable de-duplication key for a Google Books volume.
 *
 * @param volume - Raw Google Books volume.
 * @returns Google id key when available, otherwise a title/author fallback.
 */
function getGoogleBooksVolumeKey(volume: GoogleBooksVolume): string {
  if (volume.id) return `id:${volume.id}`;

  return `text:${normaliseText(
    `${volume.volumeInfo?.title ?? ""} ${(volume.volumeInfo?.authors ?? []).join(" ")}`
  )}`;
}

/**
 * Purpose: Decide whether a Google Books volume is useful enough to include in
 * an experimental candidate.
 *
 * @param volume - Raw Google Books volume.
 * @param request - Search request containing local title, author, and ISBN
 * evidence.
 * @returns `true` when the volume shares title, author, series-name, or ISBN
 * evidence.
 */
function isRelevantGoogleBooksVolume(
  volume: GoogleBooksVolume,
  request: SeriesSearchRequest
): boolean {
  const volumeInfo = volume.volumeInfo;
  if (!volumeInfo?.title) return false;
  if (
    request.knownTitles.length === 0 &&
    request.authorNames.length === 0 &&
    request.knownIsbns.length === 0
  ) {
    return true;
  }

  const titleText = normaliseText([volumeInfo.title, volumeInfo.subtitle].join(" "));
  const queryText = normaliseText(request.query);
  const knownTitleMatches = request.knownTitles.some((title) =>
    textIncludesEither(titleText, normaliseText(title))
  );
  const knownIsbns = new Set(request.knownIsbns.map(normaliseIsbn).filter(Boolean));
  const volumeIsbns = getGoogleBooksIsbns(volume);
  const knownIsbnMatches = volumeIsbns.some((isbn) => knownIsbns.has(isbn));

  return (
    knownIsbnMatches ||
    knownTitleMatches ||
    valuesOverlap(request.authorNames, cleanGoogleBooksList(volumeInfo.authors)) ||
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
 * Purpose: Choose the most useful ISBN exposed by a Google Books volume.
 *
 * @param volume - Raw Google Books volume.
 * @returns Normalised ISBN, preferring the ISBN that came from a local lookup.
 */
function getBestGoogleBooksIsbn(volume: GoogleBooksVolume): string | null {
  return normaliseIsbn(volume.lookupIsbn) || getGoogleBooksIsbns(volume)[0] || null;
}

/**
 * Purpose: Extract normalised ISBN values from a Google Books volume.
 *
 * @param volume - Raw Google Books volume.
 * @returns Normalised ISBN values.
 */
function getGoogleBooksIsbns(volume: GoogleBooksVolume): string[] {
  return (
    volume.volumeInfo?.industryIdentifiers
      ?.map((identifier) => normaliseIsbn(identifier.identifier))
      .filter(Boolean) ?? []
  );
}

/**
 * Purpose: Extract Google Books language codes for region-language filtering.
 *
 * @param volume - Raw Google Books volume.
 * @returns Language codes supplied by Google Books.
 */
function getGoogleBooksLanguages(volume: GoogleBooksVolume): string[] {
  return volume.volumeInfo?.language ? [volume.volumeInfo.language] : [];
}

/**
 * Purpose: Convert Google Books published-date strings to a comparable date
 * value when they include at least a year.
 *
 * @param publishedDate - Google Books published date, often YYYY or
 * YYYY-MM-DD.
 * @returns Date text suitable for filters, or `null` when absent.
 */
function normaliseGoogleBooksPublishedDate(publishedDate: string | undefined): string | null {
  return cleanProviderText(publishedDate);
}

/**
 * Purpose: Clean nullable Google Books string arrays while dropping empty
 * values.
 *
 * @param values - Optional Google Books string values.
 * @returns Cleaned display strings.
 */
function cleanGoogleBooksList(values: Array<string | null | undefined> | undefined): string[] {
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
