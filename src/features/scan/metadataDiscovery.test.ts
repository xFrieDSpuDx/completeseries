import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalSeriesEvidence } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import type { MetadataLookupAnchor } from "./lookupAnchors";
import { discoverProviderSeriesCandidates } from "./metadataDiscovery";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("discoverProviderSeriesCandidates", () => {
  it("loads manual Apple provider matches before normal first-match discovery", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              artistName: "Known Author",
              trackId: 12345,
              trackName: "Manual Book: Manual Series, Book 2",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const candidates = await discoverProviderSeriesCandidates(buildLocalSeries(), {
      cacheMetadata: false,
      includeSubSeries: false,
      manualSeriesMatches: [
        {
          createdAt: "2026-06-11T00:00:00.000Z",
          localSeriesId: "local-manual",
          localSeriesName: "Manual Series",
          providerId: "appleBooks",
          providerName: "Apple Books",
          providerSeriesAsin: "apple-books:search:Manual%20Series",
          providerSeriesName: "Manual Series",
          region: "uk",
        },
      ],
      metadataLookupMode: "balanced",
      metadataProviderIds: ["audible", "appleBooks"],
      metadataProviderSearchMode: "firstMatch",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://itunes.apple.com/search?");
    expect(candidates).toMatchObject([
      {
        manualMatch: true,
        providerId: "appleBooks",
        seriesAsin: "apple-books:search:Manual%20Series",
      },
    ]);
  });

  it("uses Apple search evidence in quick mode when ISBN metadata exists", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        buildJsonResponse({
          results: [
            {
              artistName: "Known Author",
              collectionId: 98765,
              collectionName: "Quick ISBN Book",
            },
          ],
        })
      )
      .mockResolvedValueOnce(buildJsonResponse({ results: [] }));

    const lookupAnchors: MetadataLookupAnchor[] = [];
    const candidates = await discoverProviderSeriesCandidates(
      {
        id: "local-quick-isbn",
        name: "Quick ISBN Series",
        books: [
          {
            id: "local-book",
            title: "Quick ISBN Book",
            isbn: "978-0-0000-0000-1",
            authors: [],
            narrators: [],
            position: parseSeriesPosition("1"),
          },
        ],
      },
      {
        cacheMetadata: false,
        includeSubSeries: false,
        metadataLookupMode: "quick",
        metadataProviderIds: ["appleBooks"],
        metadataProviderSearchMode: "firstMatch",
        region: "uk",
      },
      undefined,
      undefined,
      lookupAnchors
    );

    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://itunes.apple.com/lookup?");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("isbn=9780000000001");
    expect(lookupAnchors).toEqual([
      { kind: "Series name", value: "Quick ISBN Series" },
      { kind: "ISBN", value: "9780000000001" },
    ]);
    expect(candidates).toMatchObject([
      {
        providerId: "appleBooks",
        books: [
          {
            asin: "apple-books:track:98765",
            isbn: "9780000000001",
            title: "Quick ISBN Book",
          },
        ],
      },
    ]);
  });

  it("captures Google Books quota and API key failures in provider traces", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse(
        {
          error: {
            code: 429,
            message: "Quota exceeded for quota metric 'Queries'.",
            status: "RESOURCE_EXHAUSTED",
          },
        },
        429
      )
    );

    const providerTraces: ProviderDiscoveryTrace[] = [];
    const candidates = await discoverProviderSeriesCandidates(
      {
        id: "local-google",
        name: "Google Only Series",
        books: [
          {
            id: "local-book",
            title: "Known Book",
            authors: ["Known Author"],
            narrators: [],
            position: parseSeriesPosition("1"),
          },
        ],
      },
      {
        cacheMetadata: false,
        includeSubSeries: false,
        metadataLookupMode: "quick",
        metadataProviderIds: ["googleBooks"],
        metadataProviderSearchMode: "firstMatch",
        region: "uk",
      },
      undefined,
      undefined,
      [],
      providerTraces
    );

    expect(candidates).toEqual([]);
    expect(providerTraces).toMatchObject([
      {
        providerId: "googleBooks",
        steps: [
          { label: "ASIN book lookup", status: "skipped" },
          {
            label: "Series search",
            status: "failed",
            detail: expect.stringContaining("Enter a Google Books API key in the scan filters"),
          },
        ],
      },
    ]);
  });
});

/**
 * Purpose: Build a local series fixture with Audible ASIN evidence, proving the
 * manual Apple override wins before normal Audible lookup.
 *
 * @returns Local series evidence for metadata discovery tests.
 */
function buildLocalSeries(): LocalSeriesEvidence {
  return {
    id: "local-manual",
    name: "Manual Series",
    books: [
      {
        id: "local-book",
        title: "Manual Book",
        asin: "B0AUDIBLE",
        authors: ["Known Author"],
        narrators: [],
        position: parseSeriesPosition("1"),
      },
    ],
  };
}

/**
 * Purpose: Build a fresh JSON response for each mocked provider request.
 *
 * @param payload - Response body to serialise.
 * @returns Fetch response containing JSON.
 */
function buildJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
