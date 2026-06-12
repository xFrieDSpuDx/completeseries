import { describe, expect, it } from "vitest";
import { matchLocalSeriesToProviderSeries, rankProviderSeriesCandidates } from "./matching";
import { parseSeriesPosition } from "./normalise";
import type { LocalSeriesEvidence, ProviderSeriesCandidate } from "./audiobook";

describe("matchLocalSeriesToProviderSeries", () => {
  it("matches by later book evidence when the first ASIN is wrong or unavailable", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-ciaphas-cain",
      name: "Ciaphas Cain: Warhammer 40,000",
      books: [
        {
          id: "bad-first-book",
          title: "For the Emperor",
          asin: "REGION_MISMATCH",
          authors: ["Sandy Mitchell"],
          narrators: [],
          position: parseSeriesPosition("1"),
        },
        {
          id: "known-third-book",
          title: "The Traitor's Hand",
          asin: "B012KNOWN",
          sku: "BK_GAWO_000123UK",
          authors: ["Sandy Mitchell"],
          narrators: [],
          position: parseSeriesPosition("3"),
        },
      ],
    };

    const providerSeries: ProviderSeriesCandidate = {
      seriesAsin: "B07CN5BG3H",
      name: "Ciaphas Cain: Warhammer 40,000",
      region: "uk",
      books: [
        {
          asin: "B012KNOWN",
          title: "The Traitor's Hand",
          sku: "BK_GAWO_000123UK",
          authors: ["Sandy Mitchell"],
          narrators: [],
          series: [{ asin: "B07CN5BG3H", name: "Ciaphas Cain: Warhammer 40,000", position: "3" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("matched");
    expect(match.providerSeries?.seriesAsin).toBe("B07CN5BG3H");
    expect(match.signals.asinMatches).toBe(1);
    expect(match.signals.skuMatches).toBe(1);
  });

  it("leaves weak candidates unresolved instead of pretending they matched", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-random",
      name: "Entirely Different Series",
      books: [
        {
          id: "book-1",
          title: "No Shared Evidence",
          authors: ["Author One"],
          narrators: [],
          position: parseSeriesPosition("1"),
        },
      ],
    };

    const providerSeries: ProviderSeriesCandidate = {
      seriesAsin: "provider-unrelated",
      name: "Unrelated Provider Series",
      books: [
        {
          asin: "B000000000",
          title: "Other Title",
          authors: ["Author Two"],
          narrators: [],
          series: [{ name: "Unrelated Provider Series", position: "1" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("unresolved");
  });

  it("accepts one-book series when an ASIN match points at the same provider series", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-kingkiller",
      name: "Kingkiller Chronicle",
      books: [
        {
          id: "book-1",
          title: "Local Metadata Title",
          asin: "B0KNOWNBOOK",
          authors: [],
          narrators: [],
          position: parseSeriesPosition(null),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      seriesAsin: "provider-kingkiller",
      name: "Kingkiller Chronicle",
      books: [
        {
          asin: "B0KNOWNBOOK",
          title: "Provider Metadata Title",
          authors: ["Patrick Rothfuss"],
          narrators: [],
          series: [{ asin: "provider-kingkiller", name: "Kingkiller Chronicle", position: "1" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("matched");
    expect(match.score).toBe(52);
    expect(match.reason).toContain("1 ASIN match");
    expect(match.reason).toContain("exact series name match");
  });

  it("counts ISBN matches as strong identifier evidence", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-isbn",
      name: "ISBN Series",
      books: [
        {
          id: "book-1",
          title: "Local Title",
          isbn: "978-0-0000-0000-1",
          authors: [],
          narrators: [],
          position: parseSeriesPosition(null),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      seriesAsin: "provider-isbn",
      name: "ISBN Series",
      books: [
        {
          asin: "provider-book",
          isbn: "9780000000001",
          title: "Provider Title",
          authors: [],
          narrators: [],
          series: [{ asin: "provider-isbn", name: "ISBN Series", position: "1" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("matched");
    expect(match.signals.isbnMatches).toBe(1);
    expect(match.reason).toContain("1 ISBN match");
  });

  it("does not accept same-name candidates without identifier or book evidence", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-same-name",
      name: "Shared Series Name",
      books: [
        {
          id: "book-1",
          title: "Local Metadata Title",
          asin: "LOCAL_ONLY_ASIN",
          authors: [],
          narrators: [],
          position: parseSeriesPosition(null),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      seriesAsin: "provider-same-name",
      name: "Shared Series Name",
      books: [
        {
          asin: "PROVIDER_ONLY_ASIN",
          title: "Provider Metadata Title",
          authors: [],
          narrators: [],
          series: [{ asin: "provider-same-name", name: "Shared Series Name", position: "1" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("unresolved");
  });

  it("ranks candidates by matching confidence for review screens", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-ranked",
      name: "Discworld",
      books: [
        {
          id: "book-31",
          title: "Monstrous Regiment",
          asin: "B09MDKHZV5",
          authors: ["Terry Pratchett"],
          narrators: [],
          position: parseSeriesPosition("31"),
        },
      ],
    };
    const weakCandidate: ProviderSeriesCandidate = {
      seriesAsin: "weak",
      name: "Different Series",
      providerId: "audible",
      providerName: "Audible catalogue",
      books: [
        {
          asin: "B000000000",
          title: "Other Book",
          authors: [],
          narrators: [],
          series: [{ asin: "weak", name: "Different Series", position: "1" }],
        },
      ],
    };
    const strongCandidate: ProviderSeriesCandidate = {
      seriesAsin: "strong",
      name: "Discworld",
      providerId: "audible",
      providerName: "Audible catalogue",
      books: [
        {
          asin: "B09MDKHZV5",
          title: "Monstrous Regiment",
          authors: ["Terry Pratchett"],
          narrators: [],
          series: [{ asin: "strong", name: "Discworld", position: "31" }],
        },
      ],
    };

    const ranked = rankProviderSeriesCandidates(localSeries, [weakCandidate, strongCandidate]);

    expect(ranked.map((match) => match.providerSeries?.seriesAsin)).toEqual(["strong", "weak"]);
    expect(ranked[0].signals.asinMatches).toBe(1);
  });

  it("keeps review-only provider candidates unresolved even with a strong score", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-shared-name",
      name: "Shared Series",
      books: [
        {
          id: "book-1",
          title: "First Book",
          authors: ["Known Author"],
          narrators: [],
          position: parseSeriesPosition("1"),
        },
        {
          id: "book-2",
          title: "Second Book",
          authors: ["Known Author"],
          narrators: [],
          position: parseSeriesPosition("2"),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      automaticMatch: false,
      seriesAsin: "apple-books:search:Shared%20Series",
      name: "Shared Series",
      providerId: "appleBooks",
      providerName: "Apple Books",
      books: [
        {
          asin: "apple-books:track:111",
          title: "First Book",
          authors: ["Known Author"],
          narrators: [],
          series: [
            {
              asin: "apple-books:search:Shared%20Series",
              name: "Shared Series",
              position: "1",
            },
          ],
        },
        {
          asin: "apple-books:track:222",
          title: "Second Book",
          authors: ["Known Author"],
          narrators: [],
          series: [
            {
              asin: "apple-books:search:Shared%20Series",
              name: "Shared Series",
              position: "2",
            },
          ],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("unresolved");
    expect(match.score).toBeGreaterThanOrEqual(55);
  });

  it("honours provider rules that limit subtitle and position evidence", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-limited-provider",
      name: "Limited Provider Series",
      books: [
        {
          id: "book-1",
          title: "Shared Book",
          subtitle: "Local Subtitle",
          isbn: "978-0-0000-0000-1",
          authors: ["Known Author"],
          narrators: [],
          position: parseSeriesPosition("1"),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      automaticMatch: false,
      matchingRules: {
        includeSeriesPosition: false,
        includeSubtitle: false,
      },
      seriesAsin: "provider-limited",
      name: "Limited Provider Series",
      books: [
        {
          asin: "provider-book",
          title: "Shared Book",
          subtitle: "Different Provider Subtitle",
          isbn: "9780000000001",
          authors: ["Known Author"],
          narrators: [],
          series: [{ asin: "provider-limited", name: "Limited Provider Series", position: "1" }],
        },
      ],
    };

    const [rankedMatch] = rankProviderSeriesCandidates(localSeries, [providerSeries]);

    expect(rankedMatch.signals).toMatchObject({
      isbnMatches: 1,
      titleMatches: 1,
      subtitleMatches: 0,
      positionMatches: 0,
      authorMatches: 1,
    });
  });

  it("accepts manual provider-series overrides even with a low score", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "local-manual",
      name: "Hard To Match",
      books: [
        {
          id: "book-1",
          title: "Local Title",
          authors: [],
          narrators: [],
          position: parseSeriesPosition(null),
        },
      ],
    };
    const providerSeries: ProviderSeriesCandidate = {
      automaticMatch: false,
      seriesAsin: "manual-provider-series",
      name: "Chosen Provider Series",
      manualMatch: true,
      providerId: "audible",
      books: [
        {
          asin: "B000000001",
          title: "Different Title",
          authors: [],
          narrators: [],
          series: [{ asin: "manual-provider-series", name: "Chosen Provider Series" }],
        },
      ],
    };

    const match = matchLocalSeriesToProviderSeries(localSeries, [providerSeries]);

    expect(match.status).toBe("matched");
    expect(match.score).toBeLessThan(55);
    expect(match.reason).toBe("Manual provider series override.");
  });
});
