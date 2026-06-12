import type {
  LocalSeriesEvidence,
  ProviderSeriesCandidate,
} from "../../domain/audiobook";
import { normaliseIdentifier } from "../../domain/normalise";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import {
  appendUniqueCandidates,
  tagProviderCandidate,
} from "./metadataCandidateHelpers";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import {
  getManualSeriesMatchesForProvider,
} from "./manualSeriesMatches";
import {
  createProviderDiscoveryTrace,
  type ProviderDiscoveryTrace,
} from "./providerDiscoveryTrace";
import { fetchProviderSeriesCandidates } from "./providerSeriesFetcher";

/**
 * Purpose: Load saved manual provider-series overrides before normal provider
 * discovery so explicit user choices are not skipped by first-match provider
 * ordering.
 *
 * @param metadataProviders - Providers selected for this scan.
 * @param localSeries - Local Audiobookshelf series currently being matched.
 * @param options - Scan settings including region and saved manual matches.
 * @param progress - Optional status callback for the scan progress UI.
 * @param providerTraces - Mutable list of provider discovery traces.
 * @returns Manual provider candidates tagged as manual matches.
 */
export async function discoverManualProviderSeriesCandidates(
  metadataProviders: MetadataProvider[],
  localSeries: LocalSeriesEvidence,
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  providerTraces?: ProviderDiscoveryTrace[]
): Promise<ProviderSeriesCandidate[]> {
  const candidates: ProviderSeriesCandidate[] = [];

  for (const metadataProvider of metadataProviders) {
    const manualSeriesAsins = getManualSeriesMatchesForProvider(
      localSeries,
      metadataProvider.id,
      options.region,
      options.manualSeriesMatches
    )
      .map((match) => match.providerSeriesAsin.trim())
      .filter(Boolean);

    if (manualSeriesAsins.length === 0) continue;
    const providerTrace = createProviderDiscoveryTrace(metadataProvider);
    providerTraces?.push(providerTrace);

    const providerCandidates = await fetchProviderSeriesCandidates(
      metadataProvider,
      new Set(manualSeriesAsins),
      options,
      progress,
      "manual provider series",
      providerTrace
    );
    const manualSeriesKeys = buildManualSeriesKeySet(manualSeriesAsins);

    appendUniqueCandidates(
      candidates,
      providerCandidates.map((candidate) =>
        tagProviderCandidate(candidate, metadataProvider, manualSeriesKeys)
      )
    );
  }

  return candidates;
}

/**
 * Purpose: Build lookup keys for manual provider ids while preserving providers
 * whose identifiers are not ASIN-like.
 *
 * @param seriesAsins - Raw saved provider series identifiers.
 * @returns Raw and ASIN-normalised keys for matching returned candidates.
 */
function buildManualSeriesKeySet(seriesAsins: string[]): Set<string> {
  const keys = new Set<string>();

  for (const seriesAsin of seriesAsins) {
    keys.add(seriesAsin);
    keys.add(normaliseIdentifier(seriesAsin));
  }

  return keys;
}
