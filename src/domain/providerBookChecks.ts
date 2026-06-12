import type { ProviderSeriesBook, ProviderSeriesCandidate, RegionCode } from "./audiobook";
import { normaliseIdentifier, normaliseText, parseSeriesPosition } from "./normalise";

const AUDIBLE_EMPTY_PLACEHOLDER_RELEASE_DATE = "2200-01-01";

/**
 * Purpose: Decide whether a provider book belongs to the Audible marketplace
 * selected for the scan.
 *
 * @param providerBook - Provider book being checked before ownership filters run.
 * @param providerSeries - Provider series selected by the matching step.
 * @param selectedRegion - Audible marketplace region chosen in the scan form.
 * @returns `true` when provider region evidence is missing or matches the
 * selected region; `false` when provider evidence points at another region.
 */
export function isProviderBookInSelectedRegion(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate,
  selectedRegion: RegionCode
): boolean {
  const bookRegion = normaliseRegion(providerBook.region);
  const seriesRegion = normaliseRegion(providerSeries.region);
  const expectedRegion = normaliseRegion(selectedRegion);

  if (bookRegion) return bookRegion === expectedRegion;
  if (seriesRegion) return seriesRegion === expectedRegion;

  return true;
}

/**
 * Purpose: Describe the provider region evidence used by diagnostics.
 *
 * @param providerBook - Provider book whose region evidence is being shown.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns Human-readable provider region evidence.
 */
export function describeProviderRegion(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): string {
  return providerBook.region
    ? `Book region: ${providerBook.region}`
    : `Series region: ${providerSeries.region ?? "not supplied"}`;
}

/**
 * Purpose: Decide whether a provider book can satisfy the unabridged-only filter.
 *
 * @param providerBook - Provider book being checked before it can be reported
 * as missing.
 * @returns `true` when the provider explicitly marks the book as unabridged.
 */
export function isProviderBookUnabridged(providerBook: ProviderSeriesBook): boolean {
  return normaliseText(providerBook.bookFormat) === "unabridged";
}

/**
 * Purpose: Decide whether a provider record is a series/container item rather
 * than an audiobook edition.
 *
 * @param providerBook - Provider book being checked before it can be reported
 * as missing.
 * @returns `true` when provider delivery evidence identifies a non-book series
 * container.
 */
export function isProviderBookContainer(providerBook: ProviderSeriesBook): boolean {
  const deliveryType = normaliseText(providerBook.deliveryType);
  return deliveryType === "bookseries";
}

/**
 * Purpose: Decide whether a provider book should be excluded because it has no
 * position in the matched provider series.
 *
 * @param providerBook - Provider book being checked.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns `true` when the provider book has no usable matched-series position.
 */
export function hasNoProviderSeriesPosition(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): boolean {
  return getProviderSeriesPosition(providerBook, providerSeries) === null;
}

/**
 * Purpose: Decide whether a provider book represents a multi-book audiobook
 * position such as `1-2`.
 *
 * @param providerBook - Provider book being checked.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns `true` when the raw matched-series position contains a range marker.
 */
export function hasMultiBookSeriesPosition(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): boolean {
  const providerPosition = getProviderSeriesPositionEvidence(providerBook, providerSeries);
  return Boolean(providerPosition.raw?.includes("-"));
}

/**
 * Purpose: Decide whether a provider book represents a sub-position such as `3.5`.
 *
 * @param providerBook - Provider book being checked.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns `true` when the matched-series position is decimal rather than a
 * whole-number position.
 */
export function hasSubSeriesPosition(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): boolean {
  const providerPosition = getProviderSeriesPositionEvidence(providerBook, providerSeries);
  return Boolean(
    providerPosition.raw?.includes(".") ||
      (providerPosition.numeric !== null && !Number.isInteger(providerPosition.numeric))
  );
}

/**
 * Purpose: Decide whether a release date is after today.
 *
 * @param releaseDate - Provider release date string, usually in YYYY-MM-DD format.
 * @param now - Current date used for comparison, supplied by tests when needed.
 * @returns `true` when a valid release date is later than today.
 */
export function isFutureReleaseDate(
  releaseDate: string | null | undefined,
  now = new Date()
): boolean {
  const parsedReleaseDate = parseReleaseDate(releaseDate);
  if (!parsedReleaseDate) return false;

  return parsedReleaseDate.getTime() > startOfDay(now).getTime();
}

/**
 * Purpose: Decide whether a release date is today or earlier.
 *
 * @param releaseDate - Provider release date string, usually in YYYY-MM-DD format.
 * @param now - Current date used for comparison, supplied by tests when needed.
 * @returns `true` when a valid release date is today or earlier.
 */
export function isPastReleaseDate(
  releaseDate: string | null | undefined,
  now = new Date()
): boolean {
  const parsedReleaseDate = parseReleaseDate(releaseDate);
  if (!parsedReleaseDate) return false;

  return parsedReleaseDate.getTime() <= startOfDay(now).getTime();
}

