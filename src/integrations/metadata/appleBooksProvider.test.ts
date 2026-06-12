import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAppleBooksTransportForTests } from "./appleBooksApi";
import { appleBooksProvider } from "./appleBooksProvider";

describe("appleBooksProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAppleBooksTransportForTests();
  });

  it("searches Apple Books directly from the browser", async () => {
    const searchResponse = {
      resultCount: 1,
      results: [
        {
          artistName: "Known Author",
          artworkUrl100: "https://example.com/cover.jpg",
          description: "Short overview.",
          longDescription: "<p>Full &amp; useful overview.</p>",
          releaseDate: "2021-02-03T08:00:00Z",
          trackId: 12345,
          trackName: "First Book: Known Series, Book 1 (Unabridged)",
          trackViewUrl: "https://books.apple.com/book/id12345",
        },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(buildJsonResponse(searchResponse))
      .mockResolvedValueOnce(buildJsonResponse(searchResponse));

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["First Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://itunes.apple.com/search?"),
      { headers: { Accept: "application/json" } }
    );
    expect(String(fetchSpy.mock.calls[0][0])).toContain("country=GB");
    expect(candidates).toMatchObject([
      {
        automaticMatch: false,
        matchingRules: {
          includeSeriesPosition: false,
          includeSubtitle: false,
        },
        name: "Known Series",
        region: "uk",
        seriesAsin: "apple-books:search:Known%20Series",
        books: [
          {
            asin: "apple-books:track:12345",
            authors: ["Known Author"],
            bookFormat: "unabridged",
            description: "Full & useful overview.",
            imageUrl: "https://example.com/cover.jpg",
            link: "https://books.apple.com/book/id12345",
            releaseDate: "2021-02-03",
            series: [
              {
                asin: "apple-books:search:Known%20Series",
                name: "Known Series",
                position: "1",
              },
            ],
            subtitle: null,
            summary: "Short overview.",
            title: "First Book",
          },
        ],
      },
    ]);
  });

  it("does not treat Audible ASINs as Apple lookup identifiers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      appleBooksProvider.getBookByAsin({
        asin: "B0AUDIBLE",
        cache: false,
        region: "uk",
      })
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps Apple series-query results as weak review evidence when strict evidence is missing", async () => {
    const searchResponse = {
      resultCount: 2,
      results: [
        {
          artistName: "Different Author",
          trackId: 222,
          trackName: "A Store Result With No Local Evidence",
        },
        {
          artistName: "Another Author",
          trackId: 333,
          trackName: "Another Store Result",
        },
      ],
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(buildJsonResponse(searchResponse))
      .mockResolvedValueOnce(buildJsonResponse(searchResponse));

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Hard To Match Series",
      region: "uk",
    });

    expect(candidates).toMatchObject([
      {
        automaticMatch: false,
        name: "Hard To Match Series",
        books: [
          {
            asin: "apple-books:track:222",
            title: "A Store Result With No Local Evidence",
          },
          {
            asin: "apple-books:track:333",
            title: "Another Store Result",
          },
        ],
      },
    ]);
  });

  it("falls back to the app-hosted Apple route when a direct browser request fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        buildJsonResponse({
          results: [
            {
              artistName: "Known Author",
              trackId: 444,
              trackName: "Known Series Starter",
            },
          ],
        })
      );

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: [],
      knownTitles: [],
      query: "Known Series",
      region: "uk",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://itunes.apple.com/search?");
    expect(String(fetchSpy.mock.calls[1][0])).toContain("/api/apple-books/search?");
    expect(candidates[0].books[0]).toMatchObject({
      asin: "apple-books:track:444",
      title: "Known Series Starter",
    });
  });

  it("filters Apple Books results that strongly look outside the selected region language", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        results: [
          {
            artistName: "Known Author",
            collectionId: 666,
            collectionName: "Bekannter Titel",
            description:
              "Das ist der Roman in der bekannten Serie und eine deutsche Ausgabe von dem Buch mit nicht englischem Beschreibungstext.",
          },
        ],
      })
    );

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Known Series",
      region: "uk",
    });

    expect(candidates).toEqual([]);
  });

  it("uses Apple ISBN lookup evidence when local ISBNs are available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                artistName: "Known Author",
                collectionId: 555,
                collectionName: "ISBN Matched Book",
                collectionViewUrl: "https://books.apple.com/book/id555",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: ["978-0-0000-0000-1"],
      knownTitles: ["ISBN Matched Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://itunes.apple.com/lookup?");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("isbn=9780000000001");
    expect(candidates[0].books[0]).toMatchObject({
      asin: "apple-books:track:555",
      isbn: "9780000000001",
      link: "https://books.apple.com/book/id555",
      title: "ISBN Matched Book",
    });
  });

  it("does not use description-only Apple text as series evidence", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                artistName: "Different Author",
                collectionId: 777,
                collectionName: "Second Book",
                description: "The second book in the Known Series series.",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["First Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain("term=Known+Series");
    expect(String(fetchSpy.mock.calls[1][0])).toContain("term=Known+Author");
    expect(candidates).toEqual([]);
  });

  it("does not treat Apple artwork filenames as confirmed ISBN evidence", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(buildJsonResponse({ results: [] }))
      .mockResolvedValueOnce(
        buildJsonResponse({
          results: [
            {
              artistName: "Known Author",
              artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/9780000000001.jpg/100x100bb.jpg",
              collectionId: 888,
              collectionName: "Known Local Title",
            },
          ],
        })
      );

    const candidates = await appleBooksProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: ["978-0-0000-0000-1"],
      knownTitles: ["Known Local Title"],
      query: "Known Series",
      region: "uk",
    });

    expect(candidates[0].books[0]).toMatchObject({
      asin: "apple-books:track:888",
      isbn: null,
      title: "Known Local Title",
    });
  });

  it("reloads synthetic Apple search candidates for manual matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              artistName: "Known Author",
              trackId: 67890,
              trackName: "Second Book: Known Series, Book 2",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const candidate = await appleBooksProvider.getSeriesBooks({
      cache: false,
      region: "us",
      seriesAsin: "apple-books:search:Known%20Series",
    });

    expect(candidate).toMatchObject({
      automaticMatch: false,
      name: "Known Series",
      region: "us",
      seriesAsin: "apple-books:search:Known%20Series",
      books: [
        {
          asin: "apple-books:track:67890",
          series: [{ position: "2" }],
          title: "Second Book",
        },
      ],
    });
  });
});

/**
 * Purpose: Build a fresh JSON response for each mocked Apple API request.
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
