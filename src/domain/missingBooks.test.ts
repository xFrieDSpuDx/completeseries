import { describe, expect, it } from "vitest";
import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "./audiobook";
import { parseSeriesPosition } from "./normalise";
import { findMissingBooksForSeries } from "./missingBooks";

describe("findMissingBooksForSeries", () => {
  it("does not report books already owned under a different ASIN when title evidence matches", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "For the Emperor",
        asin: "LOCAL_REGION_ASIN",
        authors: ["Sandy Mitchell"],
        position: "1",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "For the Emperor",
        asin: "AUDIBLE_UK_ASIN",
        authors: ["Sandy Mitchell"],
        position: "1",
      }),
      buildProviderBook({
        title: "Caves of Ice",
        asin: "MISSING_ASIN",
        authors: ["Sandy Mitchell"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.title)).toEqual(["Caves of Ice"]);
  });

  it("explains why a visible missing book survived ownership checks", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Owned Book",
        asin: "OWNED_ASIN",
        authors: ["Example Author"],
        position: "1",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Missing Book",
        asin: "MISSING_ASIN",
        authors: ["Example Author"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });
    const diagnostic = result.diagnosticsByAsin.MISSING_ASIN;

    expect(diagnostic.shownBecause).toContain(
      "No matching ASIN, SKU, or SKU group was found locally."
    );
    expect(diagnostic.shownBecause).toContain(
      "No local title/subtitle evidence matched this provider book."
    );
  });

  it("does not report books already owned when the matched series position is present locally", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Local Metadata Title",
        asin: "LOCAL_REGION_ASIN",
        authors: [],
        position: "3",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Provider Metadata Title",
        asin: "AUDIBLE_UK_ASIN",
        authors: [],
        position: "3",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not report books already owned elsewhere in the library when title evidence matches", () => {
    const localSeries = buildLocalSeries([]);
    const ownedElsewhere = buildLocalBook({
      title: "The Wee Free Men",
      asin: "LOCAL_ASIN",
      authors: ["Terry Pratchett"],
      position: "30",
    });
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Wee Free Men",
        asin: "AUDIBLE_UK_ASIN",
        authors: ["Terry Pratchett"],
        position: "1",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [ownedElsewhere], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not report owned books when Audiobookshelf stores subtitle text inside the title", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "The Wee Free Men: Discworld, Book 30",
        asin: "LOCAL_ASIN",
        authors: ["Terry Pratchett"],
        position: "30",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Wee Free Men",
        subtitle: "Discworld, Book 30",
        asin: "PROVIDER_ASIN",
        authors: ["Terry Pratchett"],
        position: "30",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not report owned books when provider stores subtitle text inside the title", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "A Hat Full of Sky",
        subtitle: "Discworld, Book 32",
        asin: "LOCAL_ASIN",
        authors: ["Terry Pratchett"],
        position: "32",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "A Hat Full of Sky: Discworld, Book 32",
        asin: "PROVIDER_ASIN",
        authors: ["Terry Pratchett"],
        position: "32",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not report owned books when exact title and series evidence match but subtitles differ", () => {
    const ownedElsewhere = buildLocalBook({
      title: "Monstrous Regiment",
      subtitle: "Discworld, Book 31",
      asin: "LOCAL_ASIN",
      authors: [],
      position: "31",
      seriesNames: ["Known Series"],
    });
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Monstrous Regiment",
        subtitle: "Discworld: Industrial Revolution, Book 3",
        asin: "PROVIDER_ASIN",
        authors: [],
        position: "31",
      }),
    ]);

    const result = findMissingBooksForSeries(buildLocalSeries([]), providerSeries, [ownedElsewhere], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not treat narrator differences as missing by default", () => {
    const ownedElsewhere = buildLocalBook({
      title: "The Cuckoo's Calling",
      asin: "LOCAL_ASIN",
      authors: ["Robert Galbraith"],
      narrators: ["Narrator One"],
      position: "1",
      seriesNames: ["Cormoran Strike"],
    });
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Cuckoo's Calling",
        asin: "PROVIDER_ASIN",
        authors: ["Robert Galbraith"],
        narrators: ["Narrator Two"],
        position: "1",
      }),
    ]);

    const result = findMissingBooksForSeries(buildLocalSeries([]), providerSeries, [ownedElsewhere], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("can report same-title books as missing when narrator-sensitive matching is enabled", () => {
    const ownedElsewhere = buildLocalBook({
      title: "The Cuckoo's Calling",
      asin: "LOCAL_ASIN",
      authors: ["Robert Galbraith"],
      narrators: ["Narrator One"],
      position: "1",
      seriesNames: ["Cormoran Strike"],
    });
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Cuckoo's Calling",
        asin: "PROVIDER_ASIN",
        authors: ["Robert Galbraith"],
        narrators: ["Narrator Two"],
        position: "1",
      }),
    ]);

    const result = findMissingBooksForSeries(buildLocalSeries([]), providerSeries, [ownedElsewhere], {
      ...defaultMissingBookOptions(),
      ignoreSameSeriesPosition: false,
      matchNarratorEditions: true,
    });

    expect(result.books.map((book) => book.asin)).toEqual(["PROVIDER_ASIN"]);
    expect(result.diagnosticsByAsin.PROVIDER_ASIN.shownBecause).toContain(
      "Narrator-sensitive matching found a local title, but the narrator did not match."
    );
  });


  it("does not report provider books from a different selected region", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "US Marketplace Book",
        asin: "US_ASIN",
        authors: ["Example Author"],
        position: "1",
        region: "us",
      }),
      buildProviderBook({
        title: "UK Marketplace Book",
        asin: "UK_ASIN",
        authors: ["Example Author"],
        position: "2",
        region: "uk",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      region: "uk",
    });

    expect(result.books.map((book) => book.title)).toEqual(["UK Marketplace Book"]);
  });

  it("does not report provider books marked unavailable in the selected storefront", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Unavailable Storefront Book",
        asin: "UNAVAILABLE_ASIN",
        authors: ["Example Author"],
        position: "1",
        isAvailable: false,
      }),
      buildProviderBook({
        title: "Available Storefront Book",
        asin: "AVAILABLE_ASIN",
        authors: ["Example Author"],
        position: "2",
        isAvailable: true,
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      region: "uk",
    });

    expect(result.books.map((book) => book.title)).toEqual(["Available Storefront Book"]);
    expect(result.debugDecisions[0].diagnostic.checks).toContain(
      "Skipped because the provider marks this book unavailable."
    );
  });

  it("does not report provider books manually marked as owned", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Monstrous Regiment",
        asin: "PROVIDER_ASIN",
        authors: ["Terry Pratchett"],
        position: "31",
      }),
      buildProviderBook({
        title: "Night Watch",
        asin: "MISSING_ASIN",
        authors: ["Terry Pratchett"],
        position: "29",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      manualBookMatches: [
        {
          createdAt: "2026-05-27T00:00:00.000Z",
          providerId: "audible",
          region: "uk",
          seriesAsin: "SERIES_ASIN",
          seriesName: "Known Series",
          asin: "PROVIDER_ASIN",
          title: "Monstrous Regiment",
          authors: ["Terry Pratchett"],
        },
      ],
    });

    expect(result.books.map((book) => book.title)).toEqual(["Night Watch"]);
    expect(
      result.debugDecisions
        .find((decision) => decision.diagnostic.asin === "PROVIDER_ASIN")
        ?.diagnostic.checks.join(" ")
    ).toContain("manually marked as owned");
  });

  it("does not report owned books when title evidence has a small spelling difference", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Monsterous Regiment",
        asin: "LOCAL_ASIN",
        authors: ["Terry Pratchett"],
        position: "31",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Monstrous Regiment: Discworld, Book 31",
        asin: "PROVIDER_ASIN",
        authors: ["Sir Terry Pratchett"],
        position: "31",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
    });

    expect(result.books).toEqual([]);
  });

  it("does not treat a different longer title as owned just because the author matches", () => {
    const localSeries = buildLocalSeries([
      buildLocalBook({
        title: "Dune",
        asin: "DUNE_ASIN",
        authors: ["Frank Herbert"],
        position: "1",
      }),
    ]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Dune Messiah",
        asin: "MESSIAH_ASIN",
        authors: ["Frank Herbert"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, localSeries.books, {
      ...defaultMissingBookOptions(),
      ignoreSameSeriesPosition: false,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Dune Messiah"]);
  });

  it("deduplicates provider editions with the same title, author, and series position", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "A Hat Full of Sky",
        asin: "EDITION_ONE",
        authors: ["Terry Pratchett"],
        position: "2",
      }),
      buildProviderBook({
        title: "A Hat Full of Sky",
        asin: "EDITION_TWO",
        authors: ["Terry Pratchett"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.title)).toEqual(["A Hat Full of Sky"]);
  });

  it("prefers buyable provider editions when duplicate editions describe the same book", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Sign of Four",
        asin: "CATALOGUE_ONLY_ASIN",
        authors: ["Arthur Conan Doyle"],
        position: "2",
        isBuyable: false,
      }),
      buildProviderBook({
        title: "The Sign of Four",
        asin: "BUYABLE_ASIN",
        authors: ["Arthur Conan Doyle"],
        position: "2",
        isBuyable: true,
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.asin)).toEqual(["BUYABLE_ASIN"]);
  });

  it("filters abridged provider books when unabridged-only is enabled", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Shortened Edition",
        asin: "ABRIDGED_ASIN",
        authors: ["Example Author"],
        position: "1",
        bookFormat: "abridged",
      }),
      buildProviderBook({
        title: "Full Edition",
        asin: "UNABRIDGED_ASIN",
        authors: ["Example Author"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      onlyUnabridged: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Full Edition"]);
  });

  it("filters provider books with no matched series position when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "No Position",
        asin: "NO_POSITION_ASIN",
        authors: ["Example Author"],
        position: null,
      }),
      buildProviderBook({
        title: "Positioned",
        asin: "POSITIONED_ASIN",
        authors: ["Example Author"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreNoPositionBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Positioned"]);
  });

  it("keeps cautious-provider books when abridgement evidence is unavailable", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = {
      ...buildProviderSeries([
        buildProviderBook({
          title: "Open Evidence Book",
          asin: "OPEN_EVIDENCE_ASIN",
          authors: ["Example Author"],
          position: null,
          bookFormat: null,
        }),
      ]),
      matchingRules: {
        includeFormat: false,
      },
    };

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      onlyUnabridged: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Open Evidence Book"]);
    expect(result.diagnosticsByAsin.OPEN_EVIDENCE_ASIN.checks).toContain(
      "Unabridged-only filter not applied because this provider did not supply abridgement evidence."
    );
  });

  it("keeps cautious-provider books when series-position evidence is unavailable", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = {
      ...buildProviderSeries([
        buildProviderBook({
          title: "Unpositioned Evidence Book",
          asin: "OPEN_POSITION_ASIN",
          authors: ["Example Author"],
          position: null,
        }),
      ]),
      matchingRules: {
        includeSeriesPosition: false,
      },
    };

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreNoPositionBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Unpositioned Evidence Book"]);
    expect(result.diagnosticsByAsin.OPEN_POSITION_ASIN.checks).toContain(
      "No-position filter not applied because this provider did not supply reliable series positions."
    );
  });

  it("filters multi-book provider positions when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Books One and Two",
        asin: "MULTI_ASIN",
        authors: ["Example Author"],
        position: "1-2",
      }),
      buildProviderBook({
        title: "Book Three",
        asin: "SINGLE_ASIN",
        authors: ["Example Author"],
        position: "3",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreMultiBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Book Three"]);
  });

  it("skips provider series container records even when the provider marks them available", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Discworld",
        asin: "SERIES_CONTAINER_ASIN",
        authors: ["Terry Pratchett"],
        position: "1",
        deliveryType: "BookSeries",
        hasChildren: true,
      }),
      buildProviderBook({
        title: "Night Watch",
        asin: "NORMAL_ASIN",
        authors: ["Terry Pratchett"],
        position: "29",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.asin)).toEqual(["NORMAL_ASIN"]);
    expect(
      result.debugDecisions
        .find((decision) => decision.diagnostic.asin === "SERIES_CONTAINER_ASIN")
        ?.diagnostic.checks.join(" ")
    ).toContain("series container");
  });

  it("does not skip normal Audible multi-part audiobooks when they are missing", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Running Grave",
        asin: "B0C3M97JZW",
        authors: ["Robert Galbraith"],
        position: "7",
        deliveryType: "MultiPartBook",
        hasChildren: true,
        childRelationshipTypes: ["component"],
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
    });

    expect(result.books.map((book) => book.asin)).toEqual(["B0C3M97JZW"]);
  });

  it("filters provider books with decimal sub-positions when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Side Story",
        asin: "SUB_POSITION_ASIN",
        authors: ["Example Author"],
        position: "3.5",
      }),
      buildProviderBook({
        title: "Main Story",
        asin: "MAIN_POSITION_ASIN",
        authors: ["Example Author"],
        position: "4",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreSubPositionBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Main Story"]);
  });

  it("filters future releases when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Future Book",
        asin: "FUTURE_ASIN",
        authors: ["Example Author"],
        position: "1",
        releaseDate: formatDate(offsetDate(1)),
      }),
      buildProviderBook({
        title: "Released Book",
        asin: "PAST_ASIN",
        authors: ["Example Author"],
        position: "2",
        releaseDate: formatDate(offsetDate(-1)),
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreFutureDateBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Released Book"]);
  });

  it("filters empty far-future placeholder releases by default", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Empty Placeholder",
        asin: "PLACEHOLDER_ASIN",
        authors: [],
        position: "3",
        releaseDate: "2200-01-01",
      }),
      buildProviderBook({
        title: "Useful Future Book",
        asin: "FUTURE_ASIN",
        authors: ["Example Author"],
        description: "A real upcoming entry with enough provider metadata to review.",
        position: "4",
        releaseDate: formatDate(offsetDate(30)),
      }),
    ]);

    const result = findMissingBooksForSeries(
      localSeries,
      providerSeries,
      [],
      defaultMissingBookOptions()
    );

    expect(result.books.map((book) => book.title)).toEqual(["Useful Future Book"]);
  });

  it("filters already released books when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "Future Book",
        asin: "FUTURE_ASIN",
        authors: ["Example Author"],
        position: "1",
        releaseDate: formatDate(offsetDate(1)),
      }),
      buildProviderBook({
        title: "Released Book",
        asin: "PAST_ASIN",
        authors: ["Example Author"],
        position: "2",
        releaseDate: formatDate(offsetDate(-1)),
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignorePastDateBooks: true,
    });

    expect(result.books.map((book) => book.title)).toEqual(["Future Book"]);
  });

  it("collapses repeated title and subtitle entries in the missing list when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "The Wee Free Men",
        subtitle: "Discworld, Book 30",
        asin: "FIRST_ASIN",
        authors: ["Terry Pratchett"],
        position: "30",
      }),
      buildProviderBook({
        title: "The Wee Free Men",
        subtitle: "Discworld, Book 30",
        asin: "SECOND_ASIN",
        authors: ["Different Publisher"],
        position: "1",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreTitleSubtitleInMissingArray: true,
    });

    expect(result.books.map((book) => book.asin)).toEqual(["FIRST_ASIN"]);
  });

  it("collapses repeated series positions in the missing list when requested", () => {
    const localSeries = buildLocalSeries([]);
    const providerSeries = buildProviderSeries([
      buildProviderBook({
        title: "First Edition",
        asin: "FIRST_ASIN",
        authors: ["Example Author"],
        position: "2",
      }),
      buildProviderBook({
        title: "Second Edition",
        asin: "SECOND_ASIN",
        authors: ["Example Author"],
        position: "2",
      }),
    ]);

    const result = findMissingBooksForSeries(localSeries, providerSeries, [], {
      ...defaultMissingBookOptions(),
      ignoreSameSeriesPositionInMissingArray: true,
    });

    expect(result.books.map((book) => book.asin)).toEqual(["FIRST_ASIN"]);
  });
});

