/**
 * Returns the current transform string used to animate the book modal
 * from its origin (usually a clicked tile) to the center of the screen.
 *
 * @returns {string|null} The transform CSS string used for modal animation.
 */
export let bookDetailModalAnchor = null;

/**
 * Extracts and formats human-readable book metadata for display in the modal.
 *
 * @param {Object} bookData - The book metadata object.
 * @returns {Object} An object with preformatted display strings for authors, genres, etc.
 */
export function extractFormattedBookInfo(bookData) {
  return {
    authors: bookData.authors?.length
      ? bookData.authors.map(a => a.name).join(", ")
      : "Unknown",
    genres: bookData.genres?.length
      ? bookData.genres.map(g => g.name || g).join(", ")
      : "Unknown",
    narrators: bookData.narrators?.length
      ? bookData.narrators.map(n => n.name || n).join(", ")
      : "Unknown",
    publisher: bookData.publisher || "Unknown",
    releaseDate: bookData.releaseDate
      ? new Date(bookData.releaseDate).toLocaleDateString()
      : "Unknown",
    length: bookData.lengthMinutes
      ? Math.round(bookData.lengthMinutes / 60) + " hrs"
      : "Unknown",
    rating: bookData.rating ? bookData.rating.toFixed(2) : "N/A",
    summary: bookData.summary || bookData.description || "No description available."
  };
}

/**
 * Calculates the transform values needed to animate the modal from the clicked tile to the screen center.
 *
 * @param {HTMLElement} sourceTile - The tile element that was clicked.
 * @param {HTMLElement} modalElement - The modal to be transformed.
 * @returns {Object} An object with `transform` and `anchor` transform strings.
 */
export function calculateModalTransform(sourceTile, modalElement) {
  const rect = sourceTile.getBoundingClientRect();
  const tileCenterX = rect.left + rect.width / 2;
  const tileCenterY = rect.top + rect.height / 2;

  const modalCenterX = window.innerWidth / 2;
  const modalCenterY = window.innerHeight * 0.05 + modalElement.offsetHeight / 2;

  const offsetX = tileCenterX - modalCenterX;
  const offsetY = tileCenterY - modalCenterY;

  if (window.innerWidth > 950) {
    return {
      transform: `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(0)`,
      anchor: `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(0)`
    };
  } else {
    return {
      transform: `translateX(0)`,
      anchor: `translate(0, ${offsetY}px) scale(0)`
    };
  }
}