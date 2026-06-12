import { describe, expect, it } from "vitest";
import type { LocalBookEvidence } from "../../domain/audiobook";
import { parseSeriesPosition } from "../../domain/normalise";
import {
  formatBookIdentifiers,
  formatBookPosition,
  formatBookTitle,
  formatEvidenceLevel,
  formatLookupAnchors,
  formatProviderName,
  formatProviderStep,
} from "./reviewEvidenceFormatters";

describe("reviewEvidenceFormatters", () => {
  it("summarises lookup anchor counts", () => {
    expect(formatLookupAnchors([])).toBe("no lookup anchors");
    expect(formatLookupAnchors([{ kind: "ASIN", value: "B123" }])).toBe("1 lookup anchor used");
    expect(
      formatLookupAnchors([
        { kind: "ASIN", value: "B123" },
        { kind: "ISBN", value: "9780000000001" },
      ])
    ).toBe("2 lookup anchors used");
  });

  it("formats provider and evidence labels", () => {
    expect(formatProviderName({ ...candidate(), providerName: "Apple Books" })).toBe(
      "Apple Books"
    );
    expect(formatProviderName({ ...candidate(), providerName: undefined, providerId: "googleBooks" }))
      .toBe("googleBooks");
    expect(formatEvidenceLevel("trusted")).toBe("trusted");
    expect(formatEvidenceLevel("weak")).toBe("weak evidence");
    expect(formatEvidenceLevel(undefined)).toBe("review evidence");
  });

  it("formats provider trace steps with optional counts", () => {
    expect(formatProviderStep({ label: "Series search", status: "success" })).toBe("success");
    expect(
      formatProviderStep({
        label: "Series search",
        status: "success",
        requestCount: 2,
        candidateCount: 5,
      })
    ).toBe("success (2 requests, 5 candidates)");
  });

  it("formats local book evidence for Review", () => {
    const book = localBook();

    expect(formatBookTitle(book)).toBe("The Sign of Four: Sherlock Holmes");
    expect(formatBookPosition(book)).toBe("#2");
    expect(formatBookIdentifiers(book)).toBe("ASIN B123, SKU SKU1, SKU group GROUP1");
    expect(formatBookIdentifiers({ ...book, asin: null, sku: null, skuGroup: null })).toBe(
      "no identifiers"
    );
  });
});

/**
 * Purpose: Build a minimal candidate review fixture.
 *
 * @returns Series candidate review fixture.
 */
function candidate() {
  return {
    seriesAsin: "SERIES1",
    name: "Series",
    providerId: "audible",
    bookCount: 1,
    score: 40,
    reason: "test",
    signals: {
      asinMatches: 0,
      isbnMatches: 0,
      skuMatches: 0,
      titleMatches: 0,
      subtitleMatches: 0,
      positionMatches: 0,
      authorMatches: 0,
      seriesNameSimilarity: 0,
    },
    accepted: false,
  };
}

/**
 * Purpose: Build a local book fixture for Review label tests.
 *
 * @returns Local book fixture.
 */
function localBook(): LocalBookEvidence {
  return {
    id: "local",
    title: "The Sign of Four",
    subtitle: "Sherlock Holmes",
    asin: "B123",
    sku: "SKU1",
    skuGroup: "GROUP1",
    authors: [],
    narrators: [],
    position: parseSeriesPosition("2"),
  };
}
