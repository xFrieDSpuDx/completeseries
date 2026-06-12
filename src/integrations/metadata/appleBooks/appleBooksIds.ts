import type { RegionCode } from "../../../domain/audiobook";

const APPLE_BOOKS_SERIES_ID_PREFIX = "apple-books:search:";
const APPLE_BOOKS_TRACK_ID_PREFIX = "apple-books:track:";

const appleStorefrontCountries: Record<RegionCode, string> = {
  au: "AU",
  br: "BR",
  ca: "CA",
  de: "DE",
  es: "ES",
  fr: "FR",
  in: "IN",
  it: "IT",
  jp: "JP",
  uk: "GB",
  us: "US",
};

/**
 * Purpose: Convert the Complete Series region into Apple Search API country
 * codes.
 *
 * @param region - Complete Series region selected for the scan.
 * @returns Apple storefront country code.
 */
export function getAppleStorefrontCountry(region: RegionCode): string {
  return appleStorefrontCountries[region];
}

/**
 * Purpose: Build a stable synthetic provider series id for Apple search
 * candidates.
 *
 * @param query - Series search query.
 * @returns Synthetic provider series id.
 */
export function buildAppleBooksSeriesId(query: string): string {
  return `${APPLE_BOOKS_SERIES_ID_PREFIX}${encodeURIComponent(query.trim())}`;
}

/**
 * Purpose: Build a synthetic Complete Series book identifier for an Apple
 * track or collection id.
 *
 * @param trackId - Apple track or collection identifier.
 * @returns Complete Series provider-book identifier.
 */
export function buildAppleBooksTrackAsin(trackId: string): string {
  return `${APPLE_BOOKS_TRACK_ID_PREFIX}${trackId}`;
}

/**
 * Purpose: Extract the original search query from a synthetic Apple Books
 * series id.
 *
 * @param seriesAsin - Synthetic provider series id.
 * @returns Original query, or `null` for ids from other providers.
 */
export function parseAppleBooksSeriesQuery(seriesAsin: string): string | null {
  if (!seriesAsin.startsWith(APPLE_BOOKS_SERIES_ID_PREFIX)) return null;

  try {
    return decodeURIComponent(seriesAsin.slice(APPLE_BOOKS_SERIES_ID_PREFIX.length));
  } catch {
    return null;
  }
}

/**
 * Purpose: Extract an Apple Books track id from Complete Series' synthetic book
 * identifier.
 *
 * @param asin - Provider book identifier.
 * @returns Apple track id, or `null` for normal Audible ASINs.
 */
export function parseAppleBooksTrackId(asin: string): string | null {
  return asin.startsWith(APPLE_BOOKS_TRACK_ID_PREFIX)
    ? asin.slice(APPLE_BOOKS_TRACK_ID_PREFIX.length)
    : null;
}
