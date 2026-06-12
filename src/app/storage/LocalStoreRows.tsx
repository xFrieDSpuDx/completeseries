import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import { AUDIBLE_RESPONSE_CACHE_DB_NAME } from "../../integrations/metadata/cache/audibleResponseCache";
import { PROVIDER_RESPONSE_CACHE_DB_NAME } from "../../integrations/metadata/cache/providerResponseCache";
import {
  HIDDEN_ITEMS_STORAGE_KEY,
  type HiddenItem,
} from "./hiddenItemsStore";
import {
  LEGACY_STORAGE_ENTRIES,
  type LegacyStorageKey,
} from "./legacyStorageStore";
import { LocalStoreRow } from "./LocalStoreRow";
import { MANUAL_BOOK_MATCHES_STORAGE_KEY } from "./manualBookMatchStore";
import { MANUAL_SERIES_MATCHES_STORAGE_KEY } from "./manualSeriesMatchStore";
import {
  RESULTS_PREFERENCES_STORAGE_KEY,
  type ResultsPreferences,
} from "../results/resultsPreferencesStore";
import {
  SCAN_PREFERENCES_STORAGE_KEY,
  type ScanPreferences,
} from "../setup/scanPreferencesStore";

type CurrentLocalStoreRowsProps = {
  hiddenItems: HiddenItem[];
  manualBookMatches: ManualBookMatch[];
  manualSeriesMatches: ManualSeriesMatch[];
  onClearHiddenItems: () => void;
  onClearManualBookMatches: () => void;
  onClearManualSeriesMatches: () => void;
  onClearProviderResponseCache: () => void;
  onClearResultsPreferences: () => void;
  onClearScanPreferences: () => void;
  preferences?: ScanPreferences;
  providerResponseCacheCount: number;
  resultsPreferences?: ResultsPreferences;
};

type LegacyLocalStoreRowsProps = {
  onClearLegacyData: (key: LegacyStorageKey) => void;
};

/**
 * Purpose: Render delete rows for every current V2 local data store.
 *
 * @param props - Current local data counts and delete callbacks.
 * @returns Local store rows for current V2 browser data.
 */
export function CurrentLocalStoreRows({
  hiddenItems,
  manualBookMatches,
  manualSeriesMatches,
  onClearHiddenItems,
  onClearManualBookMatches,
  onClearManualSeriesMatches,
  onClearProviderResponseCache,
  onClearResultsPreferences,
  onClearScanPreferences,
  preferences,
  providerResponseCacheCount,
  resultsPreferences,
}: CurrentLocalStoreRowsProps) {
  return (
    <div className="local-store-grid">
      <LocalStoreRow
        actionLabel="Delete"
        description={`${hiddenItems.length} hidden items`}
        name="Hidden items"
        storageKey={HIDDEN_ITEMS_STORAGE_KEY}
        onDelete={onClearHiddenItems}
      />
      <LocalStoreRow
        actionLabel="Delete"
        description={preferences ? "Saved region, libraries, and filters" : "Saved scan filters"}
        name="Scan filters"
        storageKey={SCAN_PREFERENCES_STORAGE_KEY}
        onDelete={onClearScanPreferences}
      />
      <LocalStoreRow
        actionLabel="Delete"
        description={
          resultsPreferences
            ? "Saved sort order and hidden-item display"
            : "Saved result display settings"
        }
        name="Results view"
        storageKey={RESULTS_PREFERENCES_STORAGE_KEY}
        onDelete={onClearResultsPreferences}
      />
      <LocalStoreRow
        actionLabel="Delete"
        description={`${providerResponseCacheCount} cached metadata provider responses`}
        name="Provider response cache"
        storageKey={`${PROVIDER_RESPONSE_CACHE_DB_NAME}, ${AUDIBLE_RESPONSE_CACHE_DB_NAME}`}
        onDelete={onClearProviderResponseCache}
      />
      <LocalStoreRow
        actionLabel="Delete"
        description={`${manualBookMatches.length} manually owned books`}
        name="Owned-book matches"
        storageKey={MANUAL_BOOK_MATCHES_STORAGE_KEY}
        onDelete={onClearManualBookMatches}
      />
      <LocalStoreRow
        actionLabel="Delete"
        description={`${manualSeriesMatches.length} manual provider-series overrides`}
        name="Series overrides"
        storageKey={MANUAL_SERIES_MATCHES_STORAGE_KEY}
        onDelete={onClearManualSeriesMatches}
      />
    </div>
  );
}

/**
 * Purpose: Render delete rows for legacy V1 browser storage.
 *
 * @param props - Legacy delete callback.
 * @param props.onClearLegacyData - Callback that deletes one legacy store.
 * @returns A collapsible legacy data section.
 */
export function LegacyLocalStoreRows({ onClearLegacyData }: LegacyLocalStoreRowsProps) {
  return (
    <details className="legacy-store-panel">
      <summary>Legacy V1 data</summary>
      <p>
        Not used by V2 scans. Only relevant if the original app was used from this same browser
        and address.
      </p>
      {LEGACY_STORAGE_ENTRIES.map((entry) => (
        <LocalStoreRow
          actionLabel="Delete"
          description={entry.description}
          key={entry.key}
          name={entry.name}
          storageKey={entry.key}
          onDelete={() => onClearLegacyData(entry.key)}
        />
      ))}
    </details>
  );
}
