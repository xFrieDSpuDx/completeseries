import { useEffect, useState } from "react";
import type { HiddenItem } from "./hiddenItemsStore";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import {
  clearAudibleResponseCache,
  countAudibleResponseCache,
} from "../../integrations/metadata/cache/audibleResponseCache";
import {
  clearProviderResponseCache,
  countProviderResponseCache,
} from "../../integrations/metadata/cache/providerResponseCache";
import { clearMetadataRequestMemoryCaches } from "../../integrations/metadata/cache/metadataRequestMemoryCache";
import { clearManualBookMatches } from "./manualBookMatchStore";
import { clearManualSeriesMatches } from "./manualSeriesMatchStore";
import { InfoPopover } from "../components/InfoPopover";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import {
  clearResultsPreferences,
  type ResultsPreferences,
} from "../results/resultsPreferencesStore";
import {
  clearScanPreferences,
  type ScanPreferences,
} from "../setup/scanPreferencesStore";
import {
  deleteLegacyStorageDatabase,
  deleteLegacyStorageKey,
  type LegacyStorageKey,
} from "./legacyStorageStore";
import { confirmClearAllLocalData } from "./LocalStoreRow";
import { CurrentLocalStoreRows, LegacyLocalStoreRows } from "./LocalStoreRows";

type LocalStoreManagerProps = {
  hiddenItems: HiddenItem[];
  manualBookMatches?: ManualBookMatch[];
  manualSeriesMatches?: ManualSeriesMatch[];
  onClearManualBookMatches?: () => void;
  onClearHiddenItems?: () => void;
  onClearManualSeriesMatches?: () => void;
  onClearPreferences?: () => void;
  onClearResultsPreferences?: () => void;
  onMessage: (message: string) => void;
  preferences?: ScanPreferences;
  resultsPreferences?: ResultsPreferences;
};

/**
 * Purpose: Render delete controls for every known Complete Series local data
 * store, including current V2 localStorage and legacy V1 IndexedDB stores.
 *
 * @param props - Local store manager inputs.
 * @param props.hiddenItems - Current hidden item records.
 * @param props.manualBookMatches - Current manual owned-book matches.
 * @param props.manualSeriesMatches - Current provider-series overrides.
 * @param props.onClearManualBookMatches - Optional callback that clears manual
 * owned-book matches.
 * @param props.onClearHiddenItems - Optional callback that clears hidden item
 * state and storage.
 * @param props.onClearManualSeriesMatches - Optional callback that clears
 * provider-series overrides.
 * @param props.onClearPreferences - Optional callback that clears preference
 * state.
 * @param props.onClearResultsPreferences - Optional callback that clears
 * result-display preference state.
 * @param props.onMessage - Callback receiving the latest storage action result.
 * @param props.preferences - Optional remembered scan preferences.
 * @param props.resultsPreferences - Optional remembered result-display
 * preferences.
 * @returns Local store delete controls.
 */
