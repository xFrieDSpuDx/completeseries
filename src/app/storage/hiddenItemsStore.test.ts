import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import {
  createHiddenBookItem,
  createHiddenSeriesItem,
  isHiddenBook,
  isHiddenSeries,
  mergeHiddenItems,
  parseHiddenItemsPayload,
  upsertHiddenItem,
  type HiddenItem,
} from "./hiddenItemsStore";

describe("hiddenItemsStore", () => {
  it("imports V1 hidden item records", () => {
    const importedItems = parseHiddenItemsPayload(
      JSON.stringify({
        hiddenItems: [
          { type: "series", series: "Discworld", asin: "SERIES1" },
          { type: "book", series: "Discworld", title: "Monstrous Regiment", asin: "BOOK1" },
        ],
      })
    );

    expect(importedItems).toMatchObject([
      { type: "book", seriesName: "Discworld", title: "Monstrous Regiment", asin: "BOOK1" },
      { type: "series", seriesName: "Discworld", asin: "SERIES1" },
    ]);
  });

  it("deduplicates hidden books by ASIN", () => {
    const firstItem: HiddenItem = {
      type: "book",
      seriesName: "Discworld",
      title: "Monstrous Regiment",
      asin: "BOOK1",
      hiddenAt: "2026-01-01T00:00:00.000Z",
    };
    const secondItem = { ...firstItem, title: "Different title" };

    expect(upsertHiddenItem([firstItem], secondItem)).toHaveLength(1);
  });

  it("matches hidden series and books against result groups", () => {
    const group = buildGroup();
    const hiddenSeries = createHiddenSeriesItem(group);
    const hiddenBook = createHiddenBookItem(group, group.books[0]);

    expect(isHiddenSeries([hiddenSeries], group)).toBe(true);
    expect(isHiddenBook([hiddenBook], group, group.books[0])).toBe(true);
    expect(isHiddenBook([], group, group.books[0])).toBe(false);
  });

  it("merges imported hidden items without duplicates", () => {
    const group = buildGroup();
    const hiddenBook = createHiddenBookItem(group, group.books[0]);

    expect(mergeHiddenItems([hiddenBook], [hiddenBook])).toHaveLength(1);
  });
});

/**
 * Purpose: Build a small missing-book group for hidden item tests.
 *
 * @returns A missing-book group with one provider book.
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
