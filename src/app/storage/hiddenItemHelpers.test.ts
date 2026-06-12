import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import {
  hiddenBookMatchesBook,
  hiddenItemsMatch,
  hiddenSeriesMatchesGroup,
  isPresent,
  normaliseHiddenItem,
  sortHiddenItems,
} from "./hiddenItemHelpers";
import type { HiddenItem } from "./hiddenItemsStore";

describe("hiddenItemHelpers", () => {
  it("normalises current and legacy hidden item shapes", () => {
    expect(normaliseHiddenItem({ type: "series", series: " Discworld " })).toMatchObject({
      type: "series",
      seriesName: "Discworld",
    });
    expect(normaliseHiddenItem({ type: "book", seriesName: "Discworld" })).toBeNull();
  });

  it("sorts hidden items by series, type, and title", () => {
    expect(sortHiddenItems([hiddenBook("Mort"), hiddenSeries("Discworld"), hiddenBook("Guards")]))
      .toMatchObject([
        { type: "book", title: "Guards" },
        { type: "book", title: "Mort" },
        { type: "series", seriesName: "Discworld" },
      ]);
  });

  it("matches hidden records by strong identifiers before title fallback", () => {
    expect(hiddenItemsMatch(hiddenBook("Original", "BOOK1"), hiddenBook("Renamed", "BOOK1"))).toBe(
      true
    );
    expect(hiddenItemsMatch(hiddenSeries("Discworld", "SERIES1"), hiddenSeries("Other", "SERIES2")))
      .toBe(false);
  });

  it("matches hidden series and books against result groups", () => {
    const group = buildGroup();

    expect(hiddenSeriesMatchesGroup(hiddenSeries("Other", "SERIES1"), group)).toBe(true);
    expect(hiddenBookMatchesBook(hiddenBook("Other", "BOOK1"), group, group.books[0])).toBe(true);
    expect(hiddenBookMatchesBook(hiddenBook("Mort"), group, group.books[0])).toBe(false);
  });

  it("narrows nullable values with isPresent", () => {
    expect(["one", null, undefined, "two"].filter(isPresent)).toEqual(["one", "two"]);
  });
});

/**
 * Purpose: Build a hidden book fixture.
 *
 * @param title - Book title to hide.
 * @param asin - Optional provider book identifier.
 * @returns Hidden book fixture.
 */
function hiddenBook(title: string, asin?: string): HiddenItem {
  return {
    type: "book",
    seriesName: "Discworld",
    title,
    asin,
    hiddenAt: "2026-01-01T00:00:00.000Z",
  };
}

/**
 * Purpose: Build a hidden series fixture.
 *
 * @param seriesName - Series name to hide.
 * @param seriesAsin - Optional provider series identifier.
 * @returns Hidden series fixture.
 */
function hiddenSeries(seriesName: string, seriesAsin?: string): HiddenItem {
  return {
    type: "series",
    seriesName,
    seriesAsin,
    hiddenAt: "2026-01-01T00:00:00.000Z",
  };
}

/**
 * Purpose: Build a missing-book group for hidden item helper tests.
 *
 * @returns Missing-book group fixture.
 */
function buildGroup(): MissingBookGroup {
  return {
    seriesName: "Discworld",
    seriesAsin: "SERIES1",
    diagnosticsByAsin: {},
    debugDecisions: [],
    books: [
      {
        asin: "BOOK1",
        title: "Monstrous Regiment",
        authors: [],
        narrators: [],
        series: [{ asin: "SERIES1", name: "Discworld", position: "31" }],
      },
    ],
  };
}
