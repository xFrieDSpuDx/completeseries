import { describe, expect, it } from "vitest";
import { parseAudibleResponseCachePayload } from "./audibleResponseCache";

describe("parseAudibleResponseCachePayload", () => {
  it("imports Audible API cache records from local data exports", () => {
    const records = parseAudibleResponseCachePayload(
      JSON.stringify({
        audibleResponseCache: [
          {
            fetchedAt: "2026-05-27T20:00:00.000Z",
            path: "/api/audible/uk/1.0/catalog/products/B0BOOK",
            payload: { product: { asin: "B0BOOK" } },
            schemaVersion: 1,
          },
        ],
      })
    );

    expect(records).toEqual([
      {
        fetchedAt: "2026-05-27T20:00:00.000Z",
        path: "/api/audible/uk/1.0/catalog/products/B0BOOK",
        payload: { product: { asin: "B0BOOK" } },
        schemaVersion: 1,
      },
    ]);
  });

  it("keeps direct Audible cache records from the no-proxy trial", () => {
    const records = parseAudibleResponseCachePayload(
      JSON.stringify({
        audibleResponseCache: [
          {
            fetchedAt: "2026-05-27T20:00:00.000Z",
            path: "https://api.audible.co.uk/1.0/catalog/products/B0BOOK",
            payload: { product: { asin: "B0BOOK" } },
            schemaVersion: 1,
          },
        ],
      })
    );

    expect(records).toEqual([
      {
        fetchedAt: "2026-05-27T20:00:00.000Z",
        path: "https://api.audible.co.uk/1.0/catalog/products/B0BOOK",
        payload: { product: { asin: "B0BOOK" } },
        schemaVersion: 1,
      },
    ]);
  });

  it("ignores records outside Audible catalogue hosts", () => {
    const records = parseAudibleResponseCachePayload(
      JSON.stringify({
        audibleResponseCache: [
          {
            path: "https://example.com/private",
            payload: { product: { asin: "B0BOOK" } },
          },
        ],
      })
    );

    expect(records).toEqual([]);
  });
});
