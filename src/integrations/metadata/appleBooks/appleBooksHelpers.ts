import type {
  ProviderSeriesBook,
  RegionCode,
} from "../../../domain/audiobook";
import { normaliseIsbn, normaliseText, valuesOverlap } from "../../../domain/normalise";
import type { SeriesSearchRequest } from "../metadataProvider";
import type { AppleBooksAudiobookResult } from "../appleBooksTypes";
import {
  buildAppleBooksSeriesId,
  buildAppleBooksTrackAsin,
} from "./appleBooksIds";
import {
  inferAppleBooksFormat,
  splitAppleBooksTitle,
} from "./appleBooksTitleParsing";
import { cleanProviderText } from "../providerText";
import { isLikelyRegionLanguage } from "../regionLanguage";

const APPLE_BOOKS_SEARCH_ONLY_LIMIT = 12;

/**
 * Purpose: Remove Apple results whose visible text strongly appears to be in a
 * language outside the selected region.
 *
 * @param results - Raw Apple audiobook results.
 * @param region - Complete Series region selected for the scan.
 * @returns Results whose language appears compatible with the region.
 */
export function filterAppleBooksResultsByRegionLanguage(
  results: AppleBooksAudiobookResult[],
  region: RegionCode
): AppleBooksAudiobookResult[] {
  return results.filter((result) =>
    isLikelyRegionLanguage(buildAppleBooksLanguageText(result), region)
  );
}

/**
 * Purpose: Choose Apple results for one review-only provider candidate. Strict
 * evidence wins first; when Apple returned search results but none meet those
 * checks, keep a small search-only set so Review can show that Apple had
 * possible-but-weak evidence instead of reporting a misleading 0%.
 *
 * @param results - Combined Apple results from ISBN, series, and author
 * searches.
 * @param searchFallbackResults - Apple results returned by the direct series
 * search, used only when strict evidence finds nothing.
 * @param request - Series search request containing local evidence.
 * @returns Relevant Apple results, or a bounded search-only fallback.
 */
export function selectAppleBooksCandidateResults(
  results: AppleBooksAudiobookResult[],
  searchFallbackResults: AppleBooksAudiobookResult[],
  request: SeriesSearchRequest
): AppleBooksAudiobookResult[] {
  const relevantResults = results.filter((result) => isRelevantAppleBooksResult(result, request));
  if (relevantResults.length > 0) return relevantResults;

  return searchFallbackResults.filter(hasAppleBooksTitle).slice(0, APPLE_BOOKS_SEARCH_ONLY_LIMIT);
}

/**
 * Purpose: Remove repeated Apple results when the series and author searches
 * return the same audiobook.
 *
 * @param results - Raw Apple audiobook results from one or more searches.
 * @returns Results with duplicate Apple ids or titles removed.
 */
export function deduplicateAppleBooksResults(
  results: AppleBooksAudiobookResult[]
): AppleBooksAudiobookResult[] {
  const seenKeys = new Set<string>();
  const uniqueResults: AppleBooksAudiobookResult[] = [];

  for (const result of results) {
    const key = getAppleBooksResultKey(result);
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    uniqueResults.push(result);
  }

  return uniqueResults;
}

/**
 * Purpose: Convert one Apple Search API audiobook result into Complete Series'
 * provider book shape.
 *
 * @param result - Raw Apple Books audiobook search result.
 * @param region - Complete Series region selected for the scan.
 * @param seriesName - Local series query that produced this candidate.
 * @returns Provider book metadata used by matching and missing-book detection.
 */
export function mapAppleBooksResultToProviderBook(
  result: AppleBooksAudiobookResult,
  region: RegionCode,
  seriesName: string
): ProviderSeriesBook {
  const rawTitle = getAppleBooksDisplayTitle(result);
  const description = cleanProviderText(result.longDescription ?? result.description);
  const summary = cleanProviderText(result.description);
  const titleParts = splitAppleBooksTitle(rawTitle, seriesName);
  const trackId = getAppleBooksResultIdentifier(result, rawTitle);

  return {
    asin: buildAppleBooksTrackAsin(trackId),
    title: titleParts.title,
    subtitle: null,
    description,
    summary,
    isbn: normaliseIsbn(result.lookupIsbn) || null,
    region,
    authors: cleanAppleBooksList([result.artistName]),
    narrators: [],
    genres: cleanAppleBooksList([result.primaryGenreName]),
    series: [
      {
        asin: buildAppleBooksSeriesId(seriesName),
        name: seriesName,
        position: titleParts.position,
      },
    ],
    bookFormat: inferAppleBooksFormat(rawTitle),
    releaseDate: normaliseAppleBooksReleaseDate(result.releaseDate),
    imageUrl: result.artworkUrl100 ?? null,
    link: result.trackViewUrl ?? result.collectionViewUrl ?? null,
    publisher: inferAppleBooksPublisher(description),
  };
}

/**
 * Purpose: Decide whether an Apple Books result is useful enough to include in
 * an experimental series candidate.
 *
 * @param result - Raw Apple Books audiobook result.
 * @param request - Search request containing local title and author evidence.
 * @returns `true` when the result shares title, author, series-name, or
 * confirmed ISBN evidence.
 */
