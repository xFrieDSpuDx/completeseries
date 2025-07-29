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
 * Generates a human-readable title indicating how many series have missing books.
 *
 * @param {Array<Object>} groupedMissingBooks - List of series with at least one missing book.
 * @returns {string} - A formatted message like "You have 3 series with missing books."
 */
export function getTitleContent(groupedMissingBooks) {
  return `You have ${groupedMissingBooks.length} series with missing books.`;
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
    if (titleText === hiddenItem.series) {
      matchingTile = tile;
    }
  });

  return matchingTile;
}