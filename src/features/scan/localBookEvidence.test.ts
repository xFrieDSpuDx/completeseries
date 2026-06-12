import { describe, expect, it } from "vitest";
import type { LocalBookEvidence } from "../../domain/audiobook";
import { mergeLocalBookEvidence } from "./localBookEvidence";

describe("mergeLocalBookEvidence", () => {
  it("deduplicates local books by provider identifiers before title fallback", () => {
    const books = mergeLocalBookEvidence([
      buildLocalBook({ id: "first", asin: "B000ASIN", title: "First Title" }),
      buildLocalBook({ id: "duplicate-asin", asin: "b000asin", title: "Changed Title" }),
      buildLocalBook({ id: "sku", sku: "SKU-1", title: "Second Title" }),
      buildLocalBook({ id: "duplicate-sku", sku: "sku-1", title: "Second Title Updated" }),
    ]);

    expect(books.map((book) => book.id)).toEqual(["first", "sku"]);
  });

  it("falls back to normalised title and subtitle when no identifiers exist", () => {
    const books = mergeLocalBookEvidence([
      buildLocalBook({ id: "title", title: "The Title", subtitle: "A Story" }),
      buildLocalBook({ id: "same-title", title: "the title", subtitle: "a story" }),
      buildLocalBook({ id: "different-subtitle", title: "The Title", subtitle: "Another Story" }),
    ]);

    expect(books.map((book) => book.id)).toEqual(["title", "different-subtitle"]);
  });
});

function buildLocalBook(overrides: Partial<LocalBookEvidence>): LocalBookEvidence {
  return {
    id: "book",
    title: "Book",
    authors: [],
    narrators: [],
    position: { numeric: null, raw: null },
    ...overrides,
  };
}
