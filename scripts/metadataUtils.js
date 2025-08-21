import { getHiddenItems } from "./visibility.js";

/**
 * Finds the position value for a given series name.
 * Returns "N/A" if not available.
 * @param {Array<Object>} seriesMetadataArray
 * @param {string} seriesName
 * @returns {string}
 */
export function getPositionBySeriesName(seriesMetadataArray, seriesName) {
  const matchedSeries = seriesMetadataArray.find((series) => series.name === seriesName);

  return matchedSeries && matchedSeries.position != null ? matchedSeries.position : "N/A";
}

/**
 * Produce the title string "N of your series are missing books".
 * Uses `countSeriesMissingBooks` so the text reflects the rules above.
 *
 * @param {GroupedSeries[]} groupedMissingBooks
 * @returns {string}
 */
export function getTitleContent(groupedMissingBooks) {
  const stillMissingCount = countSeriesMissingBooks(groupedMissingBooks);
  return `${stillMissingCount} of your series are missing books`;
}

/**
 * Finds and returns the `.series-tile` DOM element corresponding to a hidden item's series name.
 *
 * @param {Object} hiddenItem - The object representing the hidden book or series.
 * @param {string} hiddenItem.series - The name of the series to look for.
 * @returns {HTMLElement|false} - The matching `.series-tile` element, or false if not found.
 */
export function getItemSeries(hiddenItem) {
  const seriesTiles = document.querySelectorAll(".series-tile");
  let matchingTile = false;

  seriesTiles.forEach((tile) => {
    const titleText = tile.querySelector(".series-title")?.textContent;
    if (titleText === hiddenItem.series) matchingTile = tile;
  });

  return matchingTile;
}

/**
 * Choose a stable identifier for a book. Prefer ASIN; fall back to title.
 * Note: case-sensitive on title; keep consistent across your app.
 * @param {{ asin?: string, title?: string }} bookLike
 * @returns {string|undefined}
 */
function getBookIdentifier(bookLike) {
  return bookLike?.asin ?? bookLike?.title;
}

/**
 * Build fast lookups from hidden items for O(1) checks.
 * - hiddenSeriesByName:     Set of hidden series display names.
 * - hiddenSeriesByAsin:     Set of hidden series ASINs (if your data includes them).
 * - hiddenSeriesBookAsins:  Set of ASINs found on hidden "series" entries that actually
 *                           refer to a representative book (back-compat with your data).
 * - hiddenBooksBySeriesName: Map seriesName -> Set of hidden book identifiers (asin|title).
 *
 * @param {HiddenItem[]} hiddenItems
 */
export function buildHiddenIndexFromItems(hiddenItems) {
  const hiddenSeriesByName = new Set();
  const hiddenSeriesByAsin = new Set();
  const hiddenSeriesBookAsins = new Set();
  const hiddenBooksBySeriesName = new Map();

  for (const hiddenItem of hiddenItems) {
    const { type, series, asin, title } = hiddenItem;

    if (type === "series") {
      if (series) hiddenSeriesByName.add(series);
      if (asin) {
        // If you store a true series-level ASIN, this catches it.
        hiddenSeriesByAsin.add(asin);
        // In your current data, series items may carry a book ASIN; track that too.
        hiddenSeriesBookAsins.add(asin);
      }
      continue;
    }

    if (type === "book" && series) {
      const identifier = asin ?? title;
      if (!identifier) continue;

      if (!hiddenBooksBySeriesName.has(series)) {
        hiddenBooksBySeriesName.set(series, new Set());
      }
      hiddenBooksBySeriesName.get(series).add(identifier);
    }
  }

  return {
    hiddenSeriesByName,
    hiddenSeriesByAsin,
    hiddenSeriesBookAsins,
    hiddenBooksBySeriesName,
  };
}

/**
 * Decide if a series is explicitly hidden:
 *  - by its display name
 *  - by its series-level ASIN (if provided)
 *  - or by any representative book ASIN on a hidden "series" record (legacy shape)
 *
 * @param {GroupedSeries} seriesEntry
 * @param {ReturnType<typeof buildHiddenIndexFromItems>} index
 * @returns {boolean}
 */
function isSeriesExplicitlyHidden(seriesEntry, index) {
  const { series, seriesAsin, books } = seriesEntry;

  if (index.hiddenSeriesByName.has(series)) return true;
  if (seriesAsin && index.hiddenSeriesByAsin.has(seriesAsin)) return true;

  // Back-compat: treat hidden series items that carry a *book* ASIN as a series hide.
  const hasRepresentativeHiddenBook =
    Array.isArray(books) &&
    books.some((book) => book.asin && index.hiddenSeriesBookAsins.has(book.asin));

  return hasRepresentativeHiddenBook;
}

/**
 * Check whether all "missing" books of a series are hidden.
 * (If a series has zero books in the grouped entry, this returns false.)
 *
 * @param {GroupedSeries} seriesEntry
 * @param {ReturnType<typeof buildHiddenIndexFromItems>} index
 * @returns {boolean}
 */
function areAllSeriesBooksHidden(seriesEntry, index) {
  const { series, books } = seriesEntry;
  const bookList = Array.isArray(books) ? books : [];
  if (bookList.length === 0) return false;

  const hiddenSetForSeries = index.hiddenBooksBySeriesName.get(series) ?? new Set();

  let hiddenMatchCount = 0;

  for (const book of bookList) {
    const identifier = getBookIdentifier(book);
    if (!identifier) continue;
    if (hiddenSetForSeries.has(identifier)) hiddenMatchCount += 1;
  }

  return hiddenMatchCount === bookList.length;
}

/**
 * Count how many series in `groupedMissingBooks` are STILL missing books,
 * after applying these rules:
 *  1) If the series itself is hidden (by name or series ASIN, or legacy book-ASIN),
 *     it does NOT count as "missing".
 *  2) If *all* missing books in a series are hidden, it does NOT count as "missing".
 *  3) Otherwise, it counts as "missing".
 *
 * @param {GroupedSeries[]} groupedMissingBooks
 * @param {HiddenItem[]=} hiddenItemsOverride optional: pass your own list for testing
 * @returns {number}
 */
export function countSeriesMissingBooks(groupedMissingBooks, hiddenItemsOverride) {
  const hiddenItems = Array.isArray(hiddenItemsOverride) ? hiddenItemsOverride : getHiddenItems();

  const hiddenIndex = buildHiddenIndexFromItems(hiddenItems);

  let seriesStillMissingCount = 0;

  for (const seriesEntry of groupedMissingBooks) {
    // Skip if the series is explicitly hidden.
    if (isSeriesExplicitlyHidden(seriesEntry, hiddenIndex)) {
      continue;
    }
    // Skip if all missing books in that series are hidden.
    if (areAllSeriesBooksHidden(seriesEntry, hiddenIndex)) {
      continue;
    }
    // Otherwise, this series is still missing at least one visible book.
    seriesStillMissingCount += 1;
  }

  return seriesStillMissingCount;
}
