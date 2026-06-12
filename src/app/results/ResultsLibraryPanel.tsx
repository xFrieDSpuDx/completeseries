import { useState } from "react";
import type { ScanOptions } from "../../features/scan/runLibraryScan";
import { EmptyState } from "../../shared/EmptyState";
import { LibrarySelector } from "../setup/LibrarySelector";
import { extractScanFilters } from "../setup/scanOptionHelpers";
import { saveScanPreferences } from "../setup/scanPreferencesStore";

type ResultsLibraryPanelProps = {
  onApply: (options: ScanOptions) => Promise<void>;
  onClose: () => void;
  scanOptions: ScanOptions;
};

/**
 * Purpose: Let users change the selected Audiobookshelf libraries from the
 * results page without leaving the current results until they explicitly
 * rescan.
 *
 * @param props - Library panel inputs.
 * @param props.onApply - Callback used to rescan with the selected libraries.
 * @param props.onClose - Callback used to close the drawer without rescanning.
 * @param props.scanOptions - Options from the completed scan.
 * @returns A library selector with an explicit apply/rescan action.
 */
export function ResultsLibraryPanel({ onApply, onClose, scanOptions }: ResultsLibraryPanelProps) {
  const libraries = scanOptions.availableLibraries ?? [];
  const initialSelectedLibraryIds =
    scanOptions.selectedLibraryIds && scanOptions.selectedLibraryIds.length > 0
      ? scanOptions.selectedLibraryIds
      : libraries.map((library) => library.id);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(
    initialSelectedLibraryIds
  );
  const [error, setError] = useState("");

  /**
   * Purpose: Save the selected libraries and start a deliberate rescan.
   *
   * @returns A promise that resolves after the parent scan callback starts.
   */
  async function applyAndRescan(): Promise<void> {
    if (selectedLibraryIds.length === 0) {
      setError("Select at least one library to scan.");
      return;
    }

    const filters = extractScanFilters(scanOptions);
    const nextOptions = {
      ...scanOptions,
      selectedLibraryIds,
    };

    saveScanPreferences({
      filters,
      region: scanOptions.region,
      selectedLibraryIds,
    });
    onClose();
    await onApply(nextOptions);
  }

  return (
    <div className="results-panel-layout results-library-panel">
      <div className="results-panel-scroll results-panel-scroll--compact">
        {libraries.length > 0 ? (
          <LibrarySelector
            libraries={libraries}
            selectedLibraryIds={selectedLibraryIds}
            onChange={setSelectedLibraryIds}
          />
        ) : (
          <EmptyState compact title="No library list available">
            Connect to a server and run a scan before changing libraries here.
          </EmptyState>
        )}

        {error ? <div className="error-message">{error}</div> : null}
      </div>

      <footer className="results-filter-actions">
        <button type="button" onClick={applyAndRescan} disabled={libraries.length === 0}>
          Apply and rescan
        </button>
      </footer>
    </div>
  );
}
