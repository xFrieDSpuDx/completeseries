import { describe, expect, it } from "vitest";
import type { ProviderSeriesBook } from "../../domain/audiobook";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { buildVisibleMissingGroups } from "./visibleResults";

describe("buildVisibleMissingGroups", () => {
  it("sorts visible series alphabetically by default", () => {
    const groups = [
      buildGroup("Zeta", "SERIES_Z", [buildBook("Zeta Book", "Z_BOOK", "1")]),
      buildGroup("Alpha", "SERIES_A", [buildBook("Alpha Book", "A_BOOK", "1")]),
    ];

    const result = buildVisibleMissingGroups(groups, [], [], "uk", false);

    expect(result.map((group) => group.seriesName)).toEqual(["Alpha", "Zeta"]);
  });

  it("sorts visible series in reverse alphabetical order when requested", () => {
    const groups = [
      buildGroup("Alpha", "SERIES_A", [buildBook("Alpha Book", "A_BOOK", "1")]),
      buildGroup("Zeta", "SERIES_Z", [buildBook("Zeta Book", "Z_BOOK", "1")]),
    ];

    const result = buildVisibleMissingGroups(groups, [], [], "uk", false, "seriesDesc");

    expect(result.map((group) => group.seriesName)).toEqual(["Zeta", "Alpha"]);
  });

  it("can preserve original scan order when requested", () => {
    const groups = [
      buildGroup("Zeta", "SERIES_Z", [buildBook("Zeta Book", "Z_BOOK", "1")]),
      buildGroup("Alpha", "SERIES_A", [buildBook("Alpha Book", "A_BOOK", "1")]),
    ];

    const result = buildVisibleMissingGroups(groups, [], [], "uk", false, "scanOrder");

    expect(result.map((group) => group.seriesName)).toEqual(["Zeta", "Alpha"]);
  });

  it("sorts by visible missing-book count when requested", () => {
    const groups = [
      buildGroup("One Missing", "SERIES_ONE", [buildBook("Book One", "ONE", "1")]),
      buildGroup("Two Missing", "SERIES_TWO", [
        buildBook("Book Two", "TWO", "2"),
        buildBook("Book Three", "THREE", "3"),
      ]),
    ];

    const result = buildVisibleMissingGroups(groups, [], [], "uk", false, "missingDesc");

    expect(result.map((group) => group.seriesName)).toEqual(["Two Missing", "One Missing"]);
  });

  it("sorts by primary missing-book author when requested", () => {
    const groups = [
      buildGroup("Series B", "SERIES_B", [
        buildBook("Book B", "BOOK_B", "1", ["Zadie Smith"]),
      ]),
      buildGroup("Series A", "SERIES_A", [
        buildBook("Book A", "BOOK_A", "1", ["Agatha Christie"]),
      ]),
    ];

    const ascending = buildVisibleMissingGroups(groups, [], [], "uk", false, "authorAsc");
    const descending = buildVisibleMissingGroups(groups, [], [], "uk", false, "authorDesc");

    expect(ascending.map((group) => group.seriesName)).toEqual(["Series A", "Series B"]);
    expect(descending.map((group) => group.seriesName)).toEqual(["Series B", "Series A"]);
  });

  it("sorts books inside each visible group by matched series position", () => {
    const groups = [
      buildGroup("Discworld", "DISC_ASIN", [
        buildBook("Book Three", "BOOK_3", "3"),
        buildBook("Book One", "BOOK_1", "1"),
      ]),
    ];

    const result = buildVisibleMissingGroups(groups, [], [], "uk", false);

    expect(result[0].books.map((book) => book.title)).toEqual(["Book One", "Book Three"]);
  });

  it("filters out books manually marked as owned", () => {
    const groups = [
      buildGroup("Discworld", "DISC_ASIN", [
        buildBook("Book One", "BOOK_1", "1"),
        buildBook("Book Two", "BOOK_2", "2"),
      ]),
    ];

    const result = buildVisibleMissingGroups(
      groups,
      [],
      [
        {
          createdAt: "2026-05-27T00:00:00.000Z",
          providerId: "audible",
          region: "uk",
          seriesAsin: "DISC_ASIN",
          seriesName: "Discworld",
          asin: "BOOK_1",
          title: "Book One",
          authors: [],
        },
      ],
      "uk",
      false
    );

    expect(result[0].books.map((book) => book.title)).toEqual(["Book Two"]);
  });

  it("uses the group provider when filtering manual owned-book matches", () => {
    const groups = [
      {
        ...buildGroup("Apple Series", "APPLE_SERIES", [buildBook("Apple Book", "APPLE_BOOK", "1")]),
        providerId: "appleBooks",
        providerName: "Apple Books",
      },
    ];

    const result = buildVisibleMissingGroups(
      groups,
      [],
      [
        {
          createdAt: "2026-06-12T00:00:00.000Z",
          providerId: "appleBooks",
          region: "uk",
          seriesAsin: "APPLE_SERIES",
          seriesName: "Apple Series",
          asin: "APPLE_BOOK",
          title: "Apple Book",
          authors: [],
        },
      ],
      "uk",
      false
    );

    expect(result).toEqual([]);
  });
});

/**
 * Purpose: Build a missing-book group fixture for visible-result sorting tests.
 *
 * @param seriesName - Series name to place on the group.
 * @param seriesAsin - Series ASIN to place on the group.
 * @param books - Provider books to attach to the group.
 * @returns A missing-book group fixture.
 */
function buildGroup(
  seriesName: string,
  seriesAsin: string,
  books: ProviderSeriesBook[]
): MissingBookGroup {
  return {
    seriesName,
    seriesAsin,
    books,
    diagnosticsByAsin: {},
    debugDecisions: [],
  };
}

/**
 * Purpose: Build a provider book fixture for visible-result sorting tests.
 *
 * @param title - Book title to place on the fixture.
 * @param asin - Book ASIN to place on the fixture.
 * @param position - Series position to place on the fixture.
 * @returns A provider book fixture.
 */
function buildBook(
  title: string,
  asin: string,
  position: string,
  authors: string[] = []
): ProviderSeriesBook {
  return {
    asin,
    title,
    authors,
    narrators: [],
    series: [{ asin: "DISC_ASIN", name: "Discworld", position }],
  };
}
