import { describe, expect, it } from "vitest";
import type { LocalBookEvidence, ProviderSeriesBook } from "./audiobook";
import { parseSeriesPosition } from "./normalise";
import {
  areSubtitlesCompatible,
  buildTitleEvidence,
  hasCompatibleTitleEvidence,
} from "./titleEvidence";

describe("titleEvidence", () => {
  it("builds title and subtitle variants from common provider title formats", () => {
    expect([...buildTitleEvidence("The Sign of Four: Sherlock Holmes", "A Mystery")]).toEqual([
      "the sign of four sherlock holmes",
      "the sign of four sherlock holmes a mystery",
      "the sign of four",
      "the sign of four a mystery",
    ]);
  });

  it("treats missing or contained subtitles as compatible evidence", () => {
    expect(areSubtitlesCompatible("", "the full subtitle")).toBe(true);
    expect(areSubtitlesCompatible("full subtitle", "subtitle")).toBe(true);
    expect(areSubtitlesCompatible("different", "subtitle")).toBe(false);
  });

  it("matches local and provider books with safe title-prefix evidence", () => {
    const providerBook = buildProviderBook("Monstrous Regiment: Discworld, Book 31");
    const localBook = buildLocalBook("Monstrous Regiment");

    expect(hasCompatibleTitleEvidence(providerBook, localBook)).toBe(true);
  });

  it("allows one tiny spelling difference without matching different titles", () => {
    expect(
      hasCompatibleTitleEvidence(
        buildProviderBook("Colour of Magic"),
        buildLocalBook("Color of Magic")
      )
    ).toBe(true);
    expect(
      hasCompatibleTitleEvidence(
        buildProviderBook("The Long Earth"),
        buildLocalBook("The Long War")
      )
    ).toBe(false);
  });
});

/**
 * Purpose: Build a minimal provider book for title evidence tests.
 *
 * @param title - Provider title to place in the fixture.
 * @returns Provider book fixture.
 */
function buildProviderBook(title: string): ProviderSeriesBook {
  return {
    asin: `provider-${title}`,
    title,
    authors: [],
    narrators: [],
    series: [],
  };
}

/**
 * Purpose: Build a minimal local book for title evidence tests.
 *
 * @param title - Local title to place in the fixture.
 * @returns Local book fixture.
 */
function buildLocalBook(title: string): LocalBookEvidence {
  return {
    id: `local-${title}`,
    title,
    authors: [],
    narrators: [],
    position: parseSeriesPosition(null),
  };
}
