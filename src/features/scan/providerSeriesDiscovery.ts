import type {
  LocalSeriesEvidence,
  ProviderSeriesCandidate,
} from "../../domain/audiobook";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import { appendLookupAnchor, type MetadataLookupAnchor } from "./lookupAnchors";
import {
  getKnownAuthorNames,
  getKnownIsbns,
  selectProviderSeriesEntries,
  tagProviderCandidate,
} from "./metadataCandidateHelpers";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import {
  getMetadataLookupAsins,
} from "./metadataLookupAsins";
import {
  appendProviderDiscoveryStep,
  createProviderDiscoveryTrace,
  getCandidateTraceStatus,
  type ProviderDiscoveryTrace,
} from "./providerDiscoveryTrace";
import { fetchProviderSeriesCandidates } from "./providerSeriesFetcher";

/**
 * Purpose: Find possible provider series for a local series using one metadata
 * provider.
 *
 * @param metadataProvider - Metadata provider to query, such as Audible or a
 * future catalogue adapter.
 * @param localSeries - The Audiobookshelf series and local books currently
 * being matched.
 * @param options - Scan settings that control region, subseries handling,
 * provider cache usage, and lookup depth.
 * @param progress - Optional callback for fine-grained provider lookup status.
 * @param lookupAsins - ASIN anchors already selected for the current lookup
 * mode.
 * @param lookupAnchors - Mutable list of lookup anchors captured for review.
 * @param providerTraces - Mutable list of provider discovery traces.
 * @returns Candidate provider series from the selected provider.
 */
export async function discoverProviderSeriesCandidatesFromProvider(
  metadataProvider: MetadataProvider,
  localSeries: LocalSeriesEvidence,
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  lookupAsins = getMetadataLookupAsins(localSeries.books, options.metadataLookupMode),
  lookupAnchors?: MetadataLookupAnchor[],
  providerTraces?: ProviderDiscoveryTrace[]
): Promise<ProviderSeriesCandidate[]> {
  const candidateSeriesAsins = new Set<string>();
  const providerTrace = createProviderDiscoveryTrace(metadataProvider);
  providerTraces?.push(providerTrace);

  if (metadataProvider.capabilities.supportsBookLookup) {
    await collectSeriesIdentifiersFromBookLookup(
      metadataProvider,
      localSeries,
      options,
      lookupAsins,
      candidateSeriesAsins,
      progress,
      lookupAnchors
    );
    appendProviderDiscoveryStep(providerTrace, {
      candidateCount: candidateSeriesAsins.size,
      detail:
        lookupAsins.length > 0
          ? `${candidateSeriesAsins.size} provider series identifiers found`
          : "No local ASIN anchors were available",
      label: "ASIN book lookup",
      requestCount: lookupAsins.length,
      status: getCandidateTraceStatus(candidateSeriesAsins.size),
    });
  } else {
    appendProviderDiscoveryStep(providerTrace, {
      detail: "This provider does not use Audible ASIN identifiers.",
      label: "ASIN book lookup",
      status: "skipped",
    });
  }

  const candidates = await fetchProviderSeriesCandidates(
    metadataProvider,
    candidateSeriesAsins,
    options,
    progress,
    "provider series",
    providerTrace
  );

  if (candidates.length > 0) {
    return candidates.map((candidate) => tagProviderCandidate(candidate, metadataProvider));
  }

  return searchProviderSeriesCandidates(
    metadataProvider,
    localSeries,
    options,
    progress,
    lookupAnchors,
    providerTrace
  );
}

/**
 * Purpose: Look up local ASIN anchors and collect provider series identifiers
 * from the returned book metadata.
 *
 * @param metadataProvider - Provider that supports book lookup.
 * @param localSeries - Local series being matched.
 * @param options - Scan settings for region and cache behaviour.
 * @param lookupAsins - Local ASIN anchors selected for this lookup depth.
 * @param candidateSeriesAsins - Mutable set receiving discovered provider
 * series identifiers.
 * @param progress - Optional status callback.
 * @param lookupAnchors - Mutable list of lookup anchors captured for review.
 * @returns Nothing. The candidate identifier set is updated in place.
 */
