import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import type { ScanResult } from "../../features/scan/runLibraryScan";
import {
  buildResultsViewSummary,
  getManualBookMatchSourceForGroup,
} from "./resultsViewModel";

describe("resultsViewModel", () => {
  it("summarises matched missing, complete, and merged result groups", () => {
    expect(buildResultsViewSummary(buildScanResult())).toEqual({
      completeAfterFiltersCount: 1,
      matchedMissingSeriesCount: 2,
      mergedResultGroupCount: 1,
    });
  });

  it("finds manual book match source details from the matching report", () => {
    const source = getManualBookMatchSourceForGroup(
      buildMissingGroup(),
      buildScanResult(),
      "uk"
    );

    expect(source).toEqual({
      providerId: "audible",
      providerName: "Audible catalogue",
      providerSeriesAsin: "series-provider-1",
      providerSeriesName: "Provider Series",
      region: "uk",
    });
  });

  it("falls back to group metadata when a report cannot be found", () => {
    const source = getManualBookMatchSourceForGroup(
      {
        ...buildMissingGroup(),
        seriesAsin: "missing-report",
        providerId: "googleBooks",
        providerName: "Google Books",
      },
      buildScanResult(),
      "us"
    );

    expect(source).toMatchObject({
      providerId: "googleBooks",
      providerName: "Google Books",
      providerSeriesAsin: "missing-report",
      providerSeriesName: "Visible Series",
      region: "us",
    });
  });
});

function buildScanResult(): ScanResult {
  return {
    librariesScanned: 1,
    localSeriesCount: 3,
    matchedSeriesCount: 3,
    missingBookCount: 2,
    missingGroups: [buildMissingGroup()],
    unresolvedSeries: [],
    seriesReports: [
      {
        localSeries: { id: "local-1", name: "Local Series", books: [] },
        attemptedAsins: [],
        lookupAnchors: [],
        providerTraces: [],
        status: "matched",
        reason: "Matched.",
        score: 100,
        signals: buildSignals(),
        providerSeries: {
          seriesAsin: "series-provider-1",
          name: "Provider Series",
          providerId: "audible",
          providerName: "Audible catalogue",
          bookCount: 2,
        },
        candidateMatches: [],
        missingBookCount: 1,
        debugDecisions: [],
      },
      {
        localSeries: { id: "local-2", name: "Merged Series", books: [] },
        attemptedAsins: [],
        lookupAnchors: [],
        providerTraces: [],
        status: "matched",
        reason: "Matched.",
        score: 100,
        signals: buildSignals(),
        providerSeries: {
          seriesAsin: "series-provider-2",
          name: "Merged Provider Series",
          bookCount: 1,
        },
        candidateMatches: [],
        missingBookCount: 1,
        debugDecisions: [],
      },
      {
        localSeries: { id: "local-3", name: "Complete Series", books: [] },
        attemptedAsins: [],
        lookupAnchors: [],
        providerTraces: [],
        status: "matched",
        reason: "Matched.",
        score: 100,
        signals: buildSignals(),
        providerSeries: {
          seriesAsin: "series-provider-3",
          name: "Complete Provider Series",
          bookCount: 1,
        },
        candidateMatches: [],
        missingBookCount: 0,
        debugDecisions: [],
      },
    ],
  };
}

function buildMissingGroup(): MissingBookGroup {
  return {
    seriesName: "Visible Series",
    seriesAsin: "series-provider-1",
    providerId: "audible",
    providerName: "Audible catalogue",
    books: [],
    diagnosticsByAsin: {},
    debugDecisions: [],
  };
}

function buildSignals() {
  return {
    asinMatches: 1,
    authorMatches: 1,
    isbnMatches: 0,
    positionMatches: 1,
    seriesNameSimilarity: 1,
    skuMatches: 0,
    subtitleMatches: 0,
    titleMatches: 1,
  };
}
