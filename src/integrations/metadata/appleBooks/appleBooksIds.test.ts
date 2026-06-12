import { describe, expect, it } from "vitest";
import {
  buildAppleBooksSeriesId,
  buildAppleBooksTrackAsin,
  getAppleStorefrontCountry,
  parseAppleBooksSeriesQuery,
  parseAppleBooksTrackId,
} from "./appleBooksIds";

describe("appleBooksIds", () => {
  it("maps Complete Series regions to Apple storefront countries", () => {
    expect(getAppleStorefrontCountry("uk")).toBe("GB");
    expect(getAppleStorefrontCountry("us")).toBe("US");
    expect(getAppleStorefrontCountry("de")).toBe("DE");
  });

  it("round-trips synthetic Apple series and track identifiers", () => {
    const seriesId = buildAppleBooksSeriesId("Known Series: Part 1");
    const trackId = buildAppleBooksTrackAsin("12345");

    expect(seriesId).toBe("apple-books:search:Known%20Series%3A%20Part%201");
    expect(parseAppleBooksSeriesQuery(seriesId)).toBe("Known Series: Part 1");
    expect(trackId).toBe("apple-books:track:12345");
    expect(parseAppleBooksTrackId(trackId)).toBe("12345");
  });

  it("rejects identifiers from other providers", () => {
    expect(parseAppleBooksSeriesQuery("audible-series")).toBeNull();
    expect(parseAppleBooksTrackId("B000AUDIBLE")).toBeNull();
  });
});
