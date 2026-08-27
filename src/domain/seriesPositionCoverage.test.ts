import { describe, expect, it } from "vitest";
import { parseSeriesPosition } from "./normalise";
import { seriesPositionCovers } from "./seriesPositionCoverage";

describe("seriesPositionCovers", () => {
  it("treats common whole-number omnibus positions as covering individual books", () => {
    expect(covers("1-8", "2")).toBe(true);
    expect(covers("1 - 8", "8")).toBe(true);
    expect(covers("1 \u2013 8", "4")).toBe(true);
    expect(covers("#1-#8", "3")).toBe(true);
    expect(covers("Books 1-8", "5")).toBe(true);
    expect(covers("Book 1 to Book 8", "6")).toBe(true);
    expect(covers("1 through 8", "7")).toBe(true);
    expect(covers("1 thru 8", "7")).toBe(true);
    expect(covers("1 & 2", "2")).toBe(true);
    expect(covers("1 and 2", "2")).toBe(true);
  });

  it("does not treat decimal positions as covered by an omnibus range", () => {
    expect(covers("1-8", "3.5")).toBe(false);
    expect(covers("1.5-2.5", "2")).toBe(false);
  });

  it("does not let one individual book cover a provider omnibus", () => {
    expect(covers("2", "1-2")).toBe(false);
  });
});

/**
 * Purpose: Compare raw position text using the production parser.
 *
 * @param localPosition - Local Audiobookshelf series position.
 * @param providerPosition - Provider series position.
 * @returns `true` when the local position covers the provider position.
 */
function covers(localPosition: string, providerPosition: string): boolean {
  return seriesPositionCovers(
    parseSeriesPosition(localPosition),
    parseSeriesPosition(providerPosition)
  );
}