export function LocalStoreManager({
  hiddenItems,
  manualBookMatches = [],
  manualSeriesMatches = [],
  onClearManualBookMatches,
  onClearHiddenItems,
  onClearManualSeriesMatches,
  onClearPreferences,
  onClearResultsPreferences,
  onMessage,
  preferences,
  resultsPreferences,
}: LocalStoreManagerProps) {
  const [providerResponseCacheCount, setProviderResponseCacheCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([countAudibleResponseCache(), countProviderResponseCache()]).then(
      ([audibleCount, providerCount]) => {
        if (isMounted) setProviderResponseCacheCount(audibleCount + providerCount);
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Purpose: Clear saved hidden item records.
   *
   * @returns Nothing. Hidden item state and storage are cleared.
   */
  function clearHiddenData(): void {
    onClearHiddenItems?.();
    onMessage("Hidden items deleted.");
  }

  /**
   * Purpose: Clear remembered scan preferences.
   *
   * @returns Nothing. Preference storage and optional parent state are cleared.
   */
  function clearPreferenceData(): void {
    clearScanPreferences();
    onClearPreferences?.();
    onMessage("Saved filters deleted.");
  }

  /**
   * Purpose: Clear remembered result display preferences.
   *
   * @returns Nothing. Preference storage and optional parent state are cleared.
   */
  function clearResultPreferenceData(): void {
    clearResultsPreferences();
    onClearResultsPreferences?.();
    onMessage("Result display settings deleted.");
  }

  /**
   * Purpose: Clear cached metadata provider responses.
   *
   * @returns A promise that resolves after the cache delete attempt finishes.
   */
  async function clearProviderResponseCacheData(): Promise<void> {
    try {
      clearMetadataRequestMemoryCaches();
      await Promise.all([clearAudibleResponseCache(), clearProviderResponseCache()]);
      setProviderResponseCacheCount(0);
      onMessage("Provider response cache deleted. The next scan will request fresh metadata.");
    } catch {
      onMessage("Provider response cache could not be deleted.");
    }
  }

  /**
   * Purpose: Clear saved manual owned-book matches.
   *
   * @returns Nothing. Manual book match state and storage are cleared.
   */
  function clearManualBookMatchData(): void {
    clearManualBookMatches();
    onClearManualBookMatches?.();
    onMessage("Manual owned-book matches deleted.");
  }

  /**
   * Purpose: Clear saved provider-series overrides.
   *
   * @returns Nothing. Manual series override state and storage are cleared.
   */
  function clearManualMatchData(): void {
    clearManualSeriesMatches();
    onClearManualSeriesMatches?.();
    onMessage("Series overrides deleted.");
  }

  /**
   * Purpose: Clear every known Complete Series local data store.
   *
   * @returns A promise that resolves after V2 data and legacy V1 data are
   * cleared.
   */
  async function clearAllLocalData(): Promise<void> {
    if (!confirmClearAllLocalData()) return;

    onClearHiddenItems?.();
    clearManualBookMatches();
    onClearManualBookMatches?.();
    clearManualSeriesMatches();
    onClearManualSeriesMatches?.();
    clearScanPreferences();
    onClearPreferences?.();
    clearResultsPreferences();
    onClearResultsPreferences?.();
    clearMetadataRequestMemoryCaches();
    await Promise.all([
      clearAudibleResponseCache().catch(() => undefined),
      clearProviderResponseCache().catch(() => undefined),
    ]);
    setProviderResponseCacheCount(0);

    try {
      await deleteLegacyStorageDatabase();
      onMessage("All local data deleted.");
    } catch {
      onMessage("V2 data deleted. Legacy V1 data could not be deleted.");
    }
  }

  /**
   * Purpose: Clear one V1 IndexedDB collection from the local browser.
   *
   * @param key - Legacy V1 storage key to delete.
   * @returns A promise that resolves after the delete attempt finishes.
   */
  async function clearLegacyData(key: LegacyStorageKey): Promise<void> {
    try {
      await deleteLegacyStorageKey(key);
      onMessage("Legacy V1 data deleted.");
    } catch {
      onMessage("Legacy V1 data could not be deleted.");
    }
  }

  return (
    <section className="local-store-panel">
      <div className="local-store-panel__heading">
        <h3>Manage local data</h3>
        <InfoPopover ariaLabel="Local data information">
          Local data is saved in this browser for this exact address. A different host, port, or
          browser uses a separate storage area.
        </InfoPopover>
      </div>
      <p>
        Delete specific saved items from this browser. Download a backup first if you may need to
        restore them.
      </p>
      <CurrentLocalStoreRows
        providerResponseCacheCount={providerResponseCacheCount}
        hiddenItems={hiddenItems}
        manualBookMatches={manualBookMatches}
        manualSeriesMatches={manualSeriesMatches}
        onClearProviderResponseCache={() => void clearProviderResponseCacheData()}
        onClearHiddenItems={clearHiddenData}
        onClearManualBookMatches={clearManualBookMatchData}
        onClearManualSeriesMatches={clearManualMatchData}
        onClearResultsPreferences={clearResultPreferenceData}
        onClearScanPreferences={clearPreferenceData}
        preferences={preferences}
        resultsPreferences={resultsPreferences}
      />
      <LegacyLocalStoreRows onClearLegacyData={(key) => void clearLegacyData(key)} />
      <footer className="local-store-panel__footer">
        <button
          className="button-secondary local-store-panel__clear-all"
          type="button"
          onClick={() => void clearAllLocalData()}
        >
          Delete all local data
        </button>
      </footer>
    </section>
  );
}
