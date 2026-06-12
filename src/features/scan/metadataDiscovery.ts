import type {
  LocalSeriesEvidence,
  ProviderSeriesCandidate,
} from "../../domain/audiobook";
import {
  getMetadataProvidersById,
} from "../../integrations/metadata/metadataProviderRegistry";
import { appendUniqueCandidates } from "./metadataCandidateHelpers";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import {
  getMetadataLookupAsins,
  type MetadataLookupMode,
} from "./metadataLookupAsins";
import { type MetadataLookupAnchor } from "./lookupAnchors";
import {
  discoverManualProviderSeriesCandidates,
} from "./manualProviderSeriesDiscovery";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";
import {
  discoverProviderSeriesCandidatesFromProvider,
} from "./providerSeriesDiscovery";

export { getMetadataLookupAsins, type MetadataLookupMode } from "./metadataLookupAsins";
export type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";

/**
 * Purpose: Find possible provider series for a local Audiobookshelf series by
 * trying saved manual matches, then selected metadata providers in order.
 *
 * @param localSeries - The Audiobookshelf series and local books currently
 * being matched.
 * @param options - Scan settings that control region, subseries handling,
 * provider cache usage, and lookup depth.
 * @param progress - Optional callback for fine-grained provider lookup status.
 * @param lookupAsins - ASIN anchors already selected for the current lookup
 * mode.
 * @param lookupAnchors - Mutable list of lookup anchors captured for review.
 * @param providerTraces - Mutable list of provider discovery traces.
 * @returns Candidate provider series that can be scored against the local
 * series. Failed provider lookups are ignored so one bad first book does not
 * automatically skip the whole series.
 */
export async function discoverProviderSeriesCandidates(
  localSeries: LocalSeriesEvidence,
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  lookupAsins = getMetadataLookupAsins(localSeries.books, options.metadataLookupMode),
  lookupAnchors?: MetadataLookupAnchor[],
  providerTraces?: ProviderDiscoveryTrace[]
): Promise<ProviderSeriesCandidate[]> {
  const candidates: ProviderSeriesCandidate[] = [];
  const metadataProviders = getMetadataProvidersById(options.metadataProviderIds);
  const manualCandidates = await discoverManualProviderSeriesCandidates(
    metadataProviders,
    localSeries,
    options,
    progress,
    providerTraces
  );

  if (manualCandidates.length > 0) return manualCandidates;

  for (const metadataProvider of metadataProviders) {
    progress?.(`using ${metadataProvider.displayName}`);
    const providerCandidates = await discoverProviderSeriesCandidatesFromProvider(
      metadataProvider,
      localSeries,
      options,
      progress,
      lookupAsins,
      lookupAnchors,
      providerTraces
    );

    appendUniqueCandidates(candidates, providerCandidates);
    if (candidates.length > 0 && options.metadataProviderSearchMode !== "deep") break;
  }

  return candidates;
}
