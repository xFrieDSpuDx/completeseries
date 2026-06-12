import { ChangeEvent, useRef, useState } from "react";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import {
  importAudibleResponseCache,
  parseAudibleResponseCachePayload,
} from "../../integrations/metadata/cache/audibleResponseCache";
import {
  importProviderResponseCache,
  parseProviderResponseCachePayload,
} from "../../integrations/metadata/cache/providerResponseCache";
import {
  buildImportMessage,
  downloadLocalDataExport,
} from "./localDataFile";
import { parseHiddenItemsPayload, type HiddenItem } from "./hiddenItemsStore";
import {
  parseManualBookMatchesPayload,
  saveManualBookMatches,
} from "./manualBookMatchStore";
import {
  parseManualSeriesMatchesPayload,
  saveManualSeriesMatches,
} from "./manualSeriesMatchStore";
import {
  parseResultsPreferencesPayload,
  saveResultsPreferences,
  type ResultsPreferences,
} from "../results/resultsPreferencesStore";
import {
  parseScanPreferencesPayload,
  saveScanPreferences,
  type ScanPreferences,
} from "../setup/scanPreferencesStore";
import { LocalStoreManager } from "./LocalStoreManager";

type LocalDataToolsProps = {
  hiddenItems: HiddenItem[];
  manualBookMatches?: ManualBookMatch[];
  manualSeriesMatches?: ManualSeriesMatch[];
  onClearManualBookMatches?: () => void;
  onClearHiddenItems?: () => void;
  onClearManualSeriesMatches?: () => void;
  onClearPreferences?: () => void;
  onClearResultsPreferences?: () => void;
  onImportHiddenItems: (items: HiddenItem[]) => void;
  onImportManualBookMatches?: (matches: ManualBookMatch[]) => void;
  onImportManualSeriesMatches?: (matches: ManualSeriesMatch[]) => void;
  onImportPreferences?: (preferences: ScanPreferences) => void;
  onImportResultsPreferences?: (preferences: ResultsPreferences) => void;
  preferences?: ScanPreferences;
  resultsPreferences?: ResultsPreferences;
};

/**
 * Purpose: Render local data import/export controls for Complete Series
 * browser data.
 *
 * @param props - Local data tool inputs.
 * @param props.hiddenItems - Current hidden item records to export.
 * @param props.manualBookMatches - Current manual owned-book matches to export.
 * @param props.manualSeriesMatches - Current provider-series overrides to
 * export.
 * @param props.onClearManualBookMatches - Optional callback that clears manual
 * owned-book matches.
 * @param props.onClearHiddenItems - Optional callback that clears hidden item
 * state and storage.
 * @param props.onClearManualSeriesMatches - Optional callback that clears
 * provider-series overrides.
 * @param props.onClearPreferences - Optional callback that clears scan
 * preference state and storage.
 * @param props.onClearResultsPreferences - Optional callback that clears
 * results-page display preferences.
 * @param props.onImportHiddenItems - Callback receiving imported hidden items.
 * @param props.onImportManualBookMatches - Optional callback receiving imported
 * manual owned-book matches.
 * @param props.onImportManualSeriesMatches - Optional callback receiving
 * imported provider-series overrides.
 * @param props.onImportPreferences - Optional callback receiving imported scan
 * preferences.
 * @param props.onImportResultsPreferences - Optional callback receiving
 * imported results-page display preferences.
 * @param props.preferences - Optional remembered scan preferences to export.
 * @param props.resultsPreferences - Optional remembered result-display
 * preferences to export.
 * @returns Local data controls for V2.
 */
