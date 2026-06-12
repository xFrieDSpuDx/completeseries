import { describe, expect, it, vi } from "vitest";
import type { LocalSeriesEvidence, ProviderSeriesCandidate } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";
import type { MetadataLookupAnchor } from "./lookupAnchors";
import type { MetadataDiscoveryOptions } from "./metadataDiscoveryTypes";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";
import { discoverProviderSeriesCandidatesFromProvider } from "./providerSeriesDiscovery";

describe("providerSeriesDiscovery", () => {
  it("discovers provider series through ASIN book lookup", async () => {
    const provider = buildProvider();
    vi.mocked(provider.getBookByAsin).mockResolvedValue({
      asin: "BOOK1",
      title: "Local Book",
      authors: [],
      narrators: [],
      series: [{ asin: "SERIES1", name: "Local Series", position: "1" }],
    });
    vi.mocked(provider.getSeriesBooks).mockResolvedValue(buildProviderSeries("SERIES1"));
    const lookupAnchors: MetadataLookupAnchor[] = [];
    const traces: ProviderDiscoveryTrace[] = [];

    const candidates = await discoverProviderSeriesCandidatesFromProvider(
      provider,
      localSeries(),
      options(),
      undefined,
      ["BOOK1"],
      lookupAnchors,
      traces
    );

    expect(candidates).toMatchObject([
      {
        providerId: "audible",
        providerName: "Audible catalogue",
        seriesAsin: "SERIES1",
      },
    ]);
    expect(lookupAnchors).toEqual([{ kind: "ASIN", value: "BOOK1" }]);
    expect(traces[0].steps).toMatchObject([
      { label: "ASIN book lookup", status: "success", candidateCount: 1 },
      { label: "provider series", status: "success", candidateCount: 1 },
    ]);
  });

  it("skips series search in quick mode after failed ASIN lookup for ASIN providers", async () => {
    const provider = buildProvider();
    vi.mocked(provider.getBookByAsin).mockRejectedValue(new Error("not found"));

    const candidates = await discoverProviderSeriesCandidatesFromProvider(
      provider,
      localSeries(),
      options(),
      undefined,
      ["MISSING"]
    );

    expect(candidates).toEqual([]);
    expect(provider.searchSeries).not.toHaveBeenCalled();
  });

  it("searches non-ASIN providers by series name and ISBN", async () => {
    const provider = buildProvider({ id: "googleBooks", supportsBookLookup: false });
    vi.mocked(provider.searchSeries).mockResolvedValue([buildProviderSeries("google:series")]);
    const lookupAnchors: MetadataLookupAnchor[] = [];
    const traces: ProviderDiscoveryTrace[] = [];

    const candidates = await discoverProviderSeriesCandidatesFromProvider(
      provider,
      localSeries(),
      options(),
      undefined,
      [],
      lookupAnchors,
      traces
    );

    expect(provider.searchSeries).toHaveBeenCalledWith({
      query: "Local Series",
      authorNames: ["Known Author"],
      googleBooksApiKey: undefined,
      knownIsbns: ["9780000000001"],
      knownTitles: ["Local Book"],
      metadataLookupMode: "quick",
      region: "uk",
      cache: false,
    });
    expect(candidates).toMatchObject([{ providerId: "googleBooks", seriesAsin: "google:series" }]);
    expect(lookupAnchors).toEqual([
      { kind: "Series name", value: "Local Series" },
      { kind: "ISBN", value: "9780000000001" },
    ]);
    expect(traces[0].steps).toMatchObject([
      { label: "ASIN book lookup", status: "skipped" },
      { label: "Series search", status: "success", candidateCount: 1 },
    ]);
  });

  it("records provider search failures without throwing", async () => {
    const provider = buildProvider({ id: "openLibrary", supportsBookLookup: false });
    vi.mocked(provider.searchSeries).mockRejectedValue(new Error("Search failed"));
    const traces: ProviderDiscoveryTrace[] = [];

    const candidates = await discoverProviderSeriesCandidatesFromProvider(
      provider,
      localSeries(),
      options(),
      undefined,
      [],
      [],
      traces
    );

    expect(candidates).toEqual([]);
    expect(traces[0].steps).toMatchObject([
      { label: "ASIN book lookup", status: "skipped" },
      { label: "Series search", status: "failed", detail: "Search failed" },
    ]);
  });
});

/**
 * Purpose: Build a metadata provider fixture for provider discovery tests.
 *
 * @param overrides - Optional provider id and capability overrides.
 * @returns Metadata provider fixture.
 */
function buildProvider(
  overrides: { id?: MetadataProvider["id"]; supportsBookLookup?: boolean } = {}
): MetadataProvider {
  return {
    id: overrides.id ?? "audible",
    displayName: "Audible catalogue",
    evidenceLevel: "trusted",
    capabilities: {
      supportsAudiobooks: true,
      supportsAvailability: true,
      supportsBookLookup: overrides.supportsBookLookup ?? true,
      supportsCovers: true,
      supportsRegion: true,
      supportsSeriesLookup: true,
      supportsSeriesSearch: true,
    },
    getBookByAsin: vi.fn(),
    getSeriesBooks: vi.fn(),
    searchSeries: vi.fn(),
  };
}

/**
 * Purpose: Build a local series with useful search evidence.
 *
 * @returns Local series evidence fixture.
 */
function localSeries(): LocalSeriesEvidence {
  return {
    id: "local-series",
    name: "Local Series",
    books: [
      {
        id: "local-book",
        title: "Local Book",
        isbn: "978-0-0000-0000-1",
        authors: ["Known Author"],
        narrators: [],
        position: parseSeriesPosition("1"),
      },
    ],
  };
}

/**
 * Purpose: Build metadata discovery options for provider discovery tests.
 *
 * @returns Metadata discovery options fixture.
 */
function options(): MetadataDiscoveryOptions {
  return {
    cacheMetadata: false,
    includeSubSeries: false,
    metadataLookupMode: "quick",
    metadataProviderSearchMode: "firstMatch",
    region: "uk",
  };
}

/**
 * Purpose: Build a provider series candidate fixture.
 *
 * @param seriesAsin - Provider series identifier.
 * @returns Provider series candidate fixture.
 */
function buildProviderSeries(seriesAsin: string): ProviderSeriesCandidate {
  return {
    seriesAsin,
    name: "Provider Series",
    books: [],
  };
}
