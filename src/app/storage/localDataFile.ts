import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import { exportAudibleResponseCache } from "../../integrations/metadata/cache/audibleResponseCache";
import { exportProviderResponseCache } from "../../integrations/metadata/cache/providerResponseCache";
import type { HiddenItem } from "./hiddenItemsStore";
import type { ResultsPreferences } from "../results/resultsPreferencesStore";
import type { ScanPreferences } from "../setup/scanPreferencesStore";

/**
 * Purpose: Build a local data export that includes hidden items, manual
 * owned-book matches, provider-series overrides, remembered preferences, and
 * persisted provider response cache records when available.
 *
 * @param hiddenItems - Current hidden item records.
 * @param manualBookMatches - Current manual owned-book matches.
 * @param manualSeriesMatches - Current provider-series overrides.
 * @param preferences - Optional current scan preferences.
 * @param resultsPreferences - Optional current result-display preferences.
 * @returns Pretty-printed JSON containing local app state.
 */
export async function buildLocalDataExportWithLocalState(
  hiddenItems: HiddenItem[],
  manualBookMatches: ManualBookMatch[],
  manualSeriesMatches: ManualSeriesMatch[],
  preferences?: ScanPreferences,
  resultsPreferences?: ResultsPreferences
): Promise<string> {
  const audibleResponseCache = await exportAudibleResponseCache();
  const providerResponseCache = await exportProviderResponseCache();

  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      hiddenItems,
      manualBookMatches,
      manualSeriesMatches,
      ...(preferences ? { preferences } : {}),
      ...(resultsPreferences ? { resultsPreferences } : {}),
      ...(audibleResponseCache.length > 0 ? { audibleResponseCache } : {}),
      ...(providerResponseCache.length > 0 ? { providerResponseCache } : {}),
    },
    null,
    2
  );
}

/**
 * Purpose: Download a complete local-data backup using the shared export
 * payload used by the Local data and Download drawers.
 *
 * @param hiddenItems - Current hidden item records.
 * @param manualBookMatches - Current manual owned-book matches.
 * @param manualSeriesMatches - Current provider-series overrides.
 * @param preferences - Optional current scan preferences.
 * @param resultsPreferences - Optional current result-display preferences.
 * @returns A promise that resolves after the browser download is triggered.
 */
export async function downloadLocalDataExport(
  hiddenItems: HiddenItem[],
  manualBookMatches: ManualBookMatch[],
  manualSeriesMatches: ManualSeriesMatch[],
  preferences?: ScanPreferences,
  resultsPreferences?: ResultsPreferences
): Promise<void> {
  const exportText = await buildLocalDataExportWithLocalState(
    hiddenItems,
    manualBookMatches,
    manualSeriesMatches,
    preferences,
    resultsPreferences
  );
  const blob = new Blob([exportText], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "complete-series-local-data.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Purpose: Build a concise import result message for local data files.
 *
 * @param hiddenItemCount - Imported hidden item count.
 * @param manualBookMatchCount - Imported manual owned-book match count.
 * @param manualSeriesMatchCount - Imported manual series override count.
 * @param hasPreferences - Whether saved filters were imported.
 * @param hasResultsPreferences - Whether result-display preferences were
 * imported.
 * @param providerResponseCacheCount - Number of imported provider response
 * cache records.
 * @returns User-facing import summary.
 */
export function buildImportMessage(
  hiddenItemCount: number,
  manualBookMatchCount: number,
  manualSeriesMatchCount: number,
  hasPreferences: boolean,
  hasResultsPreferences: boolean,
  providerResponseCacheCount: number
): string {
  const parts = [formatImportCount(hiddenItemCount, "hidden item")];
  if (manualBookMatchCount > 0) {
    parts.push(formatImportCount(manualBookMatchCount, "owned-book match"));
  }
  if (manualSeriesMatchCount > 0) {
    parts.push(formatImportCount(manualSeriesMatchCount, "series override"));
  }
  if (hasPreferences) parts.push("saved filters");
  if (hasResultsPreferences) parts.push("result display settings");
  if (providerResponseCacheCount > 0) {
    parts.push(formatImportCount(providerResponseCacheCount, "provider response cache record"));
  }

  return `${parts.join(", ")} imported.`;
}

/**
 * Purpose: Format one import count with a simple plural suffix.
 *
 * @param count - Imported item count.
 * @param singularLabel - Label to use when the count is one.
 * @returns Count and singular/plural label.
 */
function formatImportCount(count: number, singularLabel: string): string {
  return `${count} ${singularLabel}${count === 1 ? "" : "s"}`;
}
