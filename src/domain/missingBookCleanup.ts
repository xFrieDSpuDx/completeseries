import type { ProviderSeriesBook, ProviderSeriesCandidate } from "./audiobook";
import type { MissingBookOptions } from "./missingBookTypes";
import { normaliseText } from "./normalise";
import {
  getProviderSeriesPosition,
  isProviderBookContainer,
  isProviderBookUnabridged,
} from "./providerBookChecks";

/**
 * Purpose: Remove duplicate provider entries that represent the same real book
 * before results are shown.
 *
 * @param providerBooks - Provider books that survived the ownership checks.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns Provider books de-duplicated by title, author, and matched-series
 * position while preserving the first best-looking entry.
 */
export function deduplicateProviderBooks(
  providerBooks: ProviderSeriesBook[],
  providerSeries: ProviderSeriesCandidate
): ProviderSeriesBook[] {
  const booksByKey = new Map<string, ProviderSeriesBook>();

  for (const providerBook of providerBooks) {
    const dedupeKey = buildProviderBookDedupeKey(providerBook, providerSeries);
    const existingBook = booksByKey.get(dedupeKey);

    if (
      !existingBook ||
      scoreProviderBookForDisplay(providerBook) > scoreProviderBookForDisplay(existingBook)
    ) {
      booksByKey.set(dedupeKey, providerBook);
    }
  }

  return [...booksByKey.values()];
}

/**
 * Purpose: Apply V1-style cleanup filters that compare candidate missing books
 * against other books already accepted for the same result group.
 *
 * @param providerBooks - Candidate missing books after ownership and metadata
 * filters have already been applied.
 * @param providerSeries - Provider series selected by the matching step.
 * @param options - Missing-list duplicate filters from the scan form.
 * @returns Candidate books with optional duplicate title/subtitle and duplicate
 * series-position entries removed.
 */
export function applyMissingArrayFilters(
  providerBooks: ProviderSeriesBook[],
  providerSeries: ProviderSeriesCandidate,
  options: MissingBookOptions
): ProviderSeriesBook[] {
  const acceptedBooks: ProviderSeriesBook[] = [];
  const acceptedTitleSubtitleKeys = new Set<string>();
  const acceptedSeriesPositionKeys = new Set<string>();

  for (const providerBook of providerBooks) {
    const titleSubtitleKey = buildTitleSubtitleKey(providerBook);
    const seriesPositionKey = buildProviderSeriesPositionKey(providerBook, providerSeries);

    if (
      options.ignoreTitleSubtitleInMissingArray &&
      titleSubtitleKey &&
      acceptedTitleSubtitleKeys.has(titleSubtitleKey)
    ) {
      continue;
    }

    if (
      options.ignoreSameSeriesPositionInMissingArray &&
      seriesPositionKey &&
      acceptedSeriesPositionKeys.has(seriesPositionKey)
    ) {
      continue;
    }

    acceptedBooks.push(providerBook);
    if (titleSubtitleKey) acceptedTitleSubtitleKeys.add(titleSubtitleKey);
    if (seriesPositionKey) acceptedSeriesPositionKeys.add(seriesPositionKey);
  }

  return acceptedBooks;
}

/**
 * Purpose: Build a stable key for provider books that may appear as multiple
 * Audible editions.
 *
 * @param providerBook - Provider book to key.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns A normalised key using title, first author, and matched-series
 * position when available.
 */
function buildProviderBookDedupeKey(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): string {
  const titleKey = normaliseText(providerBook.title);
  const authorKey = normaliseText(providerBook.authors[0]);
  const positionKey = getProviderSeriesPosition(providerBook, providerSeries);

  return [titleKey, authorKey, positionKey ?? ""].join("::");
}

/**
 * Purpose: Score duplicate provider books so the most useful entry is kept for
 * display.
 *
 * @param providerBook - Provider book being ranked.
 * @returns A display quality score where higher is better.
 */
function scoreProviderBookForDisplay(providerBook: ProviderSeriesBook): number {
  let score = 0;
  if (isProviderBookUnabridged(providerBook)) score += 4;
  if (providerBook.isAvailable !== false) score += 2;
  if (providerBook.isBuyable === true) score += 2;
  if (providerBook.isBuyable === false) score -= 1;
  if (providerBook.imageUrl) score += 1;
  if (providerBook.link) score += 1;
  if (isProviderBookContainer(providerBook)) score -= 10;
  return score;
}

/**
 * Purpose: Build the V1-style duplicate key for comparing missing-list books by
 * title and subtitle only.
 *
 * @param providerBook - Provider book to key.
 * @returns A normalised title/subtitle key, or an empty string if the title is
 * missing.
 */
function buildTitleSubtitleKey(providerBook: ProviderSeriesBook): string {
  const title = normaliseText(providerBook.title);
  if (!title) return "";

  return [title, normaliseText(providerBook.subtitle)].join("::");
}

/**
 * Purpose: Build the V1-style duplicate key for comparing missing-list books by
 * their position in the matched provider series.
 *
 * @param providerBook - Provider book to key.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns A normalised series-position key, or an empty string when no matched
 * provider-series position exists.
 */
function buildProviderSeriesPositionKey(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): string {
  const providerPosition = getProviderSeriesPosition(providerBook, providerSeries);
  return providerPosition === null ? "" : String(providerPosition);
}
