import type { RegionCode } from "../../domain/audiobook";
import {
  defaultMetadataProviderSearchMode,
  normaliseMetadataProviderIds,
} from "../../integrations/metadata/metadataProviderRegistry";
import type { MetadataProviderSearchMode } from "../../features/scan/runLibraryScan";
import { defaultScanFilters, type ScanFilters } from "./scanFormTypes";

export const SCAN_PREFERENCES_STORAGE_KEY = "completeSeries.scanPreferences.v2";

export type ScanPreferences = {
  filters: ScanFilters;
  region: RegionCode;
  selectedLibraryIds: string[];
};

/**
 * Purpose: Parse remembered scan preferences from a V2 local data export.
 *
 * @param payloadText - JSON text from an imported local data file.
 * @returns Normalised scan preferences, or `null` when none are present.
 */
export function parseScanPreferencesPayload(payloadText: string): ScanPreferences | null {
  try {
    const parsed = JSON.parse(payloadText) as { preferences?: Partial<ScanPreferences> };
    if (!parsed.preferences) return null;

    return normaliseScanPreferences(parsed.preferences);
  } catch {
    return null;
  }
}

/**
 * Purpose: Load remembered scan filters, region, and library selections from
 * browser storage.
 *
 * @returns Saved scan preferences, or defaults when no valid value exists.
 */
export function loadScanPreferences(): ScanPreferences {
  const storage = getBrowserStorage();
  if (!storage) return defaultScanPreferences();

  try {
    const parsed = JSON.parse(storage.getItem(SCAN_PREFERENCES_STORAGE_KEY) ?? "{}") as Partial<{
      filters: Partial<ScanFilters>;
      region: RegionCode;
      selectedLibraryIds: string[];
    }>;

    return {
      filters: normaliseScanFilters(parsed.filters),
      region: parsed.region ?? "uk",
      selectedLibraryIds: Array.isArray(parsed.selectedLibraryIds) ? parsed.selectedLibraryIds : [],
    };
  } catch {
    return defaultScanPreferences();
  }
}

/**
 * Purpose: Persist scan preferences to browser storage.
 *
 * @param preferences - Scan preferences to remember.
 * @returns Nothing. Invalid storage access is ignored.
 */
export function saveScanPreferences(preferences: ScanPreferences): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.setItem(SCAN_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

/**
 * Purpose: Remove remembered scan preferences from browser storage.
 *
 * @returns Nothing. Invalid storage access is ignored.
 */
export function clearScanPreferences(): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.removeItem(SCAN_PREFERENCES_STORAGE_KEY);
}

/**
 * Purpose: Build default scan preferences for a fresh V2 user.
 *
 * @returns Default filters, UK region, and no remembered library selection.
 */
export function defaultScanPreferences(): ScanPreferences {
  return {
    filters: defaultScanFilters,
    region: "uk",
    selectedLibraryIds: [],
  };
}

/**
 * Purpose: Merge a partial saved preference payload with V2 defaults.
 *
 * @param preferences - Partial scan preferences from storage or import data.
 * @returns Complete scan preferences safe for app state.
 */
function normaliseScanPreferences(preferences: Partial<ScanPreferences>): ScanPreferences {
  const defaults = defaultScanPreferences();

  return {
    filters: normaliseScanFilters(preferences.filters),
    region: preferences.region ?? defaults.region,
    selectedLibraryIds: Array.isArray(preferences.selectedLibraryIds)
      ? preferences.selectedLibraryIds
      : defaults.selectedLibraryIds,
  };
}

/**
 * Purpose: Merge saved scan filters with current defaults while validating
 * provider ids and provider search mode.
 *
 * @param filters - Partial scan filters from local storage or an imported
 * export file.
 * @returns Complete scan filters safe for app state.
 */
function normaliseScanFilters(filters: Partial<ScanFilters> | undefined): ScanFilters {
  const mergedFilters = { ...defaultScanFilters, ...(filters ?? {}) };

  return {
    ...mergedFilters,
    googleBooksApiKey: mergedFilters.googleBooksApiKey ?? "",
    metadataProviderIds: normaliseMetadataProviderIds(mergedFilters.metadataProviderIds),
    metadataProviderSearchMode: normaliseMetadataProviderSearchMode(
      mergedFilters.metadataProviderSearchMode
    ),
  };
}

/**
 * Purpose: Keep imported provider search mode values inside the supported set.
 *
 * @param searchMode - Saved provider search mode value.
 * @returns Supported provider search mode, or the default when invalid.
 */
function normaliseMetadataProviderSearchMode(
  searchMode: MetadataProviderSearchMode | undefined
): MetadataProviderSearchMode {
  return searchMode === "deep" || searchMode === "firstMatch"
    ? searchMode
    : defaultMetadataProviderSearchMode;
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
