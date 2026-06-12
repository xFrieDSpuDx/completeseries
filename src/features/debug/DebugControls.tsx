import { NativeSelectField } from "../../app/components/NativeSelectField";
import type { DebugOutcomeFilter } from "./debugPanelRows";

type DebugControlsProps = {
  checkFilter: string;
  checkOptions: string[];
  filteredRowCount: number;
  onCheckFilterChange: (value: string) => void;
  onCopySummary: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onOutcomeFilterChange: (value: DebugOutcomeFilter) => void;
  onQueryChange: (value: string) => void;
  onScanFilterChange: (value: string) => void;
  outcomeFilter: DebugOutcomeFilter;
  query: string;
  scanFilter: string;
  scanOptions: Array<{ id: string; label: string }>;
  totalRowCount: number;
};

/**
 * Purpose: Render debug filter controls and export actions as a focused panel.
 *
 * @param props - Debug control values and callbacks.
 * @param props.checkFilter - Active check-type filter.
 * @param props.checkOptions - Available check-type labels.
 * @param props.filteredRowCount - Number of rows matching the current filters.
 * @param props.onCheckFilterChange - Callback that updates the check filter.
 * @param props.onCopySummary - Callback that copies the current summary.
 * @param props.onExportCsv - Callback that downloads filtered debug CSV.
 * @param props.onExportJson - Callback that downloads filtered debug JSON.
 * @param props.onOutcomeFilterChange - Callback that updates the outcome
 * filter.
 * @param props.onQueryChange - Callback that updates the text search.
 * @param props.onScanFilterChange - Callback that updates the scan filter.
 * @param props.outcomeFilter - Active outcome filter.
 * @param props.query - Active text query.
 * @param props.scanFilter - Active scan filter.
 * @param props.scanOptions - Available scan-history options.
 * @param props.totalRowCount - Total rows available before debug filters.
 * @returns Debug controls for filtering, exporting, and copying summaries.
 */
export function DebugControls({
  checkFilter,
  checkOptions,
  filteredRowCount,
  onCheckFilterChange,
  onCopySummary,
  onExportCsv,
  onExportJson,
  onOutcomeFilterChange,
  onQueryChange,
  onScanFilterChange,
  outcomeFilter,
  query,
  scanFilter,
  scanOptions,
  totalRowCount,
}: DebugControlsProps) {
  return (
    <section className="debug-controls" aria-label="Debug filters">
      <NativeSelectField
        id="debugScanFilter"
        label="Scan"
        value={scanFilter}
        onChange={onScanFilterChange}
      >
        <option value="latest">Latest scan</option>
        <option value="all">All scans</option>
        {scanOptions.map((scan) => (
          <option value={scan.id} key={scan.id}>
            {scan.label}
          </option>
        ))}
      </NativeSelectField>

      <NativeSelectField
        id="debugOutcomeFilter"
        label="Outcome"
        value={outcomeFilter}
        onChange={onOutcomeFilterChange}
      >
        <option value="any">Any outcome</option>
        <option value="show">Shown</option>
        <option value="skip">Skipped</option>
      </NativeSelectField>

      <NativeSelectField
        id="debugCheckFilter"
        label="Check"
        value={checkFilter}
        onChange={onCheckFilterChange}
      >
        <option value="any">Any check</option>
        {checkOptions.map((checkLabel) => (
          <option value={checkLabel} key={checkLabel}>
            {checkLabel}
          </option>
        ))}
      </NativeSelectField>

      <label className="debug-controls__search">
        Search
        <input
          type="search"
          placeholder="ASIN, title, series or evidence"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="debug-controls__actions">
        <span>
          {filteredRowCount} of {totalRowCount} checks
        </span>
        <button className="button-secondary" type="button" onClick={onExportJson}>
          JSON
        </button>
        <button className="button-secondary" type="button" onClick={onExportCsv}>
          CSV
        </button>
        <button className="button-secondary" type="button" onClick={onCopySummary}>
          Copy summary
        </button>
      </div>
    </section>
  );
}
