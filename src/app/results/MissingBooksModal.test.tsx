import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { MissingBooksModal } from "./MissingBooksModal";

describe("MissingBooksModal", () => {
  it("offers a contextual manual owned-book action when the result can be traced", () => {
    const html = renderToStaticMarkup(
      <MissingBooksModal
        group={buildMissingGroup()}
        hiddenItems={[]}
        manualBookMatches={[]}
        manualBookMatchSource={{
          providerId: "audible",
          providerName: "Audible catalogue",
          providerSeriesAsin: "series-discworld",
          providerSeriesName: "Discworld",
          region: "uk",
        }}
        onClose={() => undefined}
        onHideItem={() => undefined}
        onSaveManualBookMatch={() => undefined}
        onUnhideItem={() => undefined}
      />
    );

    expect(html).toContain("Mark book owned");
    expect(html).toContain("Open provider page");
    expect(html).toContain("https://www.audible.co.uk/pd/Monstrous-Regiment-Audiobook/B09MDKHZV5");
  });

  it("shows source series when result groups have been merged", () => {
    const html = renderToStaticMarkup(
      <MissingBooksModal
        group={{
          ...buildMissingGroup(),
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
        }}
        hiddenItems={[]}
        manualBookMatches={[]}
        onClose={() => undefined}
        onHideItem={() => undefined}
        onUnhideItem={() => undefined}
      />
    );

    expect(html).toContain("Merged from 2 series");
    expect(html).toContain("Discworld: Industrial Revolution");
  });
});

/**
 * Purpose: Build a small missing-book result group for modal rendering tests.
 *
 * @returns A missing-book group containing one provider book.
 */
function buildMissingGroup(): MissingBookGroup {
  return {
    seriesName: "Discworld",
    seriesAsin: "series-discworld",
    books: [
      {
        asin: "B09MDKHZV5",
        title: "Monstrous Regiment",
        subtitle: null,
        authors: ["Terry Pratchett"],
        narrators: ["Indira Varma"],
        series: [{ asin: "series-discworld", name: "Discworld", position: "31" }],
        bookFormat: "unabridged",
        releaseDate: "2021-12-16",
        imageUrl: null,
        link: "https://www.audible.co.uk/pd/B09MDKHZV5",
      },
    ],
    diagnosticsByAsin: {},
    debugDecisions: [],
  };
}
