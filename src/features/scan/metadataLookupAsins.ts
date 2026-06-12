import type { LocalBookEvidence } from "../../domain/audiobook";

export type MetadataLookupMode = "quick" | "balanced" | "thorough";

const BALANCED_ASIN_LOOKUP_LIMIT = 3;

/**
 * Purpose: Pick which local book ASINs should be used for metadata lookup.
 *
 * @param books - Local books from a single Audiobookshelf series.
 * @param metadataLookupMode - Lookup strategy: quick uses one ASIN, balanced
 * uses a small spread of anchors, and thorough uses every usable ASIN.
 * @returns ASINs to try against the metadata provider, de-duplicated and ordered
 * by usefulness.
 */
export function getMetadataLookupAsins(
  books: LocalBookEvidence[],
  metadataLookupMode: MetadataLookupMode
): string[] {
  const usableBooks = books
    .map((book, index) => ({
      asin: book.asin?.trim() ?? null,
      book,
      index,
    }))
    .filter((entry): entry is { asin: string; book: LocalBookEvidence; index: number } =>
      Boolean(entry.asin && entry.asin !== "Unknown ASIN")
    );

  if (metadataLookupMode === "thorough") {
    return uniqueAsins(usableBooks.map((entry) => entry.asin));
  }

  const firstPositionBook = [...usableBooks]
    .filter((entry) => entry.book.position.numeric !== null)
    .sort((first, second) => first.book.position.numeric! - second.book.position.numeric!)[0];

  if (metadataLookupMode === "quick") {
    return uniqueAsins([firstPositionBook?.asin, usableBooks[0]?.asin]).slice(0, 1);
  }

  const middleBook = usableBooks[Math.floor((usableBooks.length - 1) / 2)];
  const lastBook = usableBooks.at(-1);

  return uniqueAsins([
    firstPositionBook?.asin,
    usableBooks[0]?.asin,
    middleBook?.asin,
    lastBook?.asin,
  ]).slice(0, BALANCED_ASIN_LOOKUP_LIMIT);
}

/**
 * Purpose: Remove duplicate ASIN values while keeping their first-seen order.
 *
 * @param asins - ASIN values that may contain duplicates or empty values.
 * @returns Unique, non-empty ASIN values.
 */
function uniqueAsins(asins: Array<string | null | undefined>): string[] {
  return [...new Set(asins.filter((asin): asin is string => Boolean(asin)))];
}
