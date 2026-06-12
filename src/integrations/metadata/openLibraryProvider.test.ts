import { afterEach, describe, expect, it, vi } from "vitest";
import { openLibraryProvider } from "./openLibraryProvider";

describe("openLibraryProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches Open Library directly from the browser", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        docs: [
          {
            author_name: ["Known Author"],
            cover_i: 123456,
            first_publish_year: 2021,
            isbn: ["9780000000001"],
            key: "/works/OL123W",
            publisher: ["Known Publisher"],
            title: "First Book",
          },
          {
            author_name: ["Known Author"],
            key: "/works/OL124W",
            title: "Missing Book",
          },
        ],
      })
    );

    const candidates = await openLibraryProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["First Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://openlibrary.org/search.json?"),
      { headers: { Accept: "application/json" } }
    );
    expect(String(fetchSpy.mock.calls[0][0])).toContain("q=Known+Series");
    expect(candidates).toMatchObject([
      {
        automaticMatch: false,
        matchingRules: {
          includeSeriesPosition: false,
          includeSubtitle: false,
        },
        name: "Known Series",
        region: "uk",
        seriesAsin: "open-library:search:Known%20Series",
        books: [
          {
            asin: "open-library:work:OL123W",
            authors: ["Known Author"],
            imageUrl: "https://covers.openlibrary.org/b/id/123456-L.jpg?default=false",
            isbn: "9780000000001",
            link: "https://openlibrary.org/works/OL123W",
            publisher: "Known Publisher",
            series: [
              {
                asin: "open-library:search:Known%20Series",
                name: "Known Series",
                position: null,
              },
            ],
            title: "First Book",
          },
          {
            asin: "open-library:work:OL124W",
            authors: ["Known Author"],
            title: "Missing Book",
          },
        ],
      },
    ]);
  });

  it("does not treat Audible ASINs as Open Library lookup identifiers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      openLibraryProvider.getBookByAsin({
        asin: "B0AUDIBLE",
        cache: false,
        region: "uk",
      })
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses Open Library ISBN search evidence when local ISBNs are available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        buildJsonResponse({
          docs: [
            {
              author_name: ["Known Author"],
              isbn: ["9780000000001"],
              key: "/works/OLISBNW",
              title: "ISBN Matched Book",
            },
          ],
        })
      )
      .mockResolvedValueOnce(buildJsonResponse({ docs: [] }));

    const candidates = await openLibraryProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: ["978-0-0000-0000-1"],
      knownTitles: ["ISBN Matched Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://openlibrary.org/search.json?");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("isbn=9780000000001");
    expect(candidates[0].books[0]).toMatchObject({
      asin: "open-library:work:OLISBNW",
      isbn: "9780000000001",
      title: "ISBN Matched Book",
    });
  });

  it("filters Open Library results to the selected region language", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        docs: [
          {
            author_name: ["Known Author"],
            key: "/works/OLENGLISHW",
            language: ["eng"],
            title: "Known Local Title",
          },
          {
            author_name: ["Known Author"],
            key: "/works/OLGERMANW",
            language: ["ger"],
            title: "Known Local Title German Edition",
          },
        ],
      })
    );

    const candidates = await openLibraryProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Known Series",
      region: "uk",
    });

    expect(candidates[0].books.map((book) => book.asin)).toEqual([
      "open-library:work:OLENGLISHW",
    ]);
  });

  it("drops Open Library results without supported title, author, series-name, or ISBN evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        docs: [
          {
            author_name: ["Different Author"],
            key: "/works/OL999W",
            title: "A Store Result With No Local Evidence",
          },
        ],
      })
    );

    const candidates = await openLibraryProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Hard To Match Series",
      region: "uk",
    });

    expect(candidates).toEqual([]);
  });

  it("reloads synthetic Open Library search candidates for manual matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        docs: [
          {
            author_name: ["Known Author"],
            key: "/works/OL777W",
            title: "Manual Book",
          },
        ],
      })
    );

    const candidate = await openLibraryProvider.getSeriesBooks({
      cache: false,
      region: "us",
      seriesAsin: "open-library:search:Manual%20Series",
    });

    expect(candidate).toMatchObject({
      automaticMatch: false,
      name: "Manual Series",
      region: "us",
      seriesAsin: "open-library:search:Manual%20Series",
      books: [
        {
          asin: "open-library:work:OL777W",
          title: "Manual Book",
        },
      ],
    });
  });
});

/**
 * Purpose: Build a fresh JSON response for each mocked Open Library API
 * request.
 *
 * @param payload - Response body to serialise.
 * @returns Fetch `Response` containing JSON.
 */
function buildJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
