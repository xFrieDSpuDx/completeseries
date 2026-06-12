import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "./audiobook";
import { normaliseIdentifier, normaliseText, valuesOverlap } from "./normalise";
import { getProviderSeriesPosition } from "./providerBookChecks";
import { areSubtitlesCompatible, hasCompatibleTitleEvidence } from "./titleEvidence";

export type TitleMatchOptions = {
  matchNarratorEditions?: boolean;
};

/**
 * Purpose: Build the set of local identifiers that can prove a provider book is
 * already owned.
 *
 * @param localBooks - Every local book found during the scan.
 * @returns Normalised ASIN, SKU, and SKU group values from the local library.
 */
export function buildLocalIdentifierIndex(localBooks: LocalBookEvidence[]): Set<string> {
  return new Set(
    localBooks
      .flatMap((book) => [book.asin, book.sku, book.skuGroup])
      .map(normaliseIdentifier)
      .filter(Boolean)
  );
}

/**
 * Purpose: Decide whether a provider book is already represented locally by
 * matching any strong identifier.
 *
 * @param providerBook - The provider book that may otherwise be reported as
 * missing.
 * @param localIdentifiers - Normalised identifier values from all local books.
 * @returns `true` when provider ASIN, SKU, or SKU group appears locally.
 */
export function hasLocalIdentifierMatch(
  providerBook: ProviderSeriesBook,
  localIdentifiers: Set<string>
): boolean {
  return [providerBook.asin, providerBook.sku, providerBook.skuGroup]
    .map(normaliseIdentifier)
    .filter(Boolean)
    .some((identifier) => localIdentifiers.has(identifier));
}

/**
 * Purpose: Decide whether a provider book is already represented locally by
 * title-level evidence anywhere in the scanned library.
 *
 * @param providerBook - The provider book that may otherwise be reported as
 * missing.
 * @param localBooks - Local books from every scanned Audiobookshelf library.
 * @param options - Optional ownership settings for strict edition matching.
 * @returns `true` when a local book has the same normalised title and at least
 * one supporting signal: compatible subtitle, shared series, shared author, or
 * optional narrator-edition evidence.
 */
export function hasLocalTitleMatch(
  providerBook: ProviderSeriesBook,
  localBooks: LocalBookEvidence[],
  options: TitleMatchOptions = {}
): boolean {
  const providerSubtitle = normaliseText(providerBook.subtitle);

  return localBooks.some((localBook) => {
    const localSubtitle = normaliseText(localBook.subtitle);
    if (!hasCompatibleTitleEvidence(providerBook, localBook)) return false;

    if (
      options.matchNarratorEditions &&
      hasComparableNarratorEvidence(providerBook, localBook) &&
      !valuesOverlap(localBook.narrators, providerBook.narrators)
    ) {
      return false;
    }

    if (hasSharedSeriesName(providerBook, localBook)) return true;

    return (
      areSubtitlesCompatible(localSubtitle, providerSubtitle) ||
      valuesOverlap(localBook.authors, providerBook.authors) ||
      Boolean(
        options.matchNarratorEditions &&
          valuesOverlap(localBook.narrators, providerBook.narrators)
      )
    );
  });
}

/**
 * Purpose: Detect title-compatible local books that were not treated as owned
 * because narrator-sensitive matching found different narrator evidence.
 *
 * @param providerBook - Provider book that may be reported as a different
 * narrator edition.
 * @param localBooks - Local books from every scanned Audiobookshelf library.
 * @returns `true` when a local title candidate exists but narrator evidence
 * differs.
 */
export function hasLocalTitleCandidateWithDifferentNarrator(
  providerBook: ProviderSeriesBook,
  localBooks: LocalBookEvidence[]
): boolean {
  return localBooks.some(
    (localBook) =>
      hasCompatibleTitleEvidence(providerBook, localBook) &&
      hasComparableNarratorEvidence(providerBook, localBook) &&
      !valuesOverlap(localBook.narrators, providerBook.narrators)
  );
}

/**
 * Purpose: Check whether local and provider metadata place a title in the same
 * named series.
 *
 * @param providerBook - Provider book being checked for ownership.
 * @param localBook - Local Audiobookshelf book that has compatible title
 * evidence.
 * @returns `true` when both records share at least one normalised series name.
 */
function hasSharedSeriesName(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): boolean {
  const localSeriesNames = new Set(
    (localBook.seriesNames ?? []).map(normaliseText).filter(Boolean)
  );
  if (localSeriesNames.size === 0) return false;

  return providerBook.series.some((seriesEntry) =>
    localSeriesNames.has(normaliseText(seriesEntry.name))
  );
}

/**
 * Purpose: Decide whether local and provider records both expose narrator names
 * that can be compared for strict edition matching.
 *
 * @param providerBook - Provider book with optional narrator names.
 * @param localBook - Local Audiobookshelf book with optional narrator names.
 * @returns `true` when both records contain at least one narrator.
 */
function hasComparableNarratorEvidence(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): boolean {
  return localBook.narrators.length > 0 && providerBook.narrators.length > 0;
}

/**
 * Purpose: Decide whether a provider book is already represented locally by
 * matching its series position.
 *
 * @param providerBook - The provider book that may otherwise be reported as
 * missing.
 * @param localSeries - The matched Audiobookshelf series containing local
 * position evidence.
 * @param providerSeries - The matched provider series currently being compared.
 * @returns `true` when the provider book position is already present locally.
 */
export function hasLocalSeriesPositionMatch(
  providerBook: ProviderSeriesBook,
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate
): boolean {
  const localPositions = new Set(
    localSeries.books
      .map((book) => book.position.numeric ?? book.position.raw)
      .filter((position) => position !== null)
      .map(String)
  );

  const providerPosition = getProviderSeriesPosition(providerBook, providerSeries);
  return providerPosition !== null && localPositions.has(String(providerPosition));
}
