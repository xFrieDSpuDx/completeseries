import { describe, expect, it } from "vitest";
import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  SeriesMatch,
} from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import {
  buildLowConfidenceMissingGroup,
  buildMissingGroup,
} from "./missingGroupBuilder";
import type { ScanOptions } from "./runLibraryScan";

describe("missingGroupBuilder", () => {
  it("builds missing groups using scan-level filter options", () => {
    const match = buildSeriesMatch(100);
    const group = buildMissingGroup(match, match.localSeries.books, buildScanOptions());

    expect(group.books.map((book) => book.title)).toEqual(["Missing Book"]);
    expect(group.diagnosticsByAsin.MISSING_ASIN.shownBecause).toContain(
      "No matching ASIN, SKU, or SKU group was found locally."
    );
  });

  it("surfaces useful low-confidence candidates with confidence metadata", () => {
    const lowConfidenceGroup = buildLowConfidenceMissingGroup(
      [buildSeriesMatch(52)],
      [],
      buildScanOptions()
    );

    expect(lowConfidenceGroup).toMatchObject({
      confidence: {
        label: "Low confidence",
        score: 52,
      },
      seriesName: "Known Series",
    });
  });

  it("does not surface very weak low-confidence candidates", () => {
    expect(
      buildLowConfidenceMissingGroup([buildSeriesMatch(12)], [], buildScanOptions())
    ).toBeNull();
  });
});

function buildSeriesMatch(score: number): SeriesMatch {
  const localSeries = buildLocalSeries([
    buildLocalBook({
      asin: "OWNED_ASIN",
      position: "1",
      title: "Owned Book",
    }),
  ]);
  const providerSeries = buildProviderSeries([
    buildProviderBook({
      asin: "OWNED_ASIN",
      position: "1",
      title: "Owned Book",
    }),
    buildProviderBook({
      asin: "MISSING_ASIN",
      position: "2",
      title: "Missing Book",
    }),
  ]);

  return {
    localSeries,
    providerSeries,
    reason: "Candidate evidence for test.",
    score,
    signals: {
      asinMatches: 1,
      authorMatches: 1,
      isbnMatches: 0,
      positionMatches: 1,
      seriesNameSimilarity: 1,
      skuMatches: 0,
      subtitleMatches: 0,
      titleMatches: 1,
    },
    status: score >= 80 ? "matched" : "unresolved",
  };
}

function buildScanOptions(): ScanOptions {
  return {
    serverUrl: "https://abs.example.test",
    mode: "apiKey",
    apiKey: "test-key",
    region: "uk",
    includeSubSeries: false,
    metadataLookupMode: "balanced",
    metadataProviderIds: ["audible"],
    metadataProviderSearchMode: "firstMatch",
    googleBooksApiKey: "",
    onlyUnabridged: true,
    ignoreMultiBooks: false,
    ignoreNoPositionBooks: false,
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

function buildLocalSeries(books: LocalBookEvidence[]): LocalSeriesEvidence {
  return {
    id: "local-series",
    name: "Known Series",
    books,
  };
}

function buildProviderSeries(books: ProviderSeriesBook[]): ProviderSeriesCandidate {
  return {
    seriesAsin: "SERIES_ASIN",
    name: "Known Series",
    providerId: "audible",
    providerName: "Audible catalogue",
    region: "uk",
    books,
  };
}

function buildLocalBook(input: {
  asin: string;
  position: string;
  title: string;
}): LocalBookEvidence {
  return {
    id: input.asin,
    title: input.title,
    asin: input.asin,
    authors: ["Example Author"],
    narrators: [],
    position: parseSeriesPosition(input.position),
  };
}

function buildProviderBook(input: {
  asin: string;
  position: string;
  title: string;
}): ProviderSeriesBook {
  return {
    asin: input.asin,
    title: input.title,
    authors: ["Example Author"],
    narrators: [],
    bookFormat: "unabridged",
    region: "uk",
    isAvailable: true,
    hasChildren: false,
    childRelationshipTypes: [],
    series: [{ asin: "SERIES_ASIN", name: "Known Series", position: input.position }],
  };
}
