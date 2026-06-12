import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalSeriesEvidence, ProviderSeriesCandidate } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import {
  fetchAudiobookshelfBooksForLibraries,
  fetchAudiobookshelfSeriesForLibraries,
  resolveAuthToken,
} from "../../integrations/audiobookshelf/audiobookshelfClient";
import { discoverProviderSeriesCandidates } from "./metadataDiscovery";
import { runLibraryScan, type ScanOptions } from "./runLibraryScan";

vi.mock("../../integrations/audiobookshelf/audiobookshelfClient", () => ({
  fetchAudiobookshelfBooksForLibraries: vi.fn(),
  fetchAudiobookshelfLibraries: vi.fn(),
  fetchAudiobookshelfSeriesForLibraries: vi.fn(),
  resolveAuthToken: vi.fn(),
}));

vi.mock("./metadataDiscovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./metadataDiscovery")>();
  return {
    ...actual,
    discoverProviderSeriesCandidates: vi.fn(),
  };
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("runLibraryScan orchestration", () => {
  it("scans selected libraries and reports a complete matched series", async () => {
    vi.mocked(resolveAuthToken).mockResolvedValue("resolved-token");
    vi.mocked(fetchAudiobookshelfSeriesForLibraries).mockResolvedValue([localSeries()]);
    vi.mocked(fetchAudiobookshelfBooksForLibraries).mockResolvedValue([]);
    vi.mocked(discoverProviderSeriesCandidates).mockResolvedValue([providerSeries()]);
    const progress = vi.fn();

    const result = await runLibraryScan(scanOptions(), progress);

    expect(fetchAudiobookshelfSeriesForLibraries).toHaveBeenCalledWith(
      { baseUrl: "https://abs.example.com", mode: "apiKey", apiKey: "resolved-token" },
      [{ id: "library-1", name: "Audiobooks" }],
      progress
    );
    expect(discoverProviderSeriesCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ id: "local-series" }),
      expect.objectContaining({ region: "uk" }),
      expect.any(Function),
      ["B123"],
      [],
      []
    );
    expect(result).toMatchObject({
      librariesScanned: 1,
      localSeriesCount: 1,
      matchedSeriesCount: 1,
      missingBookCount: 0,
      missingGroups: [],
      unresolvedSeries: [],
    });
    expect(result.seriesReports).toHaveLength(1);
    expect(progress).toHaveBeenCalledWith(
      "Checking metadata 1 / 1: Local Series — checking 1 provider book"
    );
  });
});

/**
 * Purpose: Build scan options for orchestration tests.
 *
 * @returns Scan options with every missing-book filter explicitly configured.
 */
function scanOptions(): ScanOptions {
  return {
    serverUrl: "https://abs.example.com",
    mode: "apiKey",
    apiKey: "raw-token",
    availableLibraries: [{ id: "library-1", name: "Audiobooks" }],
    selectedLibraryIds: ["library-1"],
    region: "uk",
    includeSubSeries: false,
    metadataLookupMode: "quick",
    metadataProviderIds: ["audible"],
    metadataProviderSearchMode: "firstMatch",
    onlyUnabridged: true,
    ignoreMultiBooks: true,
    ignoreNoPositionBooks: true,
    ignoreSubPositionBooks: false,
    ignoreFutureDateBooks: false,
    ignoreFuturePlaceholders: true,
    ignorePastDateBooks: false,
    ignoreTitleSubtitle: true,
    ignoreSameSeriesPosition: true,
    ignoreTitleSubtitleInMissingArray: false,
    ignoreSameSeriesPositionInMissingArray: false,
    matchNarratorEditions: false,
    cacheMetadata: true,
  };
}

/**
 * Purpose: Build a local series that should match the provider fixture exactly.
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
        asin: "B123",
        authors: ["Known Author"],
        narrators: ["Known Narrator"],
        seriesNames: ["Local Series"],
        position: parseSeriesPosition("1"),
      },
    ],
  };
}

/**
 * Purpose: Build a matching provider series fixture.
 *
 * @returns Provider series candidate fixture.
 */
function providerSeries(): ProviderSeriesCandidate {
  return {
    seriesAsin: "SERIES1",
    name: "Local Series",
    providerId: "audible",
    providerName: "Audible catalogue",
    books: [
      {
        asin: "B123",
        title: "Local Book",
        authors: ["Known Author"],
        narrators: ["Known Narrator"],
        bookFormat: "unabridged",
        isAvailable: true,
        isBuyable: true,
        series: [{ asin: "SERIES1", name: "Local Series", position: "1" }],
      },
    ],
  };
}