/**
 * Purpose: Build the default missing-book options used by V2 scan tests.
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
 * Purpose: Build local series test fixtures for missing-book detection.
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
 * Purpose: Build provider series test fixtures for missing-book detection.
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
  description?: string;
  deliveryType?: string;
  hasChildren?: boolean;
  imageUrl?: string;
  publisher?: string;
  childRelationshipTypes?: string[];
  releaseDate?: string;
  summary?: string;
  region?: string;
  isAvailable?: boolean;
  isBuyable?: boolean;
}): ProviderSeriesBook {
  return {
    asin: input.asin,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    summary: input.summary,
    authors: input.authors,
    narrators: input.narrators ?? [],
    bookFormat: input.bookFormat === undefined ? "unabridged" : input.bookFormat,
    releaseDate: input.releaseDate,
    region: input.region ?? "uk",
    isAvailable: input.isAvailable ?? true,
    isBuyable: input.isBuyable,
    deliveryType: input.deliveryType ?? null,
    hasChildren: input.hasChildren ?? false,
    childRelationshipTypes: input.childRelationshipTypes ?? [],
    imageUrl: input.imageUrl,
    publisher: input.publisher,
    series: [{ asin: "SERIES_ASIN", name: "Known Series", position: input.position }],
  };
}

/**
 * Purpose: Create a date offset from today for release-date filter tests.
 *
 * @param dayOffset - Number of calendar days to add to today's date.
 * @returns A new date shifted by the requested number of days.
 */
function offsetDate(dayOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date;
}

/**
 * Purpose: Format a date as the provider-style YYYY-MM-DD release date.
 *
 * @param date - Date to format.
 * @returns Date-only text in YYYY-MM-DD format.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
