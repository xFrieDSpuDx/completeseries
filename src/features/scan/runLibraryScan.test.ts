import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalBookEvidence, ProviderSeriesBook } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import { enrichLocalBooksWithProviderMetadata } from "./ownedMetadataEnrichment";
import { createScanSession, filterSelectedLibraries, getMetadataLookupAsins } from "./runLibraryScan";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getMetadataLookupAsins", () => {
  it("uses one strong ASIN anchor for quick scans", () => {
    const books = buildBooks(
      ["ASIN5", "ASIN1", "ASIN2", "ASIN3", "ASIN4"],
      ["5", "1", "2", "3", "4"]
    );

    expect(getMetadataLookupAsins(books, "quick")).toEqual(["ASIN1"]);
  });

  it("uses a small balanced ASIN sample by default", () => {
    const books = buildBooks(
      ["ASIN5", "ASIN1", "ASIN2", "ASIN3", "ASIN4"],
      ["5", "1", "2", "3", "4"]
    );

    expect(getMetadataLookupAsins(books, "balanced")).toEqual(["ASIN1", "ASIN5", "ASIN2"]);
  });

  it("uses every usable ASIN for thorough metadata scans", () => {
    const books = buildBooks(
      ["ASIN1", "ASIN2", "Unknown ASIN", "ASIN2", "ASIN3"],
      ["1", "2", "3", "4", "5"]
    );

    expect(getMetadataLookupAsins(books, "thorough")).toEqual(["ASIN1", "ASIN2", "ASIN3"]);
  });
});

describe("enrichLocalBooksWithProviderMetadata", () => {
  it("turns owned ASIN lookups into provider-canonical ownership evidence", async () => {
    const visibleMissingCandidate: ProviderSeriesBook = {
      asin: "B079X2CKLZ",
      title: "Monstrous Regiment",
      subtitle: "Discworld, Book 31",
      authors: ["Terry Pratchett"],
      narrators: ["Stephen Briggs"],
      series: [
        { asin: "B00HRG5ZPU", name: "Discworld", position: "31" },
        { asin: "B07MFMDRW6", name: "Discworld: Industrial Revolution", position: "3" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          product: {
            asin: "B09MDKHZV5",
            title: "Monstrous Regiment",
            subtitle: "(Discworld Novel 31)",
            authors: [{ name: "Terry Pratchett" }],
            narrators: [
              { name: "Katherine Parkinson" },
              { name: "Bill Nighy" },
              { name: "Peter Serafinowicz" },
            ],
            series: [
              {
                asin: "B07MFMDRW6",
                title: "Discworld: Industrial Revolution",
                sequence: "3",
              },
              { asin: "B00HRG5ZPU", title: "Discworld", sequence: "31" },
            ],
            sku: "BK_RHUK_006144UK",
            sku_lite: "BK_RHUK_006144",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await enrichLocalBooksWithProviderMetadata(
      [
        {
          id: "local-monstrous",
          title: "Local Audiobookshelf Title",
          asin: "B09MDKHZV5",
          authors: ["Terry Pratchett"],
          narrators: [],
          seriesNames: ["Discworld"],
          position: parseSeriesPosition("31"),
        },
      ],
      {
        cacheMetadata: false,
        includeSubSeries: true,
        metadataLookupMode: "balanced",
        metadataProviderIds: ["audible"],
        metadataProviderSearchMode: "firstMatch",
        region: "uk",
      },
      undefined,
      [visibleMissingCandidate]
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/audible/uk/1.0/catalog/products/B09MDKHZV5"),
      { headers: { Accept: "application/json" } }
    );
    expect(result).toMatchObject([
      {
        id: "local-monstrous:provider:B09MDKHZV5",
        title: "Monstrous Regiment",
        subtitle: "(Discworld Novel 31)",
        asin: "B09MDKHZV5",
        sku: "BK_RHUK_006144UK",
        skuGroup: "BK_RHUK_006144",
        authors: ["Terry Pratchett"],
        narrators: ["Katherine Parkinson", "Bill Nighy", "Peter Serafinowicz"],
        seriesNames: ["Discworld", "Discworld: Industrial Revolution"],
      },
    ]);
  });
});

describe("filterSelectedLibraries", () => {
  it("keeps all libraries when no library selection has been made", () => {
    const libraries = [
      { id: "library-1", name: "Main" },
      { id: "library-2", name: "Archive" },
    ];

    expect(filterSelectedLibraries(libraries, undefined)).toEqual(libraries);
  });

  it("keeps only selected libraries when ids are provided", () => {
    const libraries = [
      { id: "library-1", name: "Main" },
      { id: "library-2", name: "Archive" },
    ];

    expect(filterSelectedLibraries(libraries, ["library-2"])).toEqual([
      { id: "library-2", name: "Archive" },
    ]);
  });
});

describe("createScanSession", () => {
  it("returns a reusable token session and audiobook libraries", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          libraries: [
            { id: "library-1", name: "Audiobooks", mediaType: "book" },
            { id: "library-2", name: "Podcasts", mediaType: "podcast" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await expect(
      createScanSession({
        serverUrl: "https://abs.example.com",
        mode: "apiKey",
        apiKey: "token",
      })
    ).resolves.toEqual({
      serverUrl: "https://abs.example.com",
      apiKey: "token",
      libraries: [{ id: "library-1", name: "Audiobooks", mediaType: "book" }],
    });
  });

  it("fails before setup when no audiobook libraries are found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ libraries: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      createScanSession({
        serverUrl: "https://abs.example.com",
        mode: "apiKey",
        apiKey: "token",
      })
    ).rejects.toThrow("No audiobook libraries were found.");
  });
});

/**
 * Purpose: Build local book test fixtures with ASIN and series-position values.
 *
 * @param asins - ASIN values to place on the generated books.
 * @param positions - Series-position values to place on the generated books.
 * @returns Local book evidence records for scan helper tests.
 */
function buildBooks(asins: string[], positions: string[]): LocalBookEvidence[] {
  return asins.map((asin, index) => ({
    id: `book-${index}`,
    title: `Book ${index}`,
    asin,
    authors: [],
    narrators: [],
    position: parseSeriesPosition(positions[index]),
  }));
}
