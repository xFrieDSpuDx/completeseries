import { afterEach, describe, expect, it, vi } from "vitest";
import { googleBooksProvider } from "./googleBooksProvider";

describe("googleBooksProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches Google Books directly from the browser", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "google-volume-1",
            volumeInfo: {
              authors: ["Known Author"],
              categories: ["Fantasy"],
              description: "<p>Full &amp; useful overview.</p>",
              imageLinks: {
                thumbnail: "https://example.com/cover.jpg",
              },
              industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000001" }],
              language: "en",
              previewLink: "https://books.google.com/books?id=google-volume-1",
              publishedDate: "2021-02-03",
              publisher: "Known Publisher",
              subtitle: "Known Series, Book 1",
              title: "First Book",
            },
          },
          {
            id: "google-volume-2",
            volumeInfo: {
              authors: ["Known Author"],
              language: "en",
              title: "Missing Book",
            },
          },
        ],
      })
    );

    const candidates = await googleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["First Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://www.googleapis.com/books/v1/volumes?"),
      { headers: { Accept: "application/json" } }
    );
    expect(String(fetchSpy.mock.calls[0][0])).toContain("q=Known+Series+inauthor%3AKnown+Author");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("langRestrict=en");
    expect(candidates).toMatchObject([
      {
        automaticMatch: false,
        evidenceLevel: "review",
        matchingRules: {
          includeFormat: false,
          includeSeriesPosition: false,
          includeSubtitle: false,
        },
        name: "Known Series",
        region: "uk",
        seriesAsin: "google-books:search:Known%20Series",
        books: [
          {
            asin: "google-books:volume:google-volume-1",
            authors: ["Known Author"],
            description: "Full & useful overview.",
            genres: ["Fantasy"],
            imageUrl: "https://example.com/cover.jpg",
            isbn: "9780000000001",
            link: "https://books.google.com/books?id=google-volume-1",
            publisher: "Known Publisher",
            releaseDate: "2021-02-03",
            series: [
              {
                asin: "google-books:search:Known%20Series",
                name: "Known Series",
                position: null,
              },
            ],
            subtitle: "Known Series, Book 1",
            title: "First Book",
          },
          {
            asin: "google-books:volume:google-volume-2",
            authors: ["Known Author"],
            title: "Missing Book",
          },
        ],
      },
    ]);
  });

  it("adds the configured Google Books API key to the network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "google-key-volume",
            volumeInfo: {
              authors: ["Known Author"],
              language: "en",
              title: "Known Book",
            },
          },
        ],
      })
    );

    await googleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      googleBooksApiKey: "test-google-key",
      knownIsbns: [],
      knownTitles: ["Known Book"],
      query: "Known Series",
      region: "uk",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain("key=test-google-key");
  });

  it("does not treat Audible ASINs as Google Books lookup identifiers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      googleBooksProvider.getBookByAsin({
        asin: "B0AUDIBLE",
        cache: false,
        region: "uk",
      })
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses Google Books ISBN search evidence when local ISBNs are available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(buildJsonResponse({ items: [] }))
      .mockResolvedValueOnce(
        buildJsonResponse({
          items: [
            {
              id: "google-isbn-volume",
              volumeInfo: {
                authors: ["Known Author"],
                industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000001" }],
                language: "en",
                title: "ISBN Matched Book",
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        buildJsonResponse({
          items: [
            {
              id: "second-isbn-volume",
              volumeInfo: {
                authors: ["Known Author"],
                industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000002" }],
                language: "en",
                title: "Second ISBN Book",
              },
            },
          ],
        })
      );

    const candidates = await googleBooksProvider.searchSeries({
      authorNames: [],
      cache: false,
      knownIsbns: ["978-0-0000-0000-1", "978-0-0000-0000-2"],
      knownTitles: ["ISBN Matched Book"],
      metadataLookupMode: "balanced",
      query: "Known Series",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("q=Known+Series");
    expect(String(fetchSpy.mock.calls[1][0])).toContain("q=isbn%3A9780000000001");
    expect(String(fetchSpy.mock.calls[1][0])).toContain("langRestrict=en");
    expect(candidates[0].books[0]).toMatchObject({
      asin: "google-books:volume:google-isbn-volume",
      isbn: "9780000000001",
      title: "ISBN Matched Book",
    });
  });

  it("skips ISBN fallback when broad search returns relevant Google Books results", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "broad-search-volume",
            volumeInfo: {
              authors: ["Known Author"],
              language: "en",
              title: "Known Book",
            },
          },
        ],
      })
    );

    const candidates = await googleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: ["978-0-0000-0000-1", "978-0-0000-0000-2", "978-0-0000-0000-3"],
      knownTitles: ["Known Book"],
      metadataLookupMode: "thorough",
      query: "Known Series",
      region: "uk",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(candidates[0].books[0].asin).toBe("google-books:volume:broad-search-volume");
  });

  it("filters Google Books results to the selected region language", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "google-english-volume",
            volumeInfo: {
              authors: ["Known Author"],
              language: "en",
              title: "Known Local Title",
            },
          },
          {
            id: "google-german-volume",
            volumeInfo: {
              authors: ["Known Author"],
              language: "de",
              title: "Known Local Title German Edition",
            },
          },
        ],
      })
    );

    const candidates = await googleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Known Series",
      region: "uk",
    });

    expect(candidates[0].books.map((book) => book.asin)).toEqual([
      "google-books:volume:google-english-volume",
    ]);
  });

  it("drops Google Books results without supported title, author, series-name, or ISBN evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "google-unrelated-volume",
            volumeInfo: {
              authors: ["Different Author"],
              language: "en",
              title: "A Store Result With No Local Evidence",
            },
          },
        ],
      })
    );

    const candidates = await googleBooksProvider.searchSeries({
      authorNames: ["Known Author"],
      cache: false,
      knownIsbns: [],
      knownTitles: ["Known Local Title"],
      query: "Hard To Match Series",
      region: "uk",
    });

    expect(candidates).toEqual([]);
  });

  it("reloads synthetic Google Books search candidates for manual matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildJsonResponse({
        items: [
          {
            id: "google-manual-volume",
            volumeInfo: {
              authors: ["Known Author"],
              title: "Manual Book",
            },
          },
        ],
      })
    );

    const candidate = await googleBooksProvider.getSeriesBooks({
      cache: false,
      region: "us",
      seriesAsin: "google-books:search:Manual%20Series",
    });

    expect(candidate).toMatchObject({
      automaticMatch: false,
      evidenceLevel: "review",
      name: "Manual Series",
      region: "us",
      seriesAsin: "google-books:search:Manual%20Series",
      books: [
        {
          asin: "google-books:volume:google-manual-volume",
          title: "Manual Book",
        },
      ],
    });
  });
});

/**
 * Purpose: Build a fresh JSON response for each mocked Google Books API
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
