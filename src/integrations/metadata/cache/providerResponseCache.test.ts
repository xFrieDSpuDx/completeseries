import { describe, expect, it } from "vitest";
import { parseProviderResponseCachePayload } from "./providerResponseCache";

describe("parseProviderResponseCachePayload", () => {
  it("imports provider response cache records from local data exports", () => {
    const records = parseProviderResponseCachePayload(
      JSON.stringify({
        providerResponseCache: [
          {
            fetchedAt: "2026-06-12T00:00:00.000Z",
            path: "https://www.googleapis.com/books/v1/volumes?q=known",
            payload: { items: [{ id: "volume-1" }] },
            providerId: "googleBooks",
            schemaVersion: 1,
          },
        ],
      })
    );

    expect(records).toEqual([
      {
        fetchedAt: "2026-06-12T00:00:00.000Z",
        path: "https://www.googleapis.com/books/v1/volumes?q=known",
        payload: { items: [{ id: "volume-1" }] },
        providerId: "googleBooks",
        schemaVersion: 1,
      },
    ]);
  });

  it("ignores records for unknown providers or empty paths", () => {
    const records = parseProviderResponseCachePayload(
      JSON.stringify({
        providerResponseCache: [
          {
            path: "https://example.com/metadata",
            payload: {},
            providerId: "removed-provider",
          },
          {
            path: "",
            payload: {},
            providerId: "googleBooks",
          },
        ],
      })
    );

    expect(records).toEqual([]);
  });

  it("imports null 404 payloads and fills missing timestamps", () => {
    const records = parseProviderResponseCachePayload(
      JSON.stringify({
        providerResponseCache: [
          {
            path: "https://openlibrary.org/search.json?q=known",
            payload: null,
            providerId: "openLibrary",
          },
        ],
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        path: "https://openlibrary.org/search.json?q=known",
        payload: null,
        providerId: "openLibrary",
        schemaVersion: 1,
      }),
    ]);
    expect(records[0]?.fetchedAt).toEqual(expect.any(String));
  });

  it("ignores malformed local data payloads", () => {
    expect(parseProviderResponseCachePayload("not json")).toEqual([]);
    expect(parseProviderResponseCachePayload(JSON.stringify({ providerResponseCache: {} }))).toEqual([]);
  });
});
