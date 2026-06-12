import type { ScanResult } from "../scan/runLibraryScan";
import type { DebugHistoryEntry } from "./debugHistory";
import { downloadTextFile, escapeCsvValue, type DebugTableRow } from "./debugPanelRows";

/**
 * Purpose: Download debug rows as JSON, including scan history and series
 * reports for context.
 *
 * @param debugRows - Debug rows to include in the export.
 * @param history - Recent scan history entries.
 * @param result - Current scan result.
 * @returns Nothing. A browser download is triggered.
 */
export function downloadDebugJson(
  debugRows: DebugTableRow[],
  history: DebugHistoryEntry[],
  result: ScanResult
): void {
  downloadTextFile(
    "complete-series-debug.json",
    buildDebugJsonExport(debugRows, history, result),
    "application/json"
  );
}

/**
 * Purpose: Download debug rows as CSV.
 *
 * @param debugRows - Debug rows to include in the export.
 * @returns Nothing. A browser download is triggered.
 */
export function downloadDebugCsv(debugRows: DebugTableRow[]): void {
  downloadTextFile("complete-series-debug.csv", buildDebugCsvExport(debugRows), "text/csv");
}

/**
 * Purpose: Build JSON text for a debug export.
 *
 * @param debugRows - Debug rows to include in the export.
 * @param history - Recent scan history entries.
 * @param result - Current scan result.
 * @returns Pretty-printed JSON containing debug rows and scan context.
 */
export function buildDebugJsonExport(
  debugRows: DebugTableRow[],
  history: DebugHistoryEntry[],
  result: ScanResult
): string {
  return JSON.stringify(
    { debugRows, history, seriesReports: result.seriesReports },
    null,
    2
  );
}

/**
 * Purpose: Build CSV text for a debug export.
 *
 * @param debugRows - Debug rows to include in the export.
 * @returns CSV text containing scan, outcome, checks, provider identifiers, and
 * detailed evidence.
 */
export function buildDebugCsvExport(debugRows: DebugTableRow[]): string {
  const header = ["Scan", "Outcome", "Checks", "ASIN", "Series", "Title", "Details"];
  const rows = debugRows.map((row) => [
    row.scanLabel,
    row.action,
    row.checkLabels.join("; "),
    row.diagnostic.asin,
    row.seriesName,
    row.diagnostic.title,
    [
      ...row.diagnostic.checks,
      ...row.diagnostic.shownBecause,
      ...row.diagnostic.providerEvidence,
    ].join(" | "),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}
