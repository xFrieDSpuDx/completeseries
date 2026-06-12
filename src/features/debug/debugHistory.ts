import type { MissingBookDiagnostic } from "../../domain/missingBooks";
import type { ScanOptions, ScanResult } from "../scan/runLibraryScan";
import {
  getMetadataProviderSearchModeLabel,
  getMetadataProviderSelectionLabel,
} from "../../integrations/metadata/metadataProviderRegistry";

export type DebugHistoryDecision = {
  action: "show" | "skip";
  diagnostic: MissingBookDiagnostic;
  seriesName: string;
};

export type DebugHistoryEntry = {
  id: string;
  finishedAt: string;
  region: string;
  metadataLookupMode: string;
  activeFilters: string[];
  localSeriesCount: number;
  matchedSeriesCount: number;
  unresolvedSeriesCount: number;
  missingBookCount: number;
  debugRows: DebugHistoryDecision[];
};

const FILTER_LABELS: Array<[keyof ScanOptions, string]> = [
  ["onlyUnabridged", "Only unabridged"],
  ["includeSubSeries", "Subseries included"],
  ["ignoreMultiBooks", "Omnibus hidden"],
  ["ignoreNoPositionBooks", "No-position books hidden"],
  ["ignoreSubPositionBooks", "Decimal positions hidden"],
  ["ignoreFutureDateBooks", "Unreleased books hidden"],
  ["ignoreFuturePlaceholders", "Empty placeholders hidden"],
  ["ignorePastDateBooks", "Released books hidden"],
  ["ignoreTitleSubtitle", "Owned title/subtitle hidden"],
  ["ignoreSameSeriesPosition", "Owned positions hidden"],
  ["ignoreTitleSubtitleInMissingArray", "Duplicate titles collapsed"],
  ["ignoreSameSeriesPositionInMissingArray", "Duplicate positions collapsed"],
  ["matchNarratorEditions", "Narrator editions separated"],
  ["cacheMetadata", "Catalogue cache on"],
];

let debugHistoryFallbackCounter = 0;

/**
 * Purpose: Convert enabled scan options into compact labels for debug history
 * without coupling the debug feature to app-level summary UI helpers.
 *
 * @param options - Scan options used for a completed scan.
 * @returns Human-readable active filter labels.
 */
function getActiveScanFilterLabels(options: ScanOptions): string[] {
  return [
    getMetadataProviderSelectionLabel(options.metadataProviderIds),
    getMetadataProviderSearchModeLabel(options.metadataProviderSearchMode),
    ...FILTER_LABELS.filter(([key]) => options[key] === true).map(([, label]) => label),
  ];
}

/**
 * Purpose: Build a compact in-memory history row for comparing recent scan
 * runs with different filter settings.
 *
 * @param result - Completed scan result.
 * @param options - Scan options used for the completed run.
 * @param finishedAt - Completion date, supplied by tests when needed.
 * @returns A lightweight debug history entry without credentials or server
 * details.
 */
export function buildDebugHistoryEntry(
  result: ScanResult,
  options: ScanOptions,
  finishedAt = new Date()
): DebugHistoryEntry {
  return {
    id: createDebugHistoryId(finishedAt),
    finishedAt: finishedAt.toISOString(),
    region: options.region,
    metadataLookupMode: options.metadataLookupMode,
    activeFilters: getActiveScanFilterLabels(options),
    localSeriesCount: result.localSeriesCount,
    matchedSeriesCount: result.matchedSeriesCount,
    unresolvedSeriesCount: result.unresolvedSeries.length,
    missingBookCount: result.missingBookCount,
    debugRows: result.seriesReports.flatMap((report) =>
      report.debugDecisions.map((decision) => ({
        seriesName: report.providerSeries?.name ?? report.localSeries.name,
        action: decision.action,
        diagnostic: decision.diagnostic,
      }))
    ),
  };
}

/**
 * Purpose: Create a stable-looking scan session id that does not rely only on
 * the visible completion time.
 *
 * @param finishedAt - Completion date for the scan.
 * @returns A unique-ish scan identifier suitable for history keys and labels.
 */
function createDebugHistoryId(finishedAt: Date): string {
  const timePart = finishedAt
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 17);
  const randomPart =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8)
      : createFallbackRandomPart();

  return `scan-${timePart}-${randomPart}`;
}

/**
 * Purpose: Generate a collision-resistant id suffix when crypto.randomUUID is
 * unavailable in the current runtime.
 *
 * @returns A compact fallback token using time, a counter, and Math.random.
 */
function createFallbackRandomPart(): string {
  debugHistoryFallbackCounter = (debugHistoryFallbackCounter + 1) % 1296;

  return [
    Date.now().toString(36),
    debugHistoryFallbackCounter.toString(36).padStart(2, "0"),
    Math.random().toString(36).slice(2, 8),
  ].join("");
}
