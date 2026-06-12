import type { MissingBookGroup } from "../../domain/missingBooks";
import type { ScanOptions, ScanResult } from "../../features/scan/runLibraryScan";
import type { MissingBooksManualBookSource } from "./missingBookDetailHelpers";

export type ResultsViewSummary = {
  completeAfterFiltersCount: number;
  matchedMissingSeriesCount: number;
  mergedResultGroupCount: number;
};

/**
 * Purpose: Derive compact summary counts for the completed results view.
 *
 * @param result - Completed scan result.
 * @returns Counts used by the results summary header.
 */
export function buildResultsViewSummary(result: ScanResult): ResultsViewSummary {
  const matchedMissingSeriesCount = result.seriesReports.filter(
    (report) => report.status === "matched" && report.missingBookCount > 0
  ).length;
  const completeAfterFiltersCount = result.seriesReports.filter(
    (report) => report.status === "matched" && report.missingBookCount === 0
  ).length;

  return {
    completeAfterFiltersCount,
    matchedMissingSeriesCount,
    mergedResultGroupCount: Math.max(0, matchedMissingSeriesCount - result.missingGroups.length),
  };
}

/**
 * Purpose: Find the provider series behind an opened missing-books group,
 * including tentative low-confidence groups, so the drawer can save individual
 * books as manually owned.
 *
 * @param group - Visible missing-book result group selected by the user.
 * @param result - Completed scan result containing per-series match reports.
 * @param region - Audible region used for the completed scan.
 * @returns Manual owned-book source details, or `undefined` when the group
 * cannot be traced to one provider series.
 */
export function getManualBookMatchSourceForGroup(
  group: MissingBookGroup,
  result: ScanResult,
  region: ScanOptions["region"] | undefined
): MissingBooksManualBookSource | undefined {
  if (!region) return undefined;

  const report = result.seriesReports.find(
    (seriesReport) =>
      seriesReport.providerSeries &&
      (seriesReport.providerSeries.seriesAsin === group.seriesAsin ||
        seriesReport.providerSeries.name === group.seriesName)
  );

  return {
    providerId: report?.providerSeries?.providerId ?? group.providerId ?? "audible",
    providerName: report?.providerSeries?.providerName ?? group.providerName,
    providerSeriesAsin: report?.providerSeries?.seriesAsin ?? group.seriesAsin,
    providerSeriesName: report?.providerSeries?.name ?? group.seriesName,
    region,
  };
}