export function isRelevantAppleBooksResult(
  result: AppleBooksAudiobookResult,
  request: SeriesSearchRequest
): boolean {
  if (!hasAppleBooksTitle(result)) return false;
  if (
    request.knownTitles.length === 0 &&
    request.authorNames.length === 0 &&
    request.knownIsbns.length === 0
  ) {
    return true;
  }

  const resultTitle = normaliseText(
    [
      result.trackName,
      result.collectionName,
      result.trackCensoredName,
      result.collectionCensoredName,
    ].join(" ")
  );
  const queryText = normaliseText(request.query);
  const knownTitleMatches = request.knownTitles.some((title) =>
    resultTitle.includes(normaliseText(title))
  );
  const knownIsbns = new Set(request.knownIsbns.map(normaliseIsbn));
  const knownIsbnMatches = Boolean(
    result.lookupIsbn && knownIsbns.has(normaliseIsbn(result.lookupIsbn))
  );

  return (
    knownIsbnMatches ||
    knownTitleMatches ||
    valuesOverlap(request.authorNames, cleanAppleBooksList([result.artistName])) ||
    (queryText.length > 0 && resultTitle.includes(queryText))
  );
}

/**
 * Purpose: Build the text used for Apple Books language detection.
 *
 * @param result - Raw Apple audiobook result.
 * @returns Cleaned title, contributor, and description text.
 */
function buildAppleBooksLanguageText(result: AppleBooksAudiobookResult): string {
  return (
    cleanProviderText(
      [
        result.trackName,
        result.collectionName,
        result.trackCensoredName,
        result.collectionCensoredName,
        result.artistName,
        result.description,
        result.longDescription,
      ].join(" ")
    ) ?? ""
  );
}

/**
 * Purpose: Build a stable de-duplication key for an Apple audiobook result.
 *
 * @param result - Raw Apple audiobook result.
 * @returns Apple id key when available, otherwise a title/author fallback.
 */
function getAppleBooksResultKey(result: AppleBooksAudiobookResult): string {
  const appleId = result.trackId ?? result.collectionId;
  if (appleId) return `id:${appleId}`;

  return `text:${normaliseText(`${getAppleBooksDisplayTitle(result)} ${result.artistName ?? ""}`)}`;
}

/**
 * Purpose: Check whether an Apple result has any visible title field we can
 * display or compare.
 *
 * @param result - Raw Apple audiobook result.
 * @returns `true` when at least one title-like field is present.
 */
function hasAppleBooksTitle(result: AppleBooksAudiobookResult): boolean {
  return Boolean(
    result.trackName ||
      result.collectionName ||
      result.trackCensoredName ||
      result.collectionCensoredName
  );
}

/**
 * Purpose: Pick the best visible title from Apple's audiobook fields.
 *
 * @param result - Raw Apple audiobook result.
 * @returns Clean display title, falling back to `Unknown Title`.
 */
function getAppleBooksDisplayTitle(result: AppleBooksAudiobookResult): string {
  return (
    cleanProviderText(
      result.trackName ??
        result.collectionName ??
        result.trackCensoredName ??
        result.collectionCensoredName
    ) ?? "Unknown Title"
  );
}

/**
 * Purpose: Pick the stable Apple identifier for an audiobook result.
 *
 * @param result - Raw Apple audiobook result.
 * @param rawTitle - Clean title fallback when Apple did not return an id.
 * @returns Apple track or collection id, or a deterministic title key.
 */
function getAppleBooksResultIdentifier(
  result: AppleBooksAudiobookResult,
  rawTitle: string
): string {
  const appleId = result.trackId ?? result.collectionId;
  return appleId ? String(appleId) : normaliseText(rawTitle) || "unknown";
}

/**
 * Purpose: Convert Apple storefront release datetimes to the YYYY-MM-DD format
 * used by Complete Series filters.
 *
 * @param releaseDate - Raw Apple release date.
 * @returns Date-only release text, or `null` when absent.
 */
function normaliseAppleBooksReleaseDate(releaseDate: string | undefined): string | null {
  return releaseDate?.slice(0, 10) ?? null;
}

/**
 * Purpose: Pull publisher-style text from common audiobook copyright wording in
 * Apple descriptions.
 *
 * @param description - Cleaned Apple description text.
 * @returns Publisher text, or `null` when Apple did not expose one clearly.
 */
function inferAppleBooksPublisher(description: string | null | undefined): string | null {
  const publisherMatch = /\(P\)\s*\d{4}\s+([^.;]+?)(?:\.|$)/i.exec(description ?? "");
  return cleanProviderText(publisherMatch?.[1]) ?? null;
}

/**
 * Purpose: Clean nullable Apple string arrays while dropping empty values.
 *
 * @param values - Optional Apple string values.
 * @returns Cleaned display strings.
 */
function cleanAppleBooksList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => cleanProviderText(value)).filter(isPresent);
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
