import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAppleBooksJson } from "../appleBooksApi";
import { fetchAudibleJson } from "../audibleApi";
import { fetchGoogleBooksJson } from "../googleBooksApi";
import { clearMetadataRequestMemoryCaches } from "./metadataRequestMemoryCache";
import { fetchOpenLibraryJson } from "../openLibraryApi";

describe("clearMetadataRequestMemoryCaches", () => {
  afterEach(() => {
    clearMetadataRequestMemoryCaches();
    vi.restoreAllMocks();
  });

  it("forces cached provider requests to go back to the network", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(buildJsonResponse({ ok: true })));

    await fetchEveryProvider();
    await fetchEveryProvider();

    expect(fetchSpy).toHaveBeenCalledTimes(4);

    clearMetadataRequestMemoryCaches();
    await fetchEveryProvider();

    expect(fetchSpy).toHaveBeenCalledTimes(8);
  });
});

/**
 * Purpose: Make one cached request through every metadata provider transport.
 *
 * @returns A promise that resolves when every provider fetch has completed.
 */
async function fetchEveryProvider(): Promise<void> {
  await Promise.all([
    fetchAudibleJson("/api/audible/uk/1.0/catalog/products/B0BOOK", true),
    fetchAppleBooksJson("https://itunes.apple.com/search?term=known&media=audiobook", true),
    fetchGoogleBooksJson("https://www.googleapis.com/books/v1/volumes?q=known", true),
    fetchOpenLibraryJson("https://openlibrary.org/search.json?q=known", true),
  ]);
}

/**
 * Purpose: Build a fresh JSON response for mocked provider requests.
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
