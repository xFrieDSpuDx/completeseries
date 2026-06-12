import type { LocalBookEvidence } from "../../domain/audiobook";
import { normaliseIdentifier, normaliseText } from "../../domain/normalise";

/**
 * Purpose: Merge local book evidence from series and item endpoints without
 * duplicating the same Audiobookshelf book.
 *
 * @param books - Local book evidence records from multiple API endpoints.
 * @returns De-duplicated local book evidence.
 */
export function mergeLocalBookEvidence(books: LocalBookEvidence[]): LocalBookEvidence[] {
  const booksByKey = new Map<string, LocalBookEvidence>();

  for (const book of books) {
    const key =
      normaliseIdentifier(book.asin) ||
      normaliseIdentifier(book.sku) ||
      normaliseIdentifier(book.skuGroup) ||
      `${normaliseText(book.title)}:${normaliseText(book.subtitle)}`;

    if (!booksByKey.has(key)) booksByKey.set(key, book);
  }

  return [...booksByKey.values()];
}
