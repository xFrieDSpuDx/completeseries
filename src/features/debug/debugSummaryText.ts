import type { ScanResult } from "../scan/runLibraryScan";
import type { DebugOutcomeFilter, DebugTableRow } from "./debugPanelRows";

type DebugSummaryValues = {
  checkFilter: string;
  debugRows: DebugTableRow[];
  filteredRows: DebugTableRow[];
  outcomeFilter: DebugOutcomeFilter;
  query: string;
  result: ScanResult;
  scanFilter: string;
};

/**
 * Purpose: Build a small plain-text debug summary that users can paste into
 * issue reports without exporting the full debug table.
 *
 * @param values - Current debug counts and filter state.
 * @param values.checkFilter - Active check filter.
 * @param values.debugRows - All available debug rows.
 * @param values.filteredRows - Rows matching current debug filters.
 * @param values.outcomeFilter - Active outcome filter.
 * @param values.query - Active debug search query.
 * @param values.result - Current scan result.
 * @param values.scanFilter - Active scan filter.
 * @returns Plain-text debug summary.
 */
export function buildDebugSummaryText({
  checkFilter,
  debugRows,
  filteredRows,
  outcomeFilter,
  query,
  result,
  scanFilter,
}: DebugSummaryValues): string {
  const shownCount = debugRows.filter((row) => row.action === "show").length;
  const skippedCount = debugRows.filter((row) => row.action === "skip").length;

  return [
    "Complete Series debug summary",
    `Rows: ${filteredRows.length} filtered of ${debugRows.length} total`,
    `Outcomes: ${shownCount} shown, ${skippedCount} skipped, ${result.unresolvedSeries.length} unresolved`,
    `Filters: scan=${scanFilter}, outcome=${outcomeFilter}, check=${checkFilter}, search=${query || "none"}`,
    `Series: ${result.localSeriesCount} scanned, ${result.matchedSeriesCount} matched`,
  ].join("\n");
}
