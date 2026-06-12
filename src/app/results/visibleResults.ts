import type { ProviderSeriesBook, RegionCode } from "../../domain/audiobook";
import { findManualBookMatch, type ManualBookMatch } from "../../domain/manualBookMatches";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { normaliseText, parseSeriesPosition } from "../../domain/normalise";
import { isHiddenBook, isHiddenSeries, type HiddenItem } from "../storage/hiddenItemsStore";

export type VisibleMissingBookGroup = MissingBookGroup & {
  isHidden: boolean;
};

export type ResultsSortOrder =
  | "seriesAsc"
  | "seriesDesc"
  | "authorAsc"
  | "authorDesc"
  | "missingDesc"
  | "missingAsc"
  | "scanOrder";

/**
 * Purpose: Apply hidden item state to scan result groups.
 *
 * @param groups - Missing-book groups from the completed scan.
 * @param hiddenItems - Hidden books and series saved locally.
 * @param manualBookMatches - Books the user manually marked as already owned.
 * @param region - Region used by the completed scan.
 * @param showHiddenItems - Whether hidden books and series should remain
 * visible in the result output.
 * @param sortOrder - Display ordering for visible series groups.
 * @returns Missing-book groups filtered for current visibility settings.
 */
export function buildVisibleMissingGroups(
  groups: MissingBookGroup[],
  hiddenItems: HiddenItem[],
  manualBookMatches: ManualBookMatch[],
  region: RegionCode,
  showHiddenItems: boolean,
  sortOrder: ResultsSortOrder = "seriesAsc"
): VisibleMissingBookGroup[] {
  const visibleGroups = groups
    .map((group) => {
      const groupIsHidden = isHiddenSeries(hiddenItems, group);
      const visibleBooks = showHiddenItems
        ? group.books
        : group.books.filter(
            (book) =>
              !isHiddenBook(hiddenItems, group, book) &&
              !findManualBookMatch(book, buildProviderSeriesReference(group), region, manualBookMatches)
          );

      return {
        ...group,
        books: sortBooksBySeriesPosition(visibleBooks, group),
        isHidden: groupIsHidden,
      };
    })
    .filter((group) => showHiddenItems || (!group.isHidden && group.books.length > 0));

  return sortVisibleGroups(visibleGroups, sortOrder);
}

/**
 * Purpose: Build the provider-series shape needed for manual owned-book checks
 * from a visible missing-book group.
 *
 * @param group - Missing-book group currently being filtered.
 * @returns Provider-series reference for manual match comparison.
 */
function buildProviderSeriesReference(group: MissingBookGroup) {
  return {
    name: group.seriesName,
    seriesAsin: group.seriesAsin,
    providerId: group.providerId ?? "audible",
    providerName: group.providerName ?? "Audible catalogue",
  };
}

/**
 * Purpose: Sort visible result groups for display without mutating the scan
 * result stored in memory.
 *
 * @param groups - Visible groups after hidden-item filtering.
 * @param sortOrder - Requested display sort order.
 * @returns A sorted copy of the visible groups.
 */
function sortVisibleGroups(
  groups: VisibleMissingBookGroup[],
  sortOrder: ResultsSortOrder
): VisibleMissingBookGroup[] {
  if (sortOrder === "scanOrder") return groups;

  return [...groups].sort((first, second) => {
    if (sortOrder === "missingDesc") {
      return (
        second.books.length - first.books.length || compareText(first.seriesName, second.seriesName)
      );
    }

    if (sortOrder === "missingAsc") {
      return (
        first.books.length - second.books.length || compareText(first.seriesName, second.seriesName)
      );
    }

    if (sortOrder === "authorAsc") {
      return compareByPrimaryAuthor(first, second);
    }

    if (sortOrder === "authorDesc") {
      return compareByPrimaryAuthor(second, first);
    }

    if (sortOrder === "seriesDesc") {
      return compareText(second.seriesName, first.seriesName);
    }

    return compareText(first.seriesName, second.seriesName);
  });
}