export function LocalDataTools({
  hiddenItems,
  manualBookMatches = [],
  manualSeriesMatches = [],
  onClearManualBookMatches,
  onClearHiddenItems,
  onClearManualSeriesMatches,
  onClearPreferences,
  onClearResultsPreferences,
  onImportHiddenItems,
  onImportManualBookMatches,
  onImportManualSeriesMatches,
  onImportPreferences,
  onImportResultsPreferences,
  preferences,
  resultsPreferences,
}: LocalDataToolsProps) {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Purpose: Download the current V2 local data as JSON.
   *
   * @returns Nothing. A browser download is triggered.
   */
  function exportLocalData(): void {
    void exportLocalDataFile();
  }

  /**
   * Purpose: Download the current V2 local data and persisted provider
   * response cache as JSON.
   *
   * @returns A promise that resolves after the browser download is triggered.
   */
  async function exportLocalDataFile(): Promise<void> {
    await downloadLocalDataExport(
      hiddenItems,
      manualBookMatches,
      manualSeriesMatches,
      preferences,
      resultsPreferences
    );

    setMessage("Local data exported.");
  }

  /**
   * Purpose: Parse an imported JSON file and merge valid hidden item records.
   *
   * @param event - File input change event.
   * @returns A promise that resolves after the file has been parsed.
   */
  async function importLocalData(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    const importText = await file.text();
    const importedItems = parseHiddenItemsPayload(importText);
    const importedManualBookMatches = parseManualBookMatchesPayload(importText);
    const importedManualMatches = parseManualSeriesMatchesPayload(importText);
    const importedPreferences = parseScanPreferencesPayload(importText);
    const importedResultsPreferences = parseResultsPreferencesPayload(importText);
    const importedAudibleResponseCache = parseAudibleResponseCachePayload(importText);
    const importedProviderResponseCache = parseProviderResponseCachePayload(importText);

    onImportHiddenItems(importedItems);
    if (importedManualBookMatches.length > 0) {
      saveManualBookMatches(importedManualBookMatches);
      onImportManualBookMatches?.(importedManualBookMatches);
    }
    if (importedManualMatches.length > 0) {
      saveManualSeriesMatches(importedManualMatches);
      onImportManualSeriesMatches?.(importedManualMatches);
    }
    if (importedPreferences) {
      saveScanPreferences(importedPreferences);
      onImportPreferences?.(importedPreferences);
    }
    if (importedResultsPreferences) {
      saveResultsPreferences(importedResultsPreferences);
      onImportResultsPreferences?.(importedResultsPreferences);
    }
    const importedAudibleResponseCacheCount = await importAudibleResponseCache(
      importedAudibleResponseCache
    );
    const importedProviderResponseCacheCount = await importProviderResponseCache(
      importedProviderResponseCache
    );

    setMessage(
      buildImportMessage(
        importedItems.length,
        importedManualBookMatches.length,
        importedManualMatches.length,
        Boolean(importedPreferences),
        Boolean(importedResultsPreferences),
        importedAudibleResponseCacheCount + importedProviderResponseCacheCount
      )
    );

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="utility-panel">
      <header className="utility-panel__header">
        <div>
          <h2>Manage local data</h2>
          <p>Back up, restore, or delete Complete Series data saved in this browser.</p>
        </div>
      </header>

      <dl className="local-data-summary" aria-label="Saved local data summary">
        <LocalDataSummaryItem label="Hidden items" value={hiddenItems.length} />
        <LocalDataSummaryItem label="Owned-book matches" value={manualBookMatches.length} />
        <LocalDataSummaryItem label="Series overrides" value={manualSeriesMatches.length} />
      </dl>

      <section className="local-data-section">
        <div className="local-data-section__copy">
          <h3>Backup and restore</h3>
          <p>
            Download a portable backup, or restore one that was previously exported from this app.
          </p>
        </div>
        <div className="utility-actions">
          <button className="button-secondary" type="button" onClick={exportLocalData}>
            Download backup
          </button>
          <label className="file-control">
            <span>Restore from backup</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importLocalData}
            />
          </label>
        </div>
      </section>

      <LocalStoreManager
        hiddenItems={hiddenItems}
        manualBookMatches={manualBookMatches}
        manualSeriesMatches={manualSeriesMatches}
        onClearManualBookMatches={onClearManualBookMatches}
        onClearHiddenItems={onClearHiddenItems}
        onClearManualSeriesMatches={onClearManualSeriesMatches}
        onClearPreferences={onClearPreferences}
        onClearResultsPreferences={onClearResultsPreferences}
        onMessage={setMessage}
        preferences={preferences}
        resultsPreferences={resultsPreferences}
      />

      {message ? <p className="success-message success-message--visible">{message}</p> : null}
    </section>
  );
}

/**
 * Purpose: Render one compact saved-data count in the Local data drawer.
 *
 * @param props - Summary item inputs.
 * @param props.label - User-facing saved-data type.
 * @param props.value - Number of saved records for the type.
 * @returns A compact definition-list item.
 */
function LocalDataSummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
