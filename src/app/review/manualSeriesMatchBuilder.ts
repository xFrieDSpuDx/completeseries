import type { RegionCode } from "../../domain/audiobook";
import type { ManualSeriesMatch } from "../../features/scan/manualSeriesMatches";
import type {
  SeriesCandidateReview,
  SeriesScanReport,
} from "../../features/scan/seriesScanReport";

/**
 * Purpose: Decide whether a candidate can be saved as a provider-series
 * override.
 *
 * @param report - Series report that owns the candidate.
 * @param candidate - Provider candidate shown in Review.
 * @param region - Region from the completed scan.
 * @param onSaveManualSeriesMatch - Optional save callback.
 * @returns `true` when the candidate is usable as a provider-series override.
 */
export function canSaveManualMatch(
  report: SeriesScanReport,
  candidate: SeriesCandidateReview,
  region: RegionCode | undefined,
  onSaveManualSeriesMatch: ((match: ManualSeriesMatch) => void) | undefined
): onSaveManualSeriesMatch is (match: ManualSeriesMatch) => void {
  return Boolean(
    report.status === "unresolved" &&
      !candidate.accepted &&
      candidate.providerId &&
      region &&
      onSaveManualSeriesMatch
  );
}

/**
 * Purpose: Build a saved provider-series override from one Review candidate.
 *
 * @param report - Series report that owns the candidate.
 * @param candidate - Candidate selected by the user.
 * @param region - Region used by the completed scan.
 * @returns A provider-series override record for future scans.
 */
export function buildManualSeriesMatch(
  report: SeriesScanReport,
  candidate: SeriesCandidateReview,
  region: RegionCode | undefined
): ManualSeriesMatch {
  return {
    createdAt: new Date().toISOString(),
    localSeriesId: report.localSeries.id,
    localSeriesName: report.localSeries.name,
    providerId: candidate.providerId ?? "unknown",
    providerName: candidate.providerName,
    providerSeriesAsin: candidate.seriesAsin,
    providerSeriesName: candidate.name,
    region: region ?? "uk",
  };
}
