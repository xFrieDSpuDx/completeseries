import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeriesCandidateReview, SeriesScanReport } from "../../features/scan/seriesScanReport";
import { buildManualSeriesMatch, canSaveManualMatch } from "./manualSeriesMatchBuilder";

afterEach(() => {
  vi.useRealTimers();
});

describe("manualSeriesMatchBuilder", () => {
  it("allows manual matches only for unresolved provider candidates", () => {
    const save = () => undefined;

    expect(canSaveManualMatch(report("unresolved"), candidate(), "uk", save)).toBe(true);
    expect(canSaveManualMatch(report("matched"), candidate(), "uk", save)).toBe(false);
    expect(canSaveManualMatch(report("unresolved"), { ...candidate(), accepted: true }, "uk", save))
      .toBe(false);
    expect(canSaveManualMatch(report("unresolved"), { ...candidate(), providerId: undefined }, "uk", save))
      .toBe(false);
  });

  it("builds a persisted provider-series override from a review candidate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:30:00.000Z"));

    expect(buildManualSeriesMatch(report("unresolved"), candidate(), "uk")).toEqual({
      createdAt: "2026-06-12T10:30:00.000Z",
      localSeriesId: "local-series",
      localSeriesName: "Local Series",
      providerId: "appleBooks",
      providerName: "Apple Books",
      providerSeriesAsin: "apple-books:search:Series",
      providerSeriesName: "Provider Series",
      region: "uk",
    });
  });
});

/**
 * Purpose: Build a series scan report fixture.
 *
 * @param status - Report status to place in the fixture.
 * @returns Series scan report fixture.
 */
function report(status: SeriesScanReport["status"]): SeriesScanReport {
  return {
    localSeries: {
      id: "local-series",
      name: "Local Series",
      books: [],
    },
    attemptedAsins: [],
    lookupAnchors: [],
    providerTraces: [],
    status,
    reason: "test",
    score: 0,
    signals: emptySignals(),
    candidateMatches: [],
    missingBookCount: 0,
    debugDecisions: [],
  };
}

/**
 * Purpose: Build a provider candidate review fixture.
 *
 * @returns Candidate review fixture.
 */
function candidate(): SeriesCandidateReview {
  return {
    seriesAsin: "apple-books:search:Series",
    name: "Provider Series",
    providerId: "appleBooks",
    providerName: "Apple Books",
    bookCount: 3,
    score: 52,
    reason: "test",
    signals: emptySignals(),
    accepted: false,
  };
}

/**
 * Purpose: Build empty match signals for review fixtures.
 *
 * @returns Match signals with every count set to zero.
 */
function emptySignals(): SeriesScanReport["signals"] {
  return {
    asinMatches: 0,
    isbnMatches: 0,
    skuMatches: 0,
    titleMatches: 0,
    subtitleMatches: 0,
    positionMatches: 0,
    authorMatches: 0,
    seriesNameSimilarity: 0,
  };
}
