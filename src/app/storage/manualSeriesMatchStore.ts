import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";

export const MANUAL_SERIES_MATCHES_STORAGE_KEY = "completeSeries.manualSeriesMatches.v2";

/**
 * Purpose: Load saved manual provider-series matches from browser storage.
 *
 * @returns Manual matches, or an empty list when storage is unavailable or
 * invalid.
 */
export function loadManualSeriesMatches(): ManualSeriesMatch[] {
  const storage = getBrowserStorage();
  if (!storage) return [];

  return parseManualSeriesMatchesPayload(storage.getItem(MANUAL_SERIES_MATCHES_STORAGE_KEY) ?? "");
}

/**
 * Purpose: Persist manual provider-series matches to browser storage.
 *
 * @param matches - Manual matches to save.
 * @returns Nothing. Invalid storage access is ignored.
 */
export function saveManualSeriesMatches(matches: ManualSeriesMatch[]): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.setItem(
    MANUAL_SERIES_MATCHES_STORAGE_KEY,
    JSON.stringify({ manualSeriesMatches: matches })
  );
}

/**
 * Purpose: Add or replace one manual provider-series match while keeping only
 * one override per local series, provider, and region.
 *
 * @param matches - Existing manual matches.
 * @param nextMatch - Manual match to add or replace.
 * @returns Updated manual match list.
 */
export function upsertManualSeriesMatch(
  matches: ManualSeriesMatch[],
  nextMatch: ManualSeriesMatch
): ManualSeriesMatch[] {
  return [
    nextMatch,
    ...matches.filter(
      (match) =>
        match.region !== nextMatch.region ||
        match.providerId !== nextMatch.providerId ||
        getLocalSeriesKey(match) !== getLocalSeriesKey(nextMatch)
    ),
  ];
}

/**
 * Purpose: Remove saved manual provider-series matches from browser storage.
 *
 * @returns Nothing. Invalid storage access is ignored.
 */
export function clearManualSeriesMatches(): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.removeItem(MANUAL_SERIES_MATCHES_STORAGE_KEY);
}

/**
 * Purpose: Parse manual provider-series matches from a local data export.
 *
 * @param payloadText - JSON text from an imported local data file.
 * @returns Valid manual matches from the payload.
 */
export function parseManualSeriesMatchesPayload(payloadText: string): ManualSeriesMatch[] {
  try {
    const parsed = JSON.parse(payloadText) as { manualSeriesMatches?: unknown };
    if (!Array.isArray(parsed.manualSeriesMatches)) return [];

    return parsed.manualSeriesMatches.filter(isManualSeriesMatch);
  } catch {
    return [];
  }
}

/**
 * Purpose: Check whether an imported value has the fields needed for a manual
 * provider-series match.
 *
 * @param value - Unknown imported value.
 * @returns `true` when the value is a usable manual match.
 */
function isManualSeriesMatch(value: unknown): value is ManualSeriesMatch {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ManualSeriesMatch>;

  return Boolean(
    candidate.createdAt &&
      candidate.localSeriesName &&
      candidate.providerId &&
      candidate.providerSeriesAsin &&
      candidate.region
  );
}

/**
 * Purpose: Build a stable local-series key for replacing saved overrides.
 *
 * @param match - Manual match being keyed.
 * @returns Local series id when available, otherwise normalised name.
 */
function getLocalSeriesKey(match: ManualSeriesMatch): string {
  return match.localSeriesId ? `id:${match.localSeriesId}` : `name:${match.localSeriesName}`;
}

/**
 * Purpose: Read browser local storage only when it is available.
 *
 * @returns Browser local storage, or `null` outside a browser context.
 */
function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
