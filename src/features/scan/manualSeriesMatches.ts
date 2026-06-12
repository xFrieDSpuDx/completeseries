import type { LocalSeriesEvidence, RegionCode } from "../../domain/audiobook";
import { normaliseText } from "../../domain/normalise";

export type ManualSeriesMatch = {
  createdAt: string;
  localSeriesId?: string;
  localSeriesName: string;
  providerId: string;
  providerName?: string;
  providerSeriesAsin: string;
  providerSeriesName?: string;
  region: RegionCode;
};

/**
 * Purpose: Find manual provider-series overrides that apply to one local
 * Audiobookshelf series, selected region, and metadata provider.
 *
 * @param localSeries - Local series currently being scanned.
 * @param providerId - Metadata provider id currently being queried.
 * @param region - Audible region selected for the scan.
 * @param matches - Saved manual series matches.
 * @returns Manual matches for this local series/provider/region combination.
 */
export function getManualSeriesMatchesForProvider(
  localSeries: LocalSeriesEvidence,
  providerId: string,
  region: RegionCode,
  matches: ManualSeriesMatch[] = []
): ManualSeriesMatch[] {
  const localSeriesName = normaliseText(localSeries.name);

  return matches.filter((match) => {
    if (match.providerId !== providerId || match.region !== region) return false;
    if (match.localSeriesId && match.localSeriesId === localSeries.id) return true;

    return normaliseText(match.localSeriesName) === localSeriesName;
  });
}