/**
 * Purpose: Sort result groups by the first useful author attached to their
 * visible missing books.
 *
 * @param first - First visible result group to compare.
 * @param second - Second visible result group to compare.
 * @returns Standard sort comparison with series name as the tie-breaker.
 */
function compareByPrimaryAuthor(
  first: VisibleMissingBookGroup,
  second: VisibleMissingBookGroup
): number {
  return (
    compareText(getPrimaryAuthor(first), getPrimaryAuthor(second)) ||
    compareText(first.seriesName, second.seriesName)
  );
}

/**
 * Purpose: Find a stable author label for a visible result group.
 *
 * @param group - Visible result group whose books may contain author metadata.
 * @returns The first non-empty author from the group's visible books, or an
 * empty string when no author metadata is available.
 */
function getPrimaryAuthor(group: VisibleMissingBookGroup): string {
  for (const book of group.books) {
    const author = book.authors.find((authorName) => normaliseText(authorName));
    if (author) return author;
  }

  return "";
}

/**
 * Purpose: Sort books within a visible series by the provider position shown to
 * the user, falling back to title when position metadata is missing.
 *
 * @param books - Visible missing books for one series group.
 * @param group - Series group that provides the matched series identity.
 * @returns A sorted copy of the visible books.
 */
function sortBooksBySeriesPosition(
  books: ProviderSeriesBook[],
  group: MissingBookGroup
): ProviderSeriesBook[] {
  return [...books].sort((first, second) => {
    const firstPosition = getBookGroupPosition(first, group);
    const secondPosition = getBookGroupPosition(second, group);

    if (firstPosition.numeric !== null && secondPosition.numeric !== null) {
      return firstPosition.numeric - secondPosition.numeric || compareText(first.title, second.title);
    }

    if (firstPosition.numeric !== null) return -1;
    if (secondPosition.numeric !== null) return 1;

    if (firstPosition.raw && secondPosition.raw) {
      return (
        compareText(firstPosition.raw, secondPosition.raw) || compareText(first.title, second.title)
      );
    }

    if (firstPosition.raw) return -1;
    if (secondPosition.raw) return 1;

    return compareText(first.title, second.title);
  });
}

/**
 * Purpose: Find the provider-series position that belongs to the visible result
 * group rather than another crossover series on the same book.
 *
 * @param book - Provider book being sorted.
 * @param group - Visible result group containing the book.
 * @returns Parsed series position for the matching group.
 */
function getBookGroupPosition(book: ProviderSeriesBook, group: MissingBookGroup) {
  const matchingSeries =
    book.series.find((series) => series.asin && series.asin === group.seriesAsin) ??
    book.series.find(
      (series) => normaliseText(series.name) === normaliseText(group.seriesName)
    ) ??
    book.series[0];

  return parseSeriesPosition(matchingSeries?.position);
}

/**
 * Purpose: Compare display text consistently for human-facing alphabetical
 * ordering.
 *
 * @param firstValue - First text value to compare.
 * @param secondValue - Second text value to compare.
 * @returns Standard sort comparison result.
 */
function compareText(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): number {
  return (firstValue ?? "").localeCompare(secondValue ?? "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Purpose: Count how many scanned missing result entries are currently hidden.
 *
 * @param groups - Missing-book groups from the completed scan.
 * @param hiddenItems - Hidden books and series saved locally.
 * @returns Counts of hidden series and books represented in the current result.
 */
export function countHiddenResultItems(
  groups: MissingBookGroup[],
  hiddenItems: HiddenItem[]
): { series: number; books: number } {
  return {
    series: groups.filter((group) => isHiddenSeries(hiddenItems, group)).length,
    books: groups.reduce(
      (total, group) =>
        total + group.books.filter((book) => isHiddenBook(hiddenItems, group, book)).length,
      0
    ),
  };
}
