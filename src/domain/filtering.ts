import type { ProviderSeriesBook } from "./audiobook";

export type MissingBookFilters = {
  onlyUnabridged: boolean;
  includeFutureReleases: boolean;
  includeUnavailable: boolean;
};

/**
 * Purpose: Apply user-facing filters to a list of provider books that may be
 * missing from the local library.
 *
 * @param books - Provider books that have already passed the matching step.
 * @param filters - Filter settings for abridged books, future releases, and
 * unavailable provider titles.
 * @returns The provider books that should remain visible after filters are
 * applied.
 */
export function filterMissingBookCandidates(
  books: ProviderSeriesBook[],
  filters: MissingBookFilters
): ProviderSeriesBook[] {
  return books.filter((book) => {
    if (!filters.includeUnavailable && book.isAvailable === false) return false;
    if (filters.onlyUnabridged && book.bookFormat !== "unabridged") return false;
    if (!filters.includeFutureReleases && isFutureRelease(book.releaseDate)) return false;
    return true;
  });
}

/**
 * Purpose: Decide whether a provider release date is later than today.
 *
 * @param releaseDate - Provider release date string.
 * @param now - Current date used for comparison, injectable for tests.
 * @returns `true` when the release date is valid and after today's local
 * midnight.
 */
function isFutureRelease(releaseDate: string | null | undefined, now = new Date()): boolean {
  if (!releaseDate) return false;

  const releaseTime = new Date(releaseDate).getTime();
  if (!Number.isFinite(releaseTime)) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return releaseTime > today.getTime();
}
