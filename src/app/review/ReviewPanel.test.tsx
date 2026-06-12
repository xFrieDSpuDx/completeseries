import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseSeriesPosition } from "../../domain/normalise";
import type { ScanResult } from "../../features/scan/runLibraryScan";
import { getVisibleUnresolvedReports, ReviewPanel } from "./ReviewPanel";

describe("ReviewPanel", () => {
  it("renders unresolved evidence and scored provider candidates", () => {
    const result: ScanResult = {
      librariesScanned: 1,
      localSeriesCount: 1,
      matchedSeriesCount: 0,
      missingBookCount: 0,
      missingGroups: [],
      unresolvedSeries: [],
      seriesReports: [
        {
          localSeries: {
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
          },
          attemptedAsins: ["B002UZMLXM"],
          lookupAnchors: [{ kind: "ASIN", value: "B002UZMLXM" }],
          providerTraces: [
            {
              evidenceLevel: "trusted",
              providerId: "audible",
              providerName: "Audible catalogue",
              steps: [
                {
                  candidateCount: 1,
                  label: "ASIN book lookup",
                  requestCount: 1,
                  status: "success",
                },
              ],
            },
          ],
          status: "unresolved",
          reason: "No provider series met the confidence threshold.",
          score: 52,
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
          candidateMatches: [
            {
              seriesAsin: "series-kingkiller",
              name: "Kingkiller Chronicle",
              providerId: "audible",
              providerName: "Audible catalogue",
              evidenceLevel: "trusted",
              bookCount: 11,
              score: 52,
              reason: "Candidate scored below the confidence threshold.",
              accepted: false,
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
            },
          ],
          missingBookCount: 0,
          debugDecisions: [],
        },
      ],
    };

    const html = renderToStaticMarkup(<ReviewPanel result={result} />);

    expect(html).toContain("Kingkiller Chronicle");
    expect(html).toContain("Match evidence for Kingkiller Chronicle");
    expect(html).toContain("Provider series candidates");
    expect(html).toContain("Provider checks");
    expect(html).toContain("ASIN book lookup");
    expect(html).toContain("Audible catalogue");
    expect(html).toContain("B002UZMLXM");
    expect(html).toContain("1 lookup anchor used");
  });

  it("offers manual matching when a candidate, region, and save callback are available", () => {
    const result: ScanResult = {
      librariesScanned: 1,
      localSeriesCount: 1,
      matchedSeriesCount: 0,
      missingBookCount: 0,
      missingGroups: [],
      unresolvedSeries: [],
      seriesReports: [
        {
          localSeries: {
            id: "local-bridei",
            name: "Bridei",
            books: [],
          },
          attemptedAsins: ["B000BRIDEI"],
          lookupAnchors: [{ kind: "ASIN", value: "B000BRIDEI" }],
          providerTraces: [],
          status: "unresolved",
          reason: "No provider series met the confidence threshold.",
          score: 40,
          signals: {
            asinMatches: 0,
            isbnMatches: 0,
            skuMatches: 0,
            titleMatches: 0,
            subtitleMatches: 0,
            positionMatches: 0,
            authorMatches: 0,
            seriesNameSimilarity: 0.8,
          },
          candidateMatches: [
            {
              seriesAsin: "series-bridei",
              name: "Bridei",
              providerId: "audible",
              providerName: "Audible catalogue",
              evidenceLevel: "trusted",
              bookCount: 3,
              score: 40,
              reason: "Candidate scored below the confidence threshold.",
              accepted: false,
              signals: {
                asinMatches: 0,
                isbnMatches: 0,
                skuMatches: 0,
                titleMatches: 0,
                subtitleMatches: 0,
                positionMatches: 0,
                authorMatches: 0,
                seriesNameSimilarity: 0.8,
              },
            },
          ],
          missingBookCount: 0,
          debugDecisions: [],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <ReviewPanel onSaveManualSeriesMatch={() => undefined} region="uk" result={result} />
    );

    expect(html).toContain("Use this provider series");
  });

  it("removes manually handled unresolved reports from the visible review list", () => {
    const unresolvedReport = buildUnresolvedReport("local-bridei", "Bridei");
    const visibleReports = getVisibleUnresolvedReports(
      [unresolvedReport],
      new Set(["local-bridei"])
    );

    expect(visibleReports).toEqual([]);
  });

});

/**
 * Purpose: Build the smallest unresolved report needed by ReviewPanel tests.
 *
 * @param localSeriesId - Local series id for the report.
 * @param localSeriesName - Local series display name.
 * @returns An unresolved review report with one provider candidate.
 */
function buildUnresolvedReport(localSeriesId: string, localSeriesName: string) {
  return {
    localSeries: {
      id: localSeriesId,
      name: localSeriesName,
      books: [],
    },
    attemptedAsins: [],
    lookupAnchors: [],
    providerTraces: [],
    status: "unresolved" as const,
    reason: "No provider series met the confidence threshold.",
    score: 0,
    signals: {
      asinMatches: 0,
      isbnMatches: 0,
      skuMatches: 0,
      titleMatches: 0,
      subtitleMatches: 0,
      positionMatches: 0,
      authorMatches: 0,
      seriesNameSimilarity: 0,
    },
    candidateMatches: [],
    missingBookCount: 0,
    debugDecisions: [],
  };
}
