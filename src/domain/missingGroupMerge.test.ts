import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "./missingBookTypes";
import { mergeMissingBookGroups } from "./missingGroupMerge";

describe("mergeMissingBookGroups", () => {
  it("merges repeated series groups and keeps one copy of repeated books", () => {
    const groups = [
      buildGroup("Discworld", "SERIES_ASIN", "BOOK_ASIN", "Monstrous Regiment"),
      buildGroup("Discworld", "SERIES_ASIN", "BOOK_ASIN", "Monstrous Regiment"),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result).toHaveLength(1);
    expect(result[0].books.map((book) => book.title)).toEqual(["Monstrous Regiment"]);
  });

  it("removes repeated books even when they appear under different result groups", () => {
    const groups = [
      buildGroup("Discworld", "DISC_ASIN", "BOOK_ASIN", "Monstrous Regiment"),
      buildGroup("Industrial Revolution", "SUB_ASIN", "BOOK_ASIN", "Monstrous Regiment"),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result).toHaveLength(1);
    expect(result[0].seriesName).toBe("Discworld");
    expect(result[0].mergedFrom?.map((source) => source.seriesName)).toEqual([
      "Discworld",
      "Industrial Revolution",
    ]);
    expect(result[0].mergedFrom?.map((source) => source.missingBookCount)).toEqual([1, 1]);
  });

  it("removes repeated title and author entries even when provider ASINs differ", () => {
    const groups = [
      buildGroup("Discworld", "DISC_ASIN", "FIRST_ASIN", "Monstrous Regiment"),
      buildGroup("Discworld", "DISC_ASIN", "SECOND_ASIN", "Monstrous Regiment"),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result[0].books.map((book) => book.asin)).toEqual(["FIRST_ASIN"]);
  });

  it("removes repeated work entries across overlapping series even when subtitles differ", () => {
    const groups = [
      buildGroup(
        "Discworld",
        "DISC_ASIN",
        "FIRST_ASIN",
        "Monstrous Regiment",
        "Discworld, Book 31"
      ),
      buildGroup(
        "Discworld: Industrial Revolution",
        "SUB_ASIN",
        "SECOND_ASIN",
        "Monstrous Regiment",
        "Industrial Revolution, Book 3"
      ),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result).toHaveLength(1);
    expect(result[0].books.map((book) => book.asin)).toEqual(["FIRST_ASIN"]);
    expect(result[0].mergedFrom?.map((source) => source.seriesName)).toEqual([
      "Discworld",
      "Discworld: Industrial Revolution",
    ]);
  });

  it("does not add merge metadata for repeated copies of the same source series", () => {
    const groups = [
      buildGroup("Discworld", "DISC_ASIN", "FIRST_ASIN", "Monstrous Regiment"),
      buildGroup("Discworld", "DISC_ASIN", "SECOND_ASIN", "Monstrous Regiment"),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result[0].mergedFrom).toBeUndefined();
  });

  it("keeps low-confidence metadata when tentative groups are merged", () => {
    const groups = [
      {
        ...buildGroup("Apple Series", "APPLE_SERIES", "BOOK_ASIN", "Apple Book"),
        confidence: {
          score: 37,
          label: "Low confidence",
          reason: "Candidate scored below the confidence threshold.",
        },
        providerId: "appleBooks",
        providerName: "Apple Books",
      },
      buildGroup("Apple Series", "APPLE_SERIES", "BOOK_ASIN", "Apple Book"),
    ];

    const result = mergeMissingBookGroups(groups);

    expect(result[0]).toMatchObject({
      confidence: { score: 37 },
      providerId: "appleBooks",
      providerName: "Apple Books",
    });
  });
});

/**
 * Purpose: Build a missing-book group fixture for merge tests.
 *
 * @param seriesName - Series name to place on the group.
 * @param seriesAsin - Series ASIN to place on the group.
 * @param bookAsin - Book ASIN to place in the group.
 * @param bookTitle - Book title to place in the group.
 * @returns A missing-book group fixture.
 */
function buildGroup(
  seriesName: string,
  seriesAsin: string,
  bookAsin: string,
  bookTitle: string,
  bookSubtitle: string | null = null
): MissingBookGroup {
  return {
    seriesName,
    seriesAsin,
    diagnosticsByAsin: {
      [bookAsin]: {
        asin: bookAsin,
        title: bookTitle,
        shownBecause: ["test"],
        checks: [],
        providerEvidence: [],
      },
    },
    debugDecisions: [
      {
        action: "show",
        diagnostic: {
          asin: bookAsin,
          title: bookTitle,
          shownBecause: ["test"],
          checks: [],
          providerEvidence: [],
        },
      },
    ],
    books: [
      {
        asin: bookAsin,
        title: bookTitle,
        subtitle: bookSubtitle,
        authors: ["Terry Pratchett"],
        narrators: [],
        series: [{ asin: seriesAsin, name: seriesName, position: "1" }],
      },
    ],
  };
}
