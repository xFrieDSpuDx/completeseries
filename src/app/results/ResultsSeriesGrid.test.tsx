import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { ResultsSeriesGrid } from "./ResultsSeriesGrid";

describe("ResultsSeriesGrid", () => {
  it("shows a confidence badge on low-confidence result cards", () => {
    const html = renderToStaticMarkup(
      <ResultsSeriesGrid
        groups={[
          {
            ...buildGroup(),
            confidence: {
              score: 37,
              label: "Low confidence",
              reason: "Candidate scored below the confidence threshold.",
            },
            isHidden: false,
          },
        ]}
        hiddenItems={[]}
        onHideItem={() => undefined}
        onSelectGroup={() => undefined}
        onUnhideItem={() => undefined}
      />
    );

    expect(html).toContain("series-tile--low-confidence");
    expect(html).toContain("Confidence 37%");
  });

  it("shows when a result card contains merged provider series", () => {
    const html = renderToStaticMarkup(
      <ResultsSeriesGrid
        groups={[
          {
            ...buildGroup(),
            mergedFrom: [
              {
                seriesName: "Discworld",
                seriesAsin: "series-discworld",
                providerName: "Audible catalogue",
                missingBookCount: 1,
              },
              {
                seriesName: "Discworld: Industrial Revolution",
                seriesAsin: "series-industrial-revolution",
                providerName: "Audible catalogue",
                missingBookCount: 1,
              },
            ],
            isHidden: false,
          },
        ]}
        hiddenItems={[]}
        onHideItem={() => undefined}
        onSelectGroup={() => undefined}
        onUnhideItem={() => undefined}
      />
    );

    expect(html).toContain("Merged 2 series");
    expect(html).toContain("Discworld: Industrial Revolution");
  });
});

/**
 * Purpose: Build a result group with one missing book for grid rendering tests.
 *
 * @returns Missing-book group fixture.
 */
function buildGroup(): MissingBookGroup {
  return {
    seriesName: "Apple Review Series",
    seriesAsin: "apple-books:search:Apple%20Review%20Series",
    providerId: "appleBooks",
    providerName: "Apple Books",
    books: [
      {
        asin: "apple-books:track:123",
        title: "Potential Missing Book",
        authors: ["Known Author"],
        narrators: [],
        series: [
          {
            asin: "apple-books:search:Apple%20Review%20Series",
            name: "Apple Review Series",
            position: "2",
          },
        ],
      },
    ],
    diagnosticsByAsin: {},
    debugDecisions: [],
  };
}
