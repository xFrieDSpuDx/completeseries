import { describe, expect, it, vi } from "vitest";
import type { LocalSeriesEvidence } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import { discoverManualProviderSeriesCandidates } from "./manualProviderSeriesDiscovery";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";

describe("manualProviderSeriesDiscovery", () => {
  it("loads matching manual provider series before normal discovery", async () => {
    const provider = buildProvider();
    const traces: ProviderDiscoveryTrace[] = [];

    const candidates = await discoverManualProviderSeriesCandidates(
      [provider],
      localSeries(),
      options(),
      undefined,
      traces
    );

    expect(provider.getSeriesBooks).toHaveBeenCalledWith({
      seriesAsin: "apple-books:search:Manual%20Series",
      region: "uk",
      cache: false,
      googleBooksApiKey: undefined,
    });
    expect(candidates).toMatchObject([
      {
        manualMatch: true,
        providerId: "appleBooks",
        providerName: "Apple Books",
        seriesAsin: "apple-books:search:Manual%20Series",
      },
    ]);
    expect(traces).toMatchObject([
      {
        providerId: "appleBooks",
        steps: [{ label: "manual provider series", status: "success" }],
      },
    ]);
  });

  it("ignores manual matches for other regions", async () => {
    const provider = buildProvider();

    const candidates = await discoverManualProviderSeriesCandidates(
      [provider],
      localSeries(),
      { ...options(), region: "us" }
    );

    expect(candidates).toEqual([]);
    expect(provider.getSeriesBooks).not.toHaveBeenCalled();
  });
});

/**
 * Purpose: Build a local series fixture for manual discovery tests.
 *
 * @returns Local series evidence fixture.
 */
function localSeries(): LocalSeriesEvidence {
  return {
    id: "local-series",
    name: "Manual Series",
    books: [
      {
        id: "local-book",
        title: "Manual Book",
        authors: [],
        narrators: [],
        position: parseSeriesPosition("1"),
      },
    ],
  };
}

/**
 * Purpose: Build metadata discovery options with one manual series override.
 *
 * @returns Metadata discovery options fixture.
 */
function options(): MetadataDiscoveryOptions {
  return {
    cacheMetadata: false,
    includeSubSeries: false,
    manualSeriesMatches: [
      {
        createdAt: "2026-06-12T00:00:00.000Z",
        localSeriesId: "local-series",
        localSeriesName: "Manual Series",
        providerId: "appleBooks",
        providerName: "Apple Books",
        providerSeriesAsin: "apple-books:search:Manual%20Series",
        providerSeriesName: "Manual Series",
        region: "uk",
      },
    ],
    metadataLookupMode: "quick",
    metadataProviderIds: ["appleBooks"],
    metadataProviderSearchMode: "firstMatch",
    region: "uk",
  };
}

/**
 * Purpose: Build an Apple Books provider fixture.
 *
 * @returns Metadata provider fixture.
 */
function buildProvider(): MetadataProvider {
  return {
    id: "appleBooks",
    displayName: "Apple Books",
    evidenceLevel: "weak",
    capabilities: {
      supportsAudiobooks: true,
      supportsAvailability: false,
      supportsBookLookup: false,
      supportsCovers: true,
      supportsRegion: true,
      supportsSeriesLookup: true,
      supportsSeriesSearch: true,
    },
    getBookByAsin: vi.fn(),
    getSeriesBooks: vi.fn(async ({ seriesAsin }) => ({
      seriesAsin,
      name: "Manual Series",
      books: [],
    })),
    searchSeries: vi.fn(),
  };
}
