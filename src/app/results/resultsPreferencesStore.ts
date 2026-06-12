import type { ResultsSortOrder } from "./visibleResults";

export const RESULTS_PREFERENCES_STORAGE_KEY = "completeSeries.resultsPreferences.v2";

export type ResultsPreferences = {
  showHiddenItems: boolean;
  sortOrder: ResultsSortOrder;
};

export const defaultResultsPreferences: ResultsPreferences = {
  showHiddenItems: false,
  sortOrder: "seriesAsc",
};

const SORT_ORDERS: ResultsSortOrder[] = [
  "seriesAsc",
  "seriesDesc",
  "authorAsc",
  "authorDesc",
  "missingDesc",
  "missingAsc",
  "scanOrder",
];

/**
 * Purpose: Parse remembered results-page preferences from a V2 local data
 * export.
 *
 * @param payloadText - JSON text from an imported local data file.
 * @returns Normalised results preferences, or `null` when none are present.
 */
export function parseResultsPreferencesPayload(payloadText: string): ResultsPreferences | null {
  try {
    const parsed = JSON.parse(payloadText) as { resultsPreferences?: Partial<ResultsPreferences> };
    if (!parsed.resultsPreferences) return null;

    return normaliseResultsPreferences(parsed.resultsPreferences);
  } catch {
    return null;
  }
}

/**
 * Purpose: Load remembered results-page display preferences from browser
 * storage.
 *
 * @returns Saved results preferences, or defaults when no valid value exists.
 */
export function loadResultsPreferences(): ResultsPreferences {
  const storage = getBrowserStorage();
  if (!storage) return defaultResultsPreferences;

  try {
    const parsed = JSON.parse(
      storage.getItem(RESULTS_PREFERENCES_STORAGE_KEY) ?? "{}"
    ) as Partial<ResultsPreferences>;

    return normaliseResultsPreferences(parsed);
  } catch {
    return defaultResultsPreferences;
  }
}

/**
 * Purpose: Persist results-page display preferences to browser storage.
 *
 * @param preferences - Results preferences to remember.
 * @returns Nothing. Invalid storage access is ignored.
 */
export function saveResultsPreferences(preferences: ResultsPreferences): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.setItem(RESULTS_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

/**
 * Purpose: Remove remembered results-page display preferences from browser
 * storage.
 *
 * @returns Nothing. Invalid storage access is ignored.
 */
export function clearResultsPreferences(): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.removeItem(RESULTS_PREFERENCES_STORAGE_KEY);
}

/**
 * Purpose: Merge partial stored values with defaults and reject unknown sort
 * orders.
 *
 * @param preferences - Partial preferences from storage or import data.
 * @returns Complete results preferences safe for app state.
 */
function normaliseResultsPreferences(
  preferences: Partial<ResultsPreferences>
): ResultsPreferences {
  return {
    showHiddenItems:
      typeof preferences.showHiddenItems === "boolean"
        ? preferences.showHiddenItems
        : defaultResultsPreferences.showHiddenItems,
    sortOrder: isResultsSortOrder(preferences.sortOrder)
      ? preferences.sortOrder
      : defaultResultsPreferences.sortOrder,
  };
}

/**
 * Purpose: Check whether an imported value is a known result sort order.
 *
 * @param value - Unknown imported value.
 * @returns `true` when the value is a supported result sort order.
 */
function isResultsSortOrder(value: unknown): value is ResultsSortOrder {
  return SORT_ORDERS.includes(value as ResultsSortOrder);
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
