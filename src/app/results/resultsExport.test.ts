import { describe, expect, it } from "vitest";
import type { ScanResult } from "../../features/scan/runLibraryScan";
import { buildMissingBooksCsv } from "./resultsExport";

describe("buildMissingBooksCsv", () => {
  it("exports visible missing books with diagnostics", () => {
    const result: ScanResult = {
      librariesScanned: 1,
      localSeriesCount: 1,
      matchedSeriesCount: 1,
      missingBookCount: 1,
      unresolvedSeries: [],
      seriesReports: [],
      missingGroups: [
        {
          seriesName: "Discworld",
          seriesAsin: "SERIES_ASIN",
          mergedFrom: [
            {
              seriesName: "Discworld",
              seriesAsin: "SERIES_ASIN",
              providerName: "Audible catalogue",
              missingBookCount: 1,
            },
            {
              seriesName: "Discworld: Industrial Revolution",
              seriesAsin: "SUB_SERIES_ASIN",
              providerName: "Audible catalogue",
              missingBookCount: 1,
            },
          ],
          diagnosticsByAsin: {
            BOOK_ASIN: {
              asin: "BOOK_ASIN",
              title: "Monstrous Regiment",
              shownBecause: ["No matching ASIN, SKU, or SKU group was found locally."],
              checks: [],
              providerEvidence: [],
            },
          },
          debugDecisions: [],
          books: [
            {
              asin: "BOOK_ASIN",
              title: "Monstrous Regiment",
              subtitle: "Discworld, Book 31",
              authors: ["Terry Pratchett"],
              narrators: ["Stephen Briggs"],
              series: [{ asin: "SERIES_ASIN", name: "Discworld", position: "31" }],
              region: "uk",
              releaseDate: "2007-01-01",
              link: "https://audible.co.uk/pd/BOOK_ASIN",
            },
          ],
        },
      ],
    };

    const csv = buildMissingBooksCsv(result);

    expect(csv).toContain("Monstrous Regiment");
    expect(csv).toContain("No matching ASIN");
    expect(csv).toContain("Discworld #31");
    expect(csv).toContain("Discworld: Industrial Revolution");
  });
});
