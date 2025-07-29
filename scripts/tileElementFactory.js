import { addDivElement, addImageElement } from "./elementFactory.js";
import { generateBookTiles } from "./bookTileBuilder.js";
import { openBookModal } from "./modalHandler.js";
import { showBooksModal, adjustModalWidth } from "./uiFeedback.js";
/**
 * Retrieves an HTML element by its ID.
 * 
 * @param {string} elementId - The ID of the HTML element to retrieve.
 * @returns {HTMLElement} The matching DOM element.
 */
export function getHTMLElement(elementId) {
  return document.getElementById(elementId);
}

/**
 * Creates and appends a grid container for displaying multiple series or book tiles.
 *
 * @param {HTMLElement} parentElement - The parent element to which the grid container will be appended.
 * @returns {HTMLDivElement} The created grid container element.
 */
export function addSeriesGridContainer(parentElement) {
  return addDivElement({ className: "series-grid" }, parentElement);
}

/**
 * Creates a wrapper element for a series or book tile and attaches click behavior.
 * If the metadata contains a `books` array, it opens a modal showing book tiles.
 * Otherwise, it opens the individual book detail modal.
 *
 * @param {Object} bookMetadata - The metadata object for the book or series.
 * @param {HTMLElement} parentElement - The element to append the wrapper to.
 * @returns {HTMLDivElement} The created tile wrapper element.
 */
export function addTileWrapper(bookMetadata, parentElement) {
  const tileContainerWrapper = addDivElement(
    { className: "tile-wrapper" },
    parentElement
  );

  tileContainerWrapper.addEventListener("click", (event) => {
    event.stopPropagation();

    const isSeries = bookMetadata.hasOwnProperty("books");

    if (isSeries) {
      generateBookTiles(bookMetadata);
      adjustModalWidth(bookMetadata.books.length);
      showBooksModal();
    } else {
      openBookModal(bookMetadata, tileContainerWrapper);
    }
  });

  return tileContainerWrapper;
}

/**
 * Creates and appends a container div for a single book or series tile.
 *
 * @param {HTMLElement} parentElement - The element to which the tile container will be appended.
 * @returns {HTMLDivElement} The created tile container element.
 */
export function addSeriesTile(parentElement) {
  return addDivElement({ className: "series-tile" }, parentElement);
}

/**
 * Creates and appends a badge element displaying a numeric value (e.g. number of missing books).
 *
 * @param {HTMLElement} parentElement - The container to append the badge to.
 * @param {string|number} textContentValue - The value to display inside the badge.
 * @returns {HTMLDivElement} The created badge element.
 */
export function addSeriesBadge(parentElement, textContentValue) {
  return addDivElement(
    { className: "series-badge", textContent: textContentValue },
    parentElement
  );
}

/**
 * Appends a book or series image to the given parent element.
 *
 * @param {HTMLElement} parentElement - The container to which the image will be appended.
 * @param {Object} bookMetadata - The metadata object containing the image URL.
 * @param {string} altText - The alternative text for the image (used for accessibility).
 * @returns {HTMLImageElement} The created and appended image element.
 */
export function addSeriesImage(parentElement, bookMetadata, altText) {
  return addImageElement(
    {
      className: "series-image",
      src: bookMetadata.imageUrl,
      alt: altText,
    },
    parentElement
  );
}

/**
 * Appends a series title element to the given parent.
 * Typically used for rendering the title beneath a book or series image.
 *
 * @param {HTMLElement} parentElement - The container to append the title element to.
 * @param {string} textContentValue - The text content of the title (e.g. series or book name).
 * @returns {HTMLDivElement} The created title element.
 */
export function addSeriesTitle(parentElement, textContentValue) {
  return addDivElement(
    { className: "series-title", textContent: textContentValue },
    parentElement
  );
}

/**
 * Appends a wrapper div for the eye icon to the given parent element.
 *
 * @param {HTMLElement} parentElement - The element to which the eye badge container is added.
 * @returns {HTMLDivElement} The created eye badge div element.
 */
export function addEyeBadge(parentElement) {
  return addDivElement({ className: "eye-badge" }, parentElement);
}