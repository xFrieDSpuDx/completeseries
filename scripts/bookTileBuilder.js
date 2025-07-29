import { addTileWrapper, addSeriesTile, addSeriesBadge, addSeriesImage, addSeriesTitle, addEyeBadge, addSeriesGridContainer } from "./tileElementFactory.js";
import { addTextElement, emptyDivContent } from "./elementFactory.js";
import { getPositionBySeriesName } from "./metadataUtils.js";
import { addEyeIcon } from "./eyeFactory.js";
import { hideItemObjectBuilder } from "./tileVisibilityUpdater.js";
import { isCurrentlyHidden } from "./visibility.js";

/**
 * Renders all visible book tiles for a given series inside the modal view.
 * Skips any books currently marked as hidden.
 *
 * @param {Object} seriesData - The series object containing a list of books.
 * @param {string} seriesData.series - The title of the series.
 * @param {Array<Object>} seriesData.books - Array of book metadata objects.
 */
export function generateBookTiles(seriesData) {
  const modalBooksContainer = document.getElementById("modalContent");
  emptyDivContent(modalBooksContainer);

  const seriesTitle = seriesData.series;
  addTextElement(seriesTitle, "h3", modalBooksContainer);

  const tileGridContainer = addSeriesGridContainer(modalBooksContainer);

  for (const bookData of seriesData.books) {
    renderBookTile(bookData, tileGridContainer, seriesTitle);
  }
}

/**
 * Renders a single book tile inside the modal grid.
 * Skips hidden books and builds full tile structure with image, badge, title, and eye icon.
 *
 * @param {Object} bookData - The metadata for the book.
 * @param {HTMLElement} container - The parent grid container to append the tile to.
 * @param {string} seriesTitle - The series name this book belongs to.
 */
function renderBookTile(bookData, container, seriesTitle) {
  const bookTitle = bookData.title;
  const hiddenItem = hideItemObjectBuilder(bookData, seriesTitle, "book");
  const isHidden = isCurrentlyHidden(hiddenItem);
  if (isHidden) return;

  const tileWrapper = addTileWrapper(bookData, container);
  const tileInner = addSeriesTile(tileWrapper);

  const positionInSeries = getPositionBySeriesName(bookData.series, seriesTitle);

  addSeriesBadge(tileInner, positionInSeries);
  addSeriesImage(tileInner, bookData, bookTitle);
  addSeriesTitle(tileInner, bookTitle);

  const eyeBadge = addEyeBadge(tileInner);
  addEyeIcon(eyeBadge, tileWrapper, hiddenItem, isHidden);
}