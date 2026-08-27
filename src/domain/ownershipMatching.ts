import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "./audiobook";
import {
  normaliseIdentifier,
  normaliseText,
  parseSeriesPosition,
  valuesOverlap,
} from "./normalise";
import { getProviderSeriesPositionEvidence } from "./providerBookChecks";
import {
  formatSeriesPosition,
  hasSeriesPositionEvidence,
  isWholeNumberSeriesPositionRange,
  seriesPositionCovers,
} from "./seriesPositionCoverage";
import {
  areSubtitlesCompatible,
  buildTitleEvidence,
  hasCompatibleTitleEvidence,
} from "./titleEvidence";

export type TitleMatchOptions = {
  matchNarratorEditions?: boolean;
};

export type LocalSeriesPositionMatch = {
  localPosition: string;
  providerPosition: string;
  localPositionIsRange: boolean;
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

    const sharedSeriesNames = getSharedSeriesNames(providerBook, localBook);
    const sharedSeriesName = sharedSeriesNames.length > 0;
    if (
      sharedSeriesName &&
      hasConflictingSeriesPositionEvidence(providerBook, localBook) &&
      hasSeriesTitleAsBookTitle(providerBook, localBook, sharedSeriesNames)
    ) {
      return false;
    }

    if (sharedSeriesName) return true;

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
 * Purpose: Find series names shared by a provider book and local book.
 *
 * @param providerBook - Provider book being checked for ownership.
 * @param localBook - Local Audiobookshelf book that has compatible title
 * evidence.
 * @returns Shared normalised series names.
 */
function getSharedSeriesNames(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): string[] {
  const localSeriesNames = new Set(
    (localBook.seriesNames ?? []).map(normaliseText).filter(Boolean)
  );
  if (localSeriesNames.size === 0) return [];

  return providerBook.series
    .map((seriesEntry) => normaliseText(seriesEntry.name))
    .filter((seriesName) => seriesName && localSeriesNames.has(seriesName));
}

/**
 * Purpose: Stop title-only ownership matches from hiding clearly different
 * entries in the same series.
 *
 * @param providerBook - Provider book being checked for ownership.
 * @param localBook - Local book with compatible title and shared series
 * evidence.
 * @returns `true` when both records expose series-position evidence but the
 * local position does not cover any provider position.
 */
function hasConflictingSeriesPositionEvidence(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): boolean {
  if (!hasSeriesPositionEvidence(localBook.position)) return false;

  const providerPositions = providerBook.series
    .map((seriesEntry) => parseSeriesPosition(seriesEntry.position))
    .filter(hasSeriesPositionEvidence);
  if (providerPositions.length === 0) return false;

  return !providerPositions.some((providerPosition) =>
    seriesPositionCovers(localBook.position, providerPosition)
  );
}

/**
 * Purpose: Detect series where the book title is also the series title, because
 * those need position evidence to avoid hiding later numbered entries.
 *
 * @param providerBook - Provider book being checked for ownership.
 * @param localBook - Local Audiobookshelf book with compatible title evidence.
 * @param sharedSeriesNames - Normalised series names shared by both records.
 * @returns `true` when either title is the same as a shared series name.
 */
function hasSeriesTitleAsBookTitle(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence,
  sharedSeriesNames: string[]
): boolean {
  const providerTitleEvidence = buildTitleEvidence(providerBook.title, providerBook.subtitle);
  const localTitleEvidence = buildTitleEvidence(localBook.title, localBook.subtitle);

  return sharedSeriesNames.some(
    (seriesName) => providerTitleEvidence.has(seriesName) || localTitleEvidence.has(seriesName)
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
  return findLocalSeriesPositionMatch(providerBook, localSeries, providerSeries) !== null;
}

/**
 * Purpose: Find the local series position that already covers a provider book.
 *
 * @param providerBook - The provider book that may otherwise be reported as
 * missing.
 * @param localSeries - The matched Audiobookshelf series containing local
 * position evidence.
 * @param providerSeries - The matched provider series currently being compared.
 * @returns Details of the first local position that covers the provider
 * position, or `null` when no coverage exists.
 */
export function findLocalSeriesPositionMatch(
  providerBook: ProviderSeriesBook,
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate
): LocalSeriesPositionMatch | null {
  const providerPosition = getProviderSeriesPositionEvidence(providerBook, providerSeries);
  if (!hasSeriesPositionEvidence(providerPosition)) return null;

  for (const localBook of localSeries.books) {
    if (!seriesPositionCovers(localBook.position, providerPosition)) continue;

    return {
      localPosition: formatSeriesPosition(localBook.position),
      providerPosition: formatSeriesPosition(providerPosition),
      localPositionIsRange: isWholeNumberSeriesPositionRange(localBook.position),
    };
  }

  return null;
}
