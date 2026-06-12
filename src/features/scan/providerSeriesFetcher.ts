import type { ProviderSeriesCandidate } from "../../domain/audiobook";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import {
  appendProviderDiscoveryStep,
  getCandidateTraceStatus,
  type ProviderDiscoveryTrace,
} from "./providerDiscoveryTrace";

/**
 * Purpose: Load full provider series records from a set of discovered provider
 * series identifiers.
 *
 * @param metadataProvider - Metadata provider that discovered the series
 * identifiers.
 * @param candidateSeriesAsins - Provider series identifiers discovered from
 * local book metadata or manual overrides.
 * @param options - Scan settings that control region and provider cache usage.
 * @param progress - Optional callback for fine-grained provider lookup status.
 * @param progressLabel - Human-readable label for scan progress text.
 * @param providerTrace - Trace receiving the provider-series load outcome.
 * @returns Full provider series candidates ready for scoring.
 */
export async function fetchProviderSeriesCandidates(
  metadataProvider: MetadataProvider,
  candidateSeriesAsins: Set<string>,
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  progressLabel = "provider series",
  providerTrace?: ProviderDiscoveryTrace
): Promise<ProviderSeriesCandidate[]> {
  const candidates: ProviderSeriesCandidate[] = [];
  const seriesAsins = [...candidateSeriesAsins];

  for (let seriesIndex = 0; seriesIndex < seriesAsins.length; seriesIndex += 1) {
    const seriesAsin = seriesAsins[seriesIndex];
    progress?.(`loading ${progressLabel} ${seriesIndex + 1} / ${seriesAsins.length}`);

    try {
      const providerSeries = await metadataProvider.getSeriesBooks({
        seriesAsin,
        region: options.region,
        cache: options.cacheMetadata,
        googleBooksApiKey: options.googleBooksApiKey,
      });
      if (providerSeries) candidates.push(providerSeries);
    } catch {
      continue;
    }
  }

  if (seriesAsins.length > 0) {
    appendProviderDiscoveryStep(providerTrace, {
      candidateCount: candidates.length,
      detail: `${candidates.length} full provider series record${candidates.length === 1 ? "" : "s"} loaded`,
      label: progressLabel,
      requestCount: seriesAsins.length,
      status: getCandidateTraceStatus(candidates.length),
    });
  }

  return candidates;
}