async function collectSeriesIdentifiersFromBookLookup(
  metadataProvider: MetadataProvider,
  localSeries: LocalSeriesEvidence,
  options: MetadataDiscoveryOptions,
  lookupAsins: string[],
  candidateSeriesAsins: Set<string>,
  progress?: (message: string) => void,
  lookupAnchors?: MetadataLookupAnchor[]
): Promise<void> {
  if (lookupAsins.length === 0) progress?.("no usable ASIN anchors");

  for (let asinIndex = 0; asinIndex < lookupAsins.length; asinIndex += 1) {
    const asin = lookupAsins[asinIndex];
    appendLookupAnchor(lookupAnchors, "ASIN", asin);
    progress?.(`checking ASIN ${asinIndex + 1} / ${lookupAsins.length}`);

    try {
      const providerBook = await metadataProvider.getBookByAsin({
        asin,
        region: options.region,
        cache: options.cacheMetadata,
        googleBooksApiKey: options.googleBooksApiKey,
      });

      const selectedSeriesEntries = selectProviderSeriesEntries(
        providerBook?.series ?? [],
        localSeries,
        options.includeSubSeries
      );

      for (const seriesEntry of selectedSeriesEntries) {
        if (seriesEntry.asin) candidateSeriesAsins.add(seriesEntry.asin);
      }
    } catch {
      progress?.(`ASIN ${asinIndex + 1} / ${lookupAsins.length} failed`);
    }
  }
}

/**
 * Purpose: Search the provider by series name, known titles, author names, and
 * ISBN anchors when identifier lookup did not find a full provider series.
 *
 * @param metadataProvider - Provider to search.
 * @param localSeries - Local series being matched.
 * @param options - Scan settings including lookup depth and provider cache.
 * @param progress - Optional status callback.
 * @param lookupAnchors - Mutable list of lookup anchors captured for review.
 * @param providerTrace - Trace receiving the search step outcome.
 * @returns Provider series candidates found by search.
 */
async function searchProviderSeriesCandidates(
  metadataProvider: MetadataProvider,
  localSeries: LocalSeriesEvidence,
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  lookupAnchors?: MetadataLookupAnchor[],
  providerTrace?: ProviderDiscoveryTrace
): Promise<ProviderSeriesCandidate[]> {
  const knownIsbns = getKnownIsbns(localSeries.books);
  if (!shouldSearchAfterLookup(metadataProvider, options)) {
    appendProviderDiscoveryStep(providerTrace, {
      detail: metadataProvider.capabilities.supportsSeriesSearch
        ? "Quick lookup mode only searches providers that cannot use ASIN anchors."
        : "This provider does not support series search.",
      label: "Series search",
      status: "skipped",
    });
    return [];
  }

  try {
    progress?.(
      knownIsbns.length > 0 ? "searching by series name and ISBN" : "searching by series name"
    );
    appendLookupAnchor(lookupAnchors, "Series name", localSeries.name);
    for (const isbn of knownIsbns) appendLookupAnchor(lookupAnchors, "ISBN", isbn);

    const searchCandidates = await metadataProvider.searchSeries({
      query: localSeries.name,
      authorNames: getKnownAuthorNames(localSeries.books),
      googleBooksApiKey: options.googleBooksApiKey,
      knownIsbns,
      knownTitles: localSeries.books.map((book) => book.title),
      metadataLookupMode: options.metadataLookupMode,
      region: options.region,
      cache: options.cacheMetadata,
    });

    appendProviderDiscoveryStep(providerTrace, {
      candidateCount: searchCandidates.length,
      detail:
        knownIsbns.length > 0
          ? `Searched by series name with ${knownIsbns.length} ISBN anchor${knownIsbns.length === 1 ? "" : "s"}`
          : "Searched by series name",
      label: "Series search",
      requestCount: 1 + knownIsbns.length,
      status: getCandidateTraceStatus(searchCandidates.length),
    });

    return searchCandidates.map((candidate) => tagProviderCandidate(candidate, metadataProvider));
  } catch (error) {
    appendProviderDiscoveryStep(providerTrace, {
      detail: getProviderErrorMessage(error),
      label: "Series search",
      status: "failed",
    });
    return [];
  }
}

/**
 * Purpose: Decide whether provider search should run after identifier lookup
 * has failed to find a provider series.
 *
 * @param metadataProvider - Provider currently being queried.
 * @param options - Scan settings including lookup depth.
 * @returns `true` when search should be used for this provider and scan mode.
 */
function shouldSearchAfterLookup(
  metadataProvider: MetadataProvider,
  options: MetadataDiscoveryOptions
): boolean {
  if (!metadataProvider.capabilities.supportsSeriesSearch) return false;
  if (options.metadataLookupMode !== "quick") return true;

  return !metadataProvider.capabilities.supportsBookLookup;
}

/**
 * Purpose: Convert provider exceptions into compact Review/Debug trace text.
 *
 * @param error - Unknown error thrown by a metadata provider.
 * @returns Human-readable error detail without stack traces.
 */
function getProviderErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Provider search failed before returning candidates.";
}
