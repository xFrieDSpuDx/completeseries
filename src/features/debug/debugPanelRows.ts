import type { ScanResult } from "../scan/runLibraryScan";
import type { DebugHistoryDecision, DebugHistoryEntry } from "./debugHistory";

export type DebugOutcomeFilter = "any" | "show" | "skip";

export type DebugTableRow = DebugHistoryDecision & {
  checkLabels: string[];
  finishedAt: string;
  scanId: string;
  scanLabel: string;
};

/**
 * Purpose: Build debug rows from scan history when available, falling back to
 * the current result for older call sites.
 *
 * @param history - Recent scan history entries.
 * @param result - Current scan result.
 * @returns Debug rows tagged with scan labels and derived check labels.
 */
export function buildDebugRows(
  history: DebugHistoryEntry[],
  result: ScanResult
): DebugTableRow[] {
  const historyRows = history.flatMap((entry, index) =>
    entry.debugRows.map((row) =>
      decorateDebugRow(row, entry.id, formatScanLabel(entry, index), entry.finishedAt)
    )
  );
  if (historyRows.length > 0) return historyRows;

  return result.seriesReports.flatMap((report) =>
    report.debugDecisions.map((decision) =>
      decorateDebugRow(
        {
          seriesName: report.providerSeries?.name ?? report.localSeries.name,
          action: decision.action,
          diagnostic: decision.diagnostic,
        },
        "current",
        "Current",
        new Date().toISOString()
      )
    )
  );
}

/**
 * Purpose: Filter debug rows by outcome, derived check type, and text query.
 *
 * @param rows - All available debug rows.
 * @param filters - Active debug filter values.
 * @returns Rows matching every active filter.
 */
export function filterDebugRows(
  rows: DebugTableRow[],
  filters: { checkFilter: string; outcomeFilter: DebugOutcomeFilter; query: string }
): DebugTableRow[] {
  const normalisedQuery = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.outcomeFilter !== "any" && row.action !== filters.outcomeFilter) return false;
    if (filters.checkFilter !== "any" && !row.checkLabels.includes(filters.checkFilter)) {
      return false;
    }

    if (!normalisedQuery) return true;

    const searchableText = [
      row.scanLabel,
      row.action,
      row.seriesName,
      row.diagnostic.asin,
      row.diagnostic.title,
      ...row.checkLabels,
      ...row.diagnostic.checks,
      ...row.diagnostic.shownBecause,
      ...row.diagnostic.providerEvidence,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalisedQuery);
  });
}

/**
 * Purpose: Filter debug rows by selected scan before other filters run.
 *
 * @param rows - All available debug rows.
 * @param scanFilter - Active scan filter value.
 * @param latestScanId - Scan id for the newest scan.
 * @returns Rows for the selected scan scope.
 */
export function filterRowsByScan(
  rows: DebugTableRow[],
  scanFilter: string,
  latestScanId: string
): DebugTableRow[] {
  if (scanFilter === "all") return rows;
  const selectedScanId = scanFilter === "latest" ? latestScanId : scanFilter;

  return rows.filter((row) => row.scanId === selectedScanId);
}

/**
 * Purpose: Get sorted check labels for the filter dropdown.
 *
 * @param rows - Debug rows containing derived labels.
 * @returns Distinct check labels.
 */
export function getDistinctCheckLabels(rows: DebugTableRow[]): string[] {
  return [...new Set(rows.flatMap((row) => row.checkLabels))].sort((first, second) =>
    first.localeCompare(second)
  );
}

/**
 * Purpose: Get distinct scan options for the scan filter.
 *
 * @param rows - Debug rows tagged with scan ids.
 * @returns Scan id/label pairs in newest-first order.
 */
export function getDistinctScans(rows: DebugTableRow[]): Array<{ id: string; label: string }> {
  const scansById = new Map<string, string>();

  for (const row of rows) {
    if (!scansById.has(row.scanId)) scansById.set(row.scanId, row.scanLabel);
  }

  return [...scansById.entries()].map(([id, label]) => ({ id, label }));
}

