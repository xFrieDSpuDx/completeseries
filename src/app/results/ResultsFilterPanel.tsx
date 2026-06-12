import { useState } from "react";
import type { RegionCode } from "../../domain/audiobook";
import type { ScanOptions } from "../../features/scan/runLibraryScan";
import { extractScanFilters } from "../setup/scanOptionHelpers";
import { ScanPreferenceControls } from "../setup/ScanPreferenceControls";
import { defaultScanFilters, type ScanFilters } from "../setup/scanFormTypes";
import { saveScanPreferences } from "../setup/scanPreferencesStore";

type ResultsFilterPanelProps = {
  onApply: (options: ScanOptions) => Promise<void>;
  onClose: () => void;
  scanOptions: ScanOptions;
};

/**
 * Purpose: Let users inspect and change scan filters from the results page
 * without immediately leaving results or starting a scan.
 *
 * @param props - Results filter panel inputs.
 * @param props.onApply - Callback used when the user explicitly rescans with
 * the edited options.
 * @param props.onClose - Callback used to close the filter drawer without
 * rescanning.
 * @param props.scanOptions - Options from the completed scan, used as the
 * starting point for edits.
 * @returns A filter editor with an explicit apply/rescan action.
 */
export function ResultsFilterPanel({ onApply, onClose, scanOptions }: ResultsFilterPanelProps) {
  const [region, setRegion] = useState<RegionCode>(scanOptions.region);
  const [filters, setFilters] = useState<ScanFilters>(extractScanFilters(scanOptions));

  /**
   * Purpose: Save the edited scan preferences and start a deliberate rescan.
   *
   * @returns A promise that resolves after the parent scan callback starts.
   */
  async function applyAndRescan(): Promise<void> {
    const nextOptions = {
      ...scanOptions,
      region,
      ...filters,
    };

    saveScanPreferences({
      filters,
      region,
      selectedLibraryIds: scanOptions.selectedLibraryIds ?? [],
    });
    onClose();
    await onApply(nextOptions);
  }

  return (
    <div className="results-panel-layout results-filter-panel">
      <div className="results-panel-scroll">
        <ScanPreferenceControls
          filters={filters}
          onFiltersChange={(patch) =>
            setFilters((currentFilters) => ({ ...currentFilters, ...patch }))
          }
          onRegionChange={setRegion}
          region={region}
        />
      </div>

      <footer className="results-filter-actions">
        <button
          className="button-secondary results-filter-actions__secondary"
          type="button"
          onClick={() => setFilters(defaultScanFilters)}
        >
          Reset filters
        </button>
        <button type="button" onClick={applyAndRescan}>
          Apply and rescan
        </button>
      </footer>
    </div>
  );
}
