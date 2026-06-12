import { describe, expect, it } from "vitest";
import type { LocalSeriesEvidence, SeriesMatch } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import { buildUnresolvedSeriesReport } from "./seriesScanReport";

describe("buildUnresolvedSeriesReport", () => {
  it("keeps scored provider candidates for review", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-kingkiller",
      name: "Kingkiller Chronicle",
      books: [
        {
          id: "book-1",
          title: "The Name of the Wind",
          asin: "B002UZMLXM",
          authors: ["Patrick Rothfuss"],
          narrators: [],
          position: parseSeriesPosition("1"),
        },
      ],
    };
    const candidateMatch: SeriesMatch = {
      status: "unresolved",
      localSeries,
      providerSeries: {
        seriesAsin: "series-kingkiller",
        name: "Kingkiller Chronicle",
        providerId: "audible",
        providerName: "Audible catalogue",
        evidenceLevel: "trusted",
        books: [
          {
            asin: "B002UZMLXM",
            title: "The Name of the Wind",
            authors: ["Patrick Rothfuss"],
            narrators: [],
            series: [{ asin: "series-kingkiller", name: "Kingkiller Chronicle", position: "1" }],
          },
        ],
      },
      score: 52,
      reason: "Candidate scored below the confidence threshold.",
      signals: {
        asinMatches: 1,
        isbnMatches: 0,
        skuMatches: 0,
        titleMatches: 1,
        subtitleMatches: 0,
        positionMatches: 1,
        authorMatches: 1,
        seriesNameSimilarity: 1,
      },
    };

    const report = buildUnresolvedSeriesReport(candidateMatch, ["B002UZMLXM"], [candidateMatch]);

    expect(report.lookupAnchors).toEqual([{ kind: "ASIN", value: "B002UZMLXM" }]);
    expect(report.providerTraces).toEqual([]);
    expect(report.candidateMatches).toEqual([
      {
        seriesAsin: "series-kingkiller",
        name: "Kingkiller Chronicle",
        providerId: "audible",
        providerName: "Audible catalogue",
        evidenceLevel: "trusted",
        bookCount: 1,
        score: 52,
        reason: "Candidate scored below the confidence threshold.",
        signals: candidateMatch.signals,
        accepted: false,
      },
    ]);
  });
});