/**
 * Purpose: Create a compact scan label that stays unique when multiple scans
 * finish close together.
 *
 * @param entry - Scan history entry.
 * @param index - Zero-based history index, newest first.
 * @returns Time, run number, and a short scan id.
 */
export function formatScanLabel(entry: DebugHistoryEntry, index: number): string {
  return `${formatHistoryTime(entry.finishedAt)} · run ${index + 1} · ${formatShortScanId(entry.id)}`;
}

/**
 * Purpose: Download text content through a temporary browser object URL.
 *
 * @param filename - Download filename.
 * @param content - Text content to save.
 * @param mimeType - Browser MIME type for the blob.
 * @returns Nothing. A browser download is triggered.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Purpose: Escape one CSV cell value.
 *
 * @param value - Raw CSV cell value.
 * @returns CSV-safe cell value.
 */
export function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Purpose: Add scan and check metadata to a raw debug decision.
 *
 * @param row - Raw debug decision.
 * @param scanId - Unique scan id for filtering/export keys.
 * @param scanLabel - Human label shown in the table.
 * @param finishedAt - Completion timestamp for the scan.
 * @returns A table-ready debug row.
 */
function decorateDebugRow(
  row: DebugHistoryDecision,
  scanId: string,
  scanLabel: string,
  finishedAt: string
): DebugTableRow {
  return {
    ...row,
    checkLabels: deriveCheckLabels(row),
    finishedAt,
    scanId,
    scanLabel,
  };
}

/**
 * Purpose: Derive stable check labels from V2 diagnostic text so users can
 * filter debug rows by the kind of decision that happened.
 *
 * @param row - Debug decision row.
 * @returns Human-readable check labels.
 */
function deriveCheckLabels(row: DebugHistoryDecision): string[] {
  const text = [
    row.action,
    ...row.diagnostic.checks,
    ...row.diagnostic.shownBecause,
    ...row.diagnostic.providerEvidence,
  ]
    .join(" ")
    .toLowerCase();
  const labels: string[] = [];

  addLabelIf(labels, "Availability", text.includes("available") || text.includes("unavailable"));
  addLabelIf(labels, "Region", text.includes("region"));
  addLabelIf(labels, "Owned identifier", text.includes("asin") || text.includes("sku"));
  addLabelIf(labels, "Format", text.includes("unabridged") || text.includes("format"));
  addLabelIf(labels, "Series position", text.includes("position"));
  addLabelIf(labels, "Release date", text.includes("release"));
  addLabelIf(labels, "Title/subtitle", text.includes("title") || text.includes("subtitle"));
  addLabelIf(labels, "Narrator", text.includes("narrator"));
  addLabelIf(labels, "Container", text.includes("container"));
  addLabelIf(labels, "Shown result", row.action === "show");
  addLabelIf(labels, "Skipped result", row.action === "skip");

  return labels.length > 0 ? labels : ["Other"];
}

/**
 * Purpose: Add a label only when the condition is true and the label is new.
 *
 * @param labels - Mutable labels list.
 * @param label - Label to add.
 * @param shouldAdd - Whether the label applies.
 * @returns Nothing. The labels list is updated in place.
 */
function addLabelIf(labels: string[], label: string, shouldAdd: boolean): void {
  if (shouldAdd && !labels.includes(label)) labels.push(label);
}

/**
 * Purpose: Convert a full debug history id into a compact token for dropdowns
 * and table cells.
 *
 * @param scanId - Full scan id from the debug history entry.
 * @returns A short, readable id fragment.
 */
function formatShortScanId(scanId: string): string {
  const compactId = scanId.replace(/^scan-/, "").replace(/[^a-z0-9]/gi, "");
  const idFragment = compactId.slice(-6) || scanId.slice(-6);

  return `ID ${idFragment.toUpperCase()}`;
}

/**
 * Purpose: Format a debug history timestamp for compact display.
 *
 * @param value - ISO timestamp from a scan history entry.
 * @returns Localised short time, or the raw value if parsing fails.
 */
function formatHistoryTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
