import { describe, expect, it } from "vitest";
import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "./audiobook";
import { findMissingBooksForSeries } from "./missingBooks";
import { parseSeriesPosition } from "./normalise";

describe("findMissingBooksForSeries position coverage", () => {
  it("does not report individual provider books covered by a local omnibus range", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Magic Tree House Collection: Books 1-8",
        asin: "LOCAL_OMNIBUS_ASIN",
        authors: ["Mary Pope Osborne"],
        position: "1-8",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Dinosaurs Before Dark",
        asin: "BOOK_1_ASIN",
        authors: ["Mary Pope Osborne"],
        position: "1",
      }),
      buildProviderBook({
        title: "The Knight at Dawn",
        asin: "BOOK_2_ASIN",
        authors: ["Mary Pope Osborne"],
        position: "2",
      }),
      buildProviderBook({
        title: "Midnight on the Moon",
        asin: "BOOK_8_ASIN",
        authors: ["Mary Pope Osborne"],
        position: "8",
      }),
      buildProviderBook({
        title: "Dolphins at Daybreak",
        asin: "BOOK_9_ASIN",
        authors: ["Mary Pope Osborne"],
        position: "9",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.title)).toEqual(["Dolphins at Daybreak"]);
    expect(
      result.debugDecisions.find((decision) => decision.diagnostic.asin === "BOOK_2_ASIN")
        ?.diagnostic.checks
    ).toContain(
      "Skipped because provider position 2 is covered by local omnibus position 1-8."
    );
  });

  it("does not use local omnibus ranges to hide decimal provider positions", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Collection One",
        asin: "LOCAL_OMNIBUS_ASIN",
        authors: ["Example Author"],
        position: "1-8",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Side Story",
        asin: "SIDE_STORY_ASIN",
        authors: ["Example Author"],
        position: "3.5",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.title)).toEqual(["Side Story"]);
  });

  it("does not report distinctive same-title editions when subseries positions differ", () => {
    const ownedElsewhere = buildLocalBook({
      title: "Monstrous Regiment",
      subtitle: "(Discworld Novel 31)",
      asin: "LOCAL_ASIN",
      authors: ["Terry Pratchett"],
      position: "31",
      seriesNames: ["Discworld", "Discworld: Industrial Revolution"],
    });
    const providerSeries = {
      ...buildProviderSeries([
        {
          ...buildProviderBook({
            title: "Monstrous Regiment",
            subtitle: "Discworld: Industrial Revolution, Book 3",
            asin: "PROVIDER_ASIN",
            authors: ["Sir Terry Pratchett"],
            position: "3",
          }),
          series: [
            {
              asin: "SERIES_ASIN",
              name: "Discworld: Industrial Revolution",
              position: "3",
            },
          ],
        },
      ]),
      name: "Discworld: Industrial Revolution",
    };

    const result = findMissingBooksForSeries(
      buildLocalSeries([]),
      providerSeries,
      [ownedElsewhere],
      {
        ...defaultMissingBookOptions(),
      }
    );

    expect(result.books).toEqual([]);
  });

  it("does not hide same-title books in the same series when positions conflict", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Mark of the Fool",
        asin: "BOOK_1_ASIN",
        authors: ["J. M. Clarke"],
        position: "1",
        seriesNames: ["Mark of the Fool"],
      }),
    ]);
    const providerSeries = buildProviderSeries([
      {
        ...buildProviderBook({
          title: "Mark of the Fool",
          subtitle: "Book 2",
          asin: "BOOK_2_ASIN",
          authors: ["J. M. Clarke"],
          position: "2",
        }),
        series: [{ asin: "SERIES_ASIN", name: "Mark of the Fool", position: "2" }],
      },
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.asin)).toEqual(["BOOK_2_ASIN"]);
  });

  it("detects title-prefix conflicts for series-title books", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Mark of the Fool: Book 1",
        asin: "BOOK_1_ASIN",
        authors: ["J. M. Clarke"],
        position: "1",
        seriesNames: ["Mark of the Fool"],
      }),
    ]);
    const providerSeries = buildProviderSeries([
      {
        ...buildProviderBook({
          title: "Mark of the Fool: Book 2",
          asin: "BOOK_2_ASIN",
          authors: ["J. M. Clarke"],
          position: "2",
        }),
        series: [{ asin: "SERIES_ASIN", name: "Mark of the Fool", position: "2" }],
      },
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.asin)).toEqual(["BOOK_2_ASIN"]);
  });

  it("filters provider multi-book positions with common range wording", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Books One to Eight",
        asin: "TO_RANGE_ASIN",
        authors: ["Example Author"],
        position: "Book 1 to Book 8",
      }),
      buildProviderBook({
        title: "Books Nine and Ten",
        asin: "AND_RANGE_ASIN",
        authors: ["Example Author"],
        position: "9 and 10",
      }),
      buildProviderBook({
        title: "Book Eleven",
        asin: "SINGLE_ASIN",
        authors: ["Example Author"],
        position: "11",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreMultiBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Book Eleven"]);
  });
});

