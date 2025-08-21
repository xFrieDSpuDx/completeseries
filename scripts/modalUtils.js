/**
 * Returns the current transform string used to animate the book modal
 * from its origin (usually a clicked tile) to the center of the screen.
 *
 * @returns {string|null} The transform CSS string used for modal animation.
 */
// eslint-disable-next-line prefer-const
export let bookDetailModalAnchor = null;

/**
 * Extracts and formats human-readable book metadata for display in the modal.
 *
 * @param {Object} bookData - The book metadata object.
 * @returns {Object} An object with preformatted display strings for authors, genres, etc.
 */
export function extractFormattedBookInfo(bookData = {}) {
  // Helpers kept local to avoid polluting scope
  const toNames = (array) =>
    array
      .map((bookValue) =>
        typeof bookValue === "string" ? bookValue : (bookValue?.name ?? bookValue)
      )
      .filter(Boolean);

  const isNum = (numberValue) => typeof numberValue === "number" && Number.isFinite(numberValue);

  const formatDate = (value) => {
    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime()) ? "Unknown" : dateValue.toLocaleDateString();
  };

  const authors =
    Array.isArray(bookData.authors) && bookData.authors.length
      ? toNames(bookData.authors).join(", ")
      : "Unknown";

  const genres =
    Array.isArray(bookData.genres) && bookData.genres.length
      ? toNames(bookData.genres).join(", ")
      : "Unknown";

  const narrators =
    Array.isArray(bookData.narrators) && bookData.narrators.length
      ? toNames(bookData.narrators).join(", ")
      : "Unknown";

  const publisher = bookData.publisher || "Unknown";

  const releaseDate = bookData.releaseDate ? formatDate(bookData.releaseDate) : "Unknown";

  const length = isNum(bookData.lengthMinutes)
    ? `${Math.round(bookData.lengthMinutes / 60)} hrs`
    : "Unknown";

  const rating = isNum(bookData.rating) ? bookData.rating.toFixed(2) : "N/A";

  const summary = bookData.summary || bookData.description || "No description available.";

  return {
    authors,
    genres,
    narrators,
    publisher,
    releaseDate,
    length,
    rating,
    summary,
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
      anchor: `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(0)`,
    };
  } else {
    return {
      transform: `translateX(0)`,
      anchor: `translate(0, ${offsetY}px) scale(0)`,
    };
  }
}
