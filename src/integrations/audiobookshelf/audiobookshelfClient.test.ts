import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAudiobookshelfBooksForLibraries,
  fetchAudiobookshelfLibraries,
  mapAudiobookshelfSeriesResponse,
  resolveAuthToken,
} from "./audiobookshelfClient";
import { LOGIN_DETAILS_ERROR_MESSAGE } from "./audiobookshelfMessages";

describe("resolveAuthToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the API key directly when API key auth is selected", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "apiKey",
        apiKey: "abc123",
      })
    ).resolves.toBe("abc123");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("logs in with username and password and returns the auth token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { token: "token-from-login" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).resolves.toBe("token-from-login");

    expect(globalThis.fetch).toHaveBeenCalledWith("https://abs.example.com/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "reader",
        password: "secret",
      }),
    });
  });

  it("explains rejected username and password credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "password",
        username: "reader",
        password: "wrong",
      })
    ).rejects.toThrow(LOGIN_DETAILS_ERROR_MESSAGE);
  });

  it("prioritises credentials when a login response is hidden by the browser", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Load failed"))
      .mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).rejects.toThrow(LOGIN_DETAILS_ERROR_MESSAGE);

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://abs.example.com/",
      expect.objectContaining({ mode: "no-cors" })
    );
  });

  it("explains unreachable Audiobookshelf servers separately from unreadable responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Network down"));

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).rejects.toThrow(/could not connect to Audiobookshelf/);
  });

  it("explains mixed-content blocking before suggesting server reachability fixes", async () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://complete-series.example.com",
        protocol: "https:",
      },
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Load failed"));

    await expect(
      resolveAuthToken({
        baseUrl: "http://abs.example.com",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).rejects.toThrow(/running over HTTPS.*uses HTTP/);
  });

  it("explains when a proxy or wrong URL returns HTML instead of JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Proxy login</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    await expect(
      resolveAuthToken({
        baseUrl: "https://abs.example.com",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).rejects.toThrow(/not JSON/);
  });

  it("explains invalid server URLs before making a request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      resolveAuthToken({
        baseUrl: "http://[",
        mode: "password",
        username: "reader",
        password: "secret",
      })
    ).rejects.toThrow(/server URL is not valid/);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("fetchAudiobookshelfLibraries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains rejected API keys or expired session tokens", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      fetchAudiobookshelfLibraries({
        baseUrl: "https://abs.example.com",
        mode: "apiKey",
        apiKey: "bad-token",
      })
    ).rejects.toThrow(/API key or session token/);
  });
});

describe("mapAudiobookshelfSeriesResponse", () => {
  it("reads current Audiobookshelf series sequence and contributor metadata", () => {
    const [series] = mapAudiobookshelfSeriesResponse(
      {
        results: [
          {
            id: "series-1",
            name: "Known Series",
            books: [
              {
                id: "book-1",
                media: {
                  metadata: {
                    title: "Known Book",
                    subtitle: "Known Subtitle",
                    asin: "B0KNOWN",
                    isbn13: "978-0-0000-0000-1",
                    sku: "BK_TEST_000001UK",
                    skuGroup: "BK_TEST_000001",
                    authors: [{ name: "Known Author" }],
                    genres: [{ name: "Fantasy" }],
                    narrators: ["Known Narrator"],
                    publishedYear: "2020",
                    publisher: "Known Publisher",
                    releaseDate: "2021-02-03",
                    series: {
                      id: "series-1",
                      name: "Known Series",
                      sequence: "4",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      "library-1"
    );

    expect(series.books[0]).toMatchObject({
      title: "Known Book",
      subtitle: "Known Subtitle",
      asin: "B0KNOWN",
      isbn: "9780000000001",
      sku: "BK_TEST_000001UK",
      skuGroup: "BK_TEST_000001",
      authors: ["Known Author"],
      genres: ["Fantasy"],
      narrators: ["Known Narrator"],
      publishedDate: "2020",
      publisher: "Known Publisher",
      releaseDate: "2021-02-03",
      seriesNames: ["Known Series"],
      position: { raw: "4", numeric: 4 },
    });
  });
});

describe("fetchAudiobookshelfBooksForLibraries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches library items for ownership evidence outside the series endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 1,
          results: [
            {
              id: "book-1",
              media: {
                metadata: {
                  title: "Monstrous Regiment",
                  asin: "LOCAL_ASIN",
                  authorName: "Terry Pratchett",
                  series: [{ name: "Discworld", sequence: "31" }],
                },
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await expect(
      fetchAudiobookshelfBooksForLibraries(
        {
          baseUrl: "https://abs.example.com",
          mode: "apiKey",
          apiKey: "token",
        },
        [{ id: "library-1", name: "Audiobooks", mediaType: "book" }]
      )
    ).resolves.toMatchObject([
      {
        id: "book-1",
        title: "Monstrous Regiment",
        asin: "LOCAL_ASIN",
        authors: ["Terry Pratchett"],
        seriesNames: ["Discworld"],
      },
    ]);
  });
});
