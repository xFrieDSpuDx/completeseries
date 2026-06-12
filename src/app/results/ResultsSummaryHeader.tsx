import type { ScanOptions } from "../../features/scan/runLibraryScan";
import type { DebugHistoryEntry } from "../../features/debug/debugHistory";
import { BrandMark } from "../components/BrandMark";
import {
  getActiveScanFilterLabels,
  getLookupModeLabel,
  getRegionLabel,
} from "../setup/scanFilterSummaries";
import { getMetadataProviderSelectionLabel } from "../../integrations/metadata/metadataProviderRegistry";

type ResultsSummaryHeaderProps = {
  completeAfterFiltersCount: number;
  hiddenSeriesCount: number;
  lastScanOptions: ScanOptions | null;
  latestHistoryEntry?: DebugHistoryEntry;
  librariesScanned: number;
  localSeriesCount: number;
  matchedMissingSeriesCount: number;
  matchedSeriesCount: number;
  mergedResultGroupCount: number;
  unresolvedSeriesCount: number;
  visibleSeriesCount: number;
};

/**
 * Purpose: Render the completed scan headline and compact summary stats without
 * leaking internal result-group language into the main interface.
 *
 * @param props - Summary values for the completed scan.
 * @param props.completeAfterFiltersCount - Matched series with no visible
 * missing books after filters.
 * @param props.hiddenSeriesCount - Hidden series count in local preferences.
 * @param props.lastScanOptions - Options used for the completed scan.
 * @param props.latestHistoryEntry - Most recent debug history entry.
 * @param props.librariesScanned - Number of Audiobookshelf libraries scanned.
 * @param props.localSeriesCount - Number of local series found.
 * @param props.matchedMissingSeriesCount - Matched series with visible missing
 * books.
 * @param props.matchedSeriesCount - Number of local series matched to provider
 * metadata.
 * @param props.mergedResultGroupCount - Count of provider series merged into
 * existing visible series groups.
 * @param props.unresolvedSeriesCount - Number of unmatched local series.
 * @param props.visibleSeriesCount - Number of visible series cards.
 * @returns Results header and scan details disclosure.
 */
export function ResultsSummaryHeader({
  completeAfterFiltersCount,
  hiddenSeriesCount,
  lastScanOptions,
  latestHistoryEntry,
  librariesScanned,
  localSeriesCount,
  matchedMissingSeriesCount,
  matchedSeriesCount,
  mergedResultGroupCount,
  unresolvedSeriesCount,
  visibleSeriesCount,
}: ResultsSummaryHeaderProps) {
  const activeFilterLabels = lastScanOptions ? getActiveScanFilterLabels(lastScanOptions) : [];

  return (
    <>
      <header className="results-header">
        <div className="results-header__identity">
          <BrandMark size="small" />
          <div className="results-header__copy">
            <h2>{buildMissingSeriesHeadline(visibleSeriesCount)}</h2>
            <dl className="results-stats" aria-label="Scan summary">
              <SummaryStat label="Scanned" value={localSeriesCount} />
              <SummaryStat label="Matched" value={matchedSeriesCount} />
              <SummaryStat label="Missing" value={matchedMissingSeriesCount} />
              <SummaryStat label="Complete" value={completeAfterFiltersCount} />
              <SummaryStat label="Review" value={unresolvedSeriesCount} />
              <SummaryStat label="Hidden" value={hiddenSeriesCount} />
              {mergedResultGroupCount > 0 ? (
                <SummaryStat label="Merged" value={mergedResultGroupCount} />
              ) : null}
            </dl>
          </div>
        </div>
      </header>

      {lastScanOptions ? (
        <details className="results-scan-details">
          <summary>
            <span>Scan details</span>
            <small>
              {buildLastScanSummary(
                lastScanOptions,
                librariesScanned,
                latestHistoryEntry?.finishedAt
              )}
            </small>
          </summary>
          <p>
            <strong>Active filters</strong>{" "}
            {activeFilterLabels.length > 0 ? activeFilterLabels.join(" · ") : "None"}
          </p>
        </details>
      ) : null}
    </>
  );
}

/**
 * Purpose: Render one compact scan summary stat.
 *
 * @param props - Summary stat values.
 * @param props.label - Short stat label.
 * @param props.value - Numeric stat value.
 * @returns A labelled definition-list item.
 */
function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="results-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Purpose: Build the primary results headline in user-facing series language
 * while keeping plural grammar tidy.
 *
 * @param missingSeriesCount - Number of visible series result groups with
 * missing books.
 * @returns A personal headline for the completed scan.
 */
function buildMissingSeriesHeadline(missingSeriesCount: number): string {
  if (missingSeriesCount === 1) return "1 of your series has missing books";

  return `${missingSeriesCount} of your series have missing books`;
}

/**
 * Purpose: Build a compact results summary showing the scan context users are
 * most likely to need when comparing runs.
 *
 * @param options - Options used for the completed scan.
 * @param librariesScanned - Number of Audiobookshelf libraries scanned.
 * @param finishedAt - Optional ISO timestamp for the completed scan.
 * @returns A compact sentence fragment for the results header.
 */
function buildLastScanSummary(
  options: ScanOptions,
  librariesScanned: number,
  finishedAt?: string
): string {
  const parts = [
    finishedAt ? formatScanTime(finishedAt) : "time unavailable",
    getRegionLabel(options.region),
    `${librariesScanned} ${librariesScanned === 1 ? "library" : "libraries"}`,
    getLookupModeLabel(options.metadataLookupMode),
    getMetadataProviderSelectionLabel(options.metadataProviderIds),
  ];

  return parts.join(" · ");
}

/**
 * Purpose: Format a scan completion timestamp for compact display.
 *
 * @param value - ISO timestamp from debug history.
 * @returns Localised date/time text, or the original value when parsing fails.
 */
function formatScanTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return parsedDate.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