/**
 * Purpose: Decide whether a provider book looks like an empty future
 * placeholder rather than a real upcoming audiobook listing.
 *
 * @param providerBook - Provider book being checked before it can be reported
 * as missing.
 * @returns `true` when the book has a future release date and either uses
 * Audible's far-future placeholder date or has no useful descriptive metadata.
 */
export function isFuturePlaceholderRelease(providerBook: ProviderSeriesBook): boolean {
  if (!isFutureReleaseDate(providerBook.releaseDate)) return false;
  if (normaliseReleaseDate(providerBook.releaseDate) === AUDIBLE_EMPTY_PLACEHOLDER_RELEASE_DATE) {
    return true;
  }

  return !hasUsefulFutureReleaseMetadata(providerBook);
}

/**
 * Purpose: Get a provider book's position within the matched provider series.
 *
 * @param providerBook - Provider book whose series entries contain position
 * metadata.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns The numeric or raw position for the matched provider series, or
 * `null` when none is available.
 */
export function getProviderSeriesPosition(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): string | number | null {
  const providerPosition = getProviderSeriesPositionEvidence(providerBook, providerSeries);
  if (!providerPosition.raw) return null;
  if (providerPosition.raw.includes("-")) return providerPosition.raw;

  return providerPosition.numeric ?? providerPosition.raw;
}

/**
 * Purpose: Get parsed position evidence for a provider book within the matched
 * provider series.
 *
 * @param providerBook - Provider book whose series entries contain position
 * metadata.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns Parsed raw and numeric position evidence for the matched provider
 * series, or empty position evidence when none is available.
 */
export function getProviderSeriesPositionEvidence(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
) {
  const matchingSeriesEntry = providerBook.series.find((seriesEntry) =>
    isSameProviderSeries(seriesEntry, providerSeries)
  );

  if (!matchingSeriesEntry) return { raw: null, numeric: null };

  return parseSeriesPosition(matchingSeriesEntry.position);
}

/**
 * Purpose: Normalise provider region text so marketplace checks are stable
 * across providers.
 *
 * @param region - Raw provider or selected region value.
 * @returns Lowercase region text, or an empty string for missing values.
 */
function normaliseRegion(region: string | null | undefined): string {
  return (region ?? "").trim().toLowerCase();
}

/**
 * Purpose: Convert provider release-date text into a local midnight date for
 * stable filter comparisons.
 *
 * @param releaseDate - Raw provider release date.
 * @returns A local start-of-day date, or `null` when the value cannot be parsed.
 */
function parseReleaseDate(releaseDate: string | null | undefined): Date | null {
  if (!releaseDate) return null;

  const trimmedReleaseDate = releaseDate.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmedReleaseDate);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsedDate = new Date(trimmedReleaseDate);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return startOfDay(parsedDate);
}

/**
 * Purpose: Normalise release-date text to the date component used by provider
 * placeholder checks.
 *
 * @param releaseDate - Raw provider release date.
 * @returns The YYYY-MM-DD portion of a release date, or an empty string.
 */
function normaliseReleaseDate(releaseDate: string | null | undefined): string {
  return releaseDate?.trim().slice(0, 10) ?? "";
}

/**
 * Purpose: Check whether a future listing has enough metadata to be useful as
 * a missing-book result.
 *
 * @param providerBook - Provider book being evaluated.
 * @returns `true` when the provider includes descriptive or edition metadata
 * beyond a bare title and release date.
 */
function hasUsefulFutureReleaseMetadata(providerBook: ProviderSeriesBook): boolean {
  return [
    providerBook.subtitle,
    providerBook.description,
    providerBook.summary,
    providerBook.imageUrl,
    providerBook.publisher,
    providerBook.authors.join(" "),
    providerBook.narrators.join(" "),
  ].some((value) => normaliseText(value).length > 0);
}

/**
 * Purpose: Normalise a date to local midnight for release-date comparisons.
 *
 * @param date - Date to normalise.
 * @returns A new date set to the local start of the same calendar day.
 */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Purpose: Check whether a provider book series entry belongs to the matched
 * provider series.
 *
 * @param seriesEntry - Series entry from a provider book.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns `true` when ASIN or normalised series name match the selected series.
 */
function isSameProviderSeries(
  seriesEntry: ProviderSeriesBook["series"][number],
  providerSeries: ProviderSeriesCandidate
): boolean {
  const entryAsin = normaliseIdentifier(seriesEntry.asin);
  const providerAsin = normaliseIdentifier(providerSeries.seriesAsin);

  if (entryAsin && providerAsin && entryAsin === providerAsin) return true;

  return normaliseText(seriesEntry.name) === normaliseText(providerSeries.name);
}