/**
 * Purpose: Build the default missing-book options used by position coverage
 * tests.
 *
 * @returns Missing-book options that match the V2 form defaults.
 */
function defaultMissingBookOptions() {
  return {
    region: "uk" as const,
    onlyUnabridged: true,
    ignoreMultiBooks: false,
    ignoreNoPositionBooks: false,
    ignoreSubPositionBooks: false,
    ignoreFutureDateBooks: false,
    ignoreFuturePlaceholders: true,
    ignorePastDateBooks: false,
    ignoreTitleSubtitle: true,
    ignoreSameSeriesPosition: true,
    ignoreTitleSubtitleInMissingArray: false,
    ignoreSameSeriesPositionInMissingArray: false,
    matchNarratorEditions: false,
  };
}

/**
 * Purpose: Build local series test fixtures for position coverage checks.
 *
 * @param books - Local books to attach to the fixture series.
 * @returns A local series evidence record.
 */
function buildLocalSeries(books: LocalBookEvidence[]): LocalSeriesEvidence {
  return {
    id: "local-series",
    name: "Known Series",
    books,
  };
}

/**
 * Purpose: Build provider series test fixtures for position coverage checks.
 *
 * @param books - Provider books to attach to the fixture series.
 * @returns A provider series candidate record.
 */
function buildProviderSeries(books: ProviderSeriesBook[]): ProviderSeriesCandidate {
  return {
    seriesAsin: "SERIES_ASIN",
    name: "Known Series",
    region: "uk",
    books,
  };
}

/**
 * Purpose: Build local book fixtures with the fields used by ownership checks.
 *
 * @param input - Local book field overrides for the fixture.
 * @returns A local book evidence record.
 */
function buildLocalBook(input: {
  title: string;
  subtitle?: string;
  asin: string;
  authors: string[];
  narrators?: string[];
  position: string;
  seriesNames?: string[];
}): LocalBookEvidence {
  return {
    id: input.asin,
    title: input.title,
    subtitle: input.subtitle,
    asin: input.asin,
    authors: input.authors,
    narrators: input.narrators ?? [],
    seriesNames: input.seriesNames,
    position: parseSeriesPosition(input.position),
  };
}

/**
 * Purpose: Build provider book fixtures with the fields used by ownership
 * checks.
 *
 * @param input - Provider book field overrides for the fixture.
 * @returns A provider series book record.
 */
function buildProviderBook(input: {
  title: string;
  subtitle?: string;
  asin: string;
  authors: string[];
  narrators?: string[];
  position: string | number | null;
  bookFormat?: ProviderSeriesBook["bookFormat"];
  region?: string;
  isAvailable?: boolean;
}): ProviderSeriesBook {
  return {
    asin: input.asin,
    title: input.title,
    subtitle: input.subtitle,
    authors: input.authors,
    narrators: input.narrators ?? [],
    bookFormat: input.bookFormat === undefined ? "unabridged" : input.bookFormat,
    region: input.region ?? "uk",
    isAvailable: input.isAvailable ?? true,
    series: [{ asin: "SERIES_ASIN", name: "Known Series", position: input.position }],
  };
}
