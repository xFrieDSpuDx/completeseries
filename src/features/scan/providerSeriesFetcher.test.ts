import { describe, expect, it, vi } from "vitest";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import { fetchProviderSeriesCandidates } from "./providerSeriesFetcher";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";

describe("providerSeriesFetcher", () => {
  it("loads provider series records and records trace counts", async () => {
    const provider = buildProvider({
      SERIES1: buildSeries("SERIES1"),
      SERIES2: buildSeries("SERIES2"),
    });
    const trace = buildTrace();

    const candidates = await fetchProviderSeriesCandidates(
      provider,
      new Set(["SERIES1", "SERIES2"]),
      options(),
      undefined,
      "provider series",
      trace
    );

    expect(candidates).toHaveLength(2);
    expect(provider.getSeriesBooks).toHaveBeenCalledTimes(2);
    expect(trace.steps).toMatchObject([
      {
        candidateCount: 2,
        label: "provider series",
        requestCount: 2,
        status: "success",
      },
    ]);
  });

  it("continues when one provider series request fails", async () => {
    const provider = buildProvider({ SERIES2: buildSeries("SERIES2") });
    vi.mocked(provider.getSeriesBooks).mockRejectedValueOnce(new Error("Provider failed"));

    const candidates = await fetchProviderSeriesCandidates(
      provider,
      new Set(["SERIES1", "SERIES2"]),
      options()
    );

    expect(candidates).toMatchObject([{ seriesAsin: "SERIES2" }]);
  });
});

/**
 * Purpose: Build a metadata provider fixture for fetcher tests.
 *
 * @param seriesByAsin - Series records keyed by provider series identifier.
 * @returns Metadata provider fixture.
 */
function buildProvider(
  seriesByAsin: Record<string, Awaited<ReturnType<MetadataProvider["getSeriesBooks"]>>>
): MetadataProvider {
  return {
    id: "audible",
    displayName: "Audible catalogue",
    evidenceLevel: "trusted",
    capabilities: {
      supportsAudiobooks: true,
      supportsAvailability: true,
      supportsBookLookup: true,
      supportsCovers: true,
      supportsRegion: true,
      supportsSeriesLookup: true,
      supportsSeriesSearch: true,
    },
    getBookByAsin: vi.fn(),
    getSeriesBooks: vi.fn(async ({ seriesAsin }) => seriesByAsin[seriesAsin] ?? null),
    searchSeries: vi.fn(),
  };
}

/**
 * Purpose: Build a provider series fixture.
 *
 * @param seriesAsin - Provider series identifier.
 * @returns Provider series candidate fixture.
 */
function buildSeries(seriesAsin: string) {
  return {
    seriesAsin,
    name: `Series ${seriesAsin}`,
    books: [],
  };
}

/**
 * Purpose: Build metadata discovery options for fetcher tests.
 *
 * @returns Metadata discovery options fixture.
 */
function options() {
  return {
    cacheMetadata: false,
    includeSubSeries: false,
    metadataLookupMode: "quick" as const,
    metadataProviderSearchMode: "firstMatch" as const,
    region: "uk" as const,
  };
}

/**
 * Purpose: Build an empty provider trace fixture.
 *
 * @returns Provider discovery trace fixture.
 */
function buildTrace(): ProviderDiscoveryTrace {
  return {
    evidenceLevel: "trusted",
    providerId: "audible",
    providerName: "Audible catalogue",
    steps: [],
  };
}
