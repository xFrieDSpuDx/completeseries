import type { ManualBookMatch } from "../../domain/manualBookMatches";
import { getManualBookMatchKey } from "../../domain/manualBookMatches";

export const MANUAL_BOOK_MATCHES_STORAGE_KEY = "completeSeries.manualBookMatches.v2";

/**
 * Purpose: Load saved manual owned-book matches from browser storage.
 *
 * @returns Manual book matches, or an empty list when storage is unavailable or
 * invalid.
 */
export function loadManualBookMatches(): ManualBookMatch[] {
  const storage = getBrowserStorage();
  if (!storage) return [];

  return parseManualBookMatchesPayload(storage.getItem(MANUAL_BOOK_MATCHES_STORAGE_KEY) ?? "");
}

/**
 * Purpose: Persist manual owned-book matches to browser storage.
 *
 * @param matches - Manual book matches to save.
 * @returns Nothing. Browser local storage is updated when available.
 */
export function saveManualBookMatches(matches: ManualBookMatch[]): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.setItem(MANUAL_BOOK_MATCHES_STORAGE_KEY, JSON.stringify({ manualBookMatches: matches }));
}

/**
 * Purpose: Add or replace one manual owned-book match.
 *
 * @param matches - Existing manual book matches.
 * @param nextMatch - Manual book match to add.
 * @returns Updated manual book match list.
 */
export function upsertManualBookMatch(
  matches: ManualBookMatch[],
  nextMatch: ManualBookMatch
): ManualBookMatch[] {
  const nextKey = getManualBookMatchKey(nextMatch);
  return [
    ...matches.filter((match) => getManualBookMatchKey(match) !== nextKey),
    nextMatch,
  ].sort((first, second) => first.title.localeCompare(second.title));
}

/**
 * Purpose: Remove all saved manual owned-book matches.
 *
 * @returns Nothing. Browser local storage is updated when available.
 */
export function clearManualBookMatches(): void {
  const storage = getBrowserStorage();
  storage?.removeItem(MANUAL_BOOK_MATCHES_STORAGE_KEY);
}

/**
 * Purpose: Parse manual owned-book matches from a local data export.
 *
 * @param payloadText - JSON text containing manual book matches.
 * @returns Valid manual book matches from the payload.
 */
export function parseManualBookMatchesPayload(payloadText: string): ManualBookMatch[] {
  try {
    const parsed = JSON.parse(payloadText) as { manualBookMatches?: unknown };
    if (!Array.isArray(parsed.manualBookMatches)) return [];

    return parsed.manualBookMatches.filter(isManualBookMatch);
  } catch {
    return [];
  }
}

/**
 * Purpose: Check whether an imported value has the fields needed for a manual
 * owned-book match.
 *
 * @param value - Imported value to inspect.
 * @returns `true` when the value is a usable manual book match.
 */
function isManualBookMatch(value: unknown): value is ManualBookMatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<ManualBookMatch>;
  return Boolean(
    candidate.createdAt &&
      candidate.providerId &&
      candidate.region &&
      candidate.seriesName &&
      candidate.title &&
      Array.isArray(candidate.authors)
  );
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
