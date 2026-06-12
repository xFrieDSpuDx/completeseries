import type { ProviderSeriesBook, ProviderSeriesCandidate, RegionCode } from "./audiobook";
import { normaliseIdentifier, normaliseText } from "./normalise";

export type ManualBookMatch = {
  createdAt: string;
  providerId: string;
  providerName?: string;
  region: RegionCode;
  seriesAsin?: string | null;
  seriesName: string;
  asin?: string | null;
  sku?: string | null;
  skuGroup?: string | null;
  title: string;
  subtitle?: string | null;
  authors: string[];
};

/**
 * Purpose: Create a manual owned-book override from a visible provider result.
 *
 * @param book - Provider book the user has marked as already owned.
 * @param providerSeries - Provider series containing the book.
 * @param region - Region used by the completed scan.
 * @returns A manual book match suitable for local storage and future scans.
 */
export function buildManualBookMatch(
  book: ProviderSeriesBook,
  providerSeries: Pick<
    ProviderSeriesCandidate,
    "name" | "providerId" | "providerName" | "seriesAsin"
  >,
  region: RegionCode
): ManualBookMatch {
  return {
    createdAt: new Date().toISOString(),
    providerId: providerSeries.providerId ?? "audible",
    providerName: providerSeries.providerName,
    region,
    seriesAsin: providerSeries.seriesAsin,
    seriesName: providerSeries.name,
    asin: book.asin,
    sku: book.sku,
    skuGroup: book.skuGroup,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
  };
}

/**
 * Purpose: Decide whether a provider book has been manually marked as owned.
 *
 * @param book - Provider book currently being evaluated or displayed.
 * @param providerSeries - Provider series containing the book.
 * @param region - Region used by the scan.
 * @param matches - Saved manual owned-book matches.
 * @returns The matching manual override, or `null` when none applies.
 */
export function findManualBookMatch(
  book: ProviderSeriesBook,
  providerSeries: Pick<
    ProviderSeriesCandidate,
    "name" | "providerId" | "providerName" | "seriesAsin"
  >,
  region: RegionCode,
  matches: ManualBookMatch[] = []
): ManualBookMatch | null {
  return (
    matches.find((match) => {
      if (match.region !== region) return false;
      if (match.providerId !== (providerSeries.providerId ?? "audible")) return false;

      return hasIdentifierMatch(book, match) || hasSeriesTitleMatch(book, providerSeries, match);
    }) ?? null
  );
}

/**
 * Purpose: Build a stable key for storing one manual owned-book override.
 *
 * @param match - Manual book match being keyed.
 * @returns A normalised key for de-duplication.
 */
export function getManualBookMatchKey(match: ManualBookMatch): string {
  const identifier =
    normaliseIdentifier(match.asin) ||
    normaliseIdentifier(match.sku) ||
    normaliseIdentifier(match.skuGroup);

  if (identifier) return `${match.providerId}:${match.region}:id:${identifier}`;

  return [
    match.providerId,
    match.region,
    "title",
    normaliseText(match.seriesAsin ?? match.seriesName),
    normaliseText(match.title),
    normaliseText(match.authors[0]),
  ].join(":");
}

/**
 * Purpose: Match exact provider identifiers from a saved manual override.
 *
 * @param book - Provider book currently being checked.
 * @param match - Saved manual owned-book override.
 * @returns `true` when ASIN, SKU, or SKU group overlaps.
 */
function hasIdentifierMatch(book: ProviderSeriesBook, match: ManualBookMatch): boolean {
  const providerIdentifiers = [book.asin, book.sku, book.skuGroup]
    .map(normaliseIdentifier)
    .filter(Boolean);
  const matchIdentifiers = [match.asin, match.sku, match.skuGroup]
    .map(normaliseIdentifier)
    .filter(Boolean);

  return providerIdentifiers.some((identifier) => matchIdentifiers.includes(identifier));
}

/**
 * Purpose: Fall back to series, title, and author matching when provider
 * identifiers are missing.
 *
 * @param book - Provider book currently being checked.
 * @param providerSeries - Provider series containing the book.
 * @param match - Saved manual owned-book override.
 * @returns `true` when the visible book and saved override describe the same
 * work in the same provider series.
 */
function hasSeriesTitleMatch(
  book: ProviderSeriesBook,
  providerSeries: Pick<ProviderSeriesCandidate, "name" | "seriesAsin">,
  match: ManualBookMatch
): boolean {
  const seriesMatches =
    Boolean(match.seriesAsin && match.seriesAsin === providerSeries.seriesAsin) ||
    normaliseText(match.seriesName) === normaliseText(providerSeries.name);
  const titleMatches = normaliseText(match.title) === normaliseText(book.title);
  const authorMatches =
    !match.authors[0] ||
    !book.authors[0] ||
    normaliseText(match.authors[0]) === normaliseText(book.authors[0]);

  return seriesMatches && titleMatches && authorMatches;
}
