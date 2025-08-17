import { getHTMLElement, addTileWrapper, addSeriesTile, addSeriesBadge, addSeriesImage, addSeriesTitle, addEyeBadge, addSeriesGridContainer } from "./tileElementFactory.js";
import { addTextElement } from "./elementFactory.js";
import { getTitleContent } from "./metadataUtils.js";
import { hideItemObjectBuilder } from "./tileVisibilityUpdater.js";
import { addEyeIcon } from "./eyeFactory.js";
import { isCurrentlyHidden, totalHiddenInSeries } from "./visibility.js";
/**
 * Renders all series tiles and their associated book metadata.
 * This is the entry point for populating the main grid of missing book series.
 *
 * @param {Array<Object>} groupedMissingBooks - An array of series objects with missing books.
 * Each object should include a `series` name and a `books` array.
 */
export function renderSeriesAndBookTiles(groupedMissingBooks) {
  const outputContainer = getHTMLElement("seriesOutput");
  const titleContent = getTitleContent(groupedMissingBooks);

  // Add header text (e.g. "You have 3 series with missing books.")
  addTextElement(titleContent, "h2", outputContainer);

  const tileGridContainer = addSeriesGridContainer(outputContainer);

  // Render a tile for each series
  for (const seriesData of groupedMissingBooks)
    generateSeriesTiles(seriesData, tileGridContainer);
}

/**
 * Renders a single series tile including its image, title, missing count badge, and visibility icon.
 *
 * @param {Object} seriesData - The data object representing a series and its books.
 * @param {string} seriesData.series - The title of the series.
 * @param {Array<Object>} seriesData.books - Array of book metadata objects in the series.
 * @param {HTMLElement} outputContainer - The container element to which the tile will be appended.
 */
function generateSeriesTiles(seriesData, outputContainer) {
  const missingBooksCount = seriesData.books.length;
  const seriesTitle = seriesData.series;
  const firstBook = seriesData.books[0];

  // Build the hidden item object for series visibility
  const hiddenItem = hideItemObjectBuilder(firstBook, seriesTitle, "series");
  const isHidden = isCurrentlyHidden(hiddenItem);

  // Create tile container and inner layout
  const tileContainerWrapper = addTileWrapper(seriesData, outputContainer);
  const tileInnerContainer = addSeriesTile(tileContainerWrapper);

  // Adjust badge count to exclude already hidden books
  const hiddenBooksInSeries = totalHiddenInSeries(seriesTitle);
  const visibleMissingCount = missingBooksCount - hiddenBooksInSeries;

  addSeriesBadge(tileInnerContainer, visibleMissingCount);
  addSeriesImage(tileInnerContainer, firstBook, seriesTitle);
  addSeriesTitle(tileInnerContainer, seriesTitle);

  // Add visibility toggle (eye icon)
  const eyeBadge = addEyeBadge(tileInnerContainer);
  addEyeIcon(eyeBadge, tileContainerWrapper, hiddenItem, isHidden);
}