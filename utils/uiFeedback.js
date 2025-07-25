// ui.js

/**
 * Updates the UI message and displays it to the user.
 * @param {string} text - The message to display.
 */
export function setMessage(text) {
  document.getElementById("statusText").textContent = text;
}

/**
 * Displays the loading spinner.
 */
export function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}

/**
 * Hides the loading spinner.
 */
export function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

/**
 * Shows or hides an element by ID.
 * @param {string} elementId
 * @param {boolean} show
 */
export function toggleElementVisibility(elementId, show) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = show ? "flex" : "none";
  }
}

export function toggleElementVisibilityFullEntity(element, show) {
  element.style.display = show ? "flex" : "none";
}

/**
 * Shows the book modal and adds the overlay
 */
export function showBooksModal() {
  booksModal.classList.add("active");
  modalOverlay.classList.add("active");
}

/**
 * Sets the modal width based on tile cound
 * @param {*} tileCount 
 */
export function adjustModalWidth(tileCount) {
  const tileWidth = 280;
  const extraPadding = 45;
  const minWidth = tileWidth + extraPadding;
  const maxWidth = Math.min(window.innerWidth * 0.95, 1165); // 95% of viewport width or 870px whichever is smaller

  // Determine how many tiles can fit in current screen width
  const maxTilesPerRow = Math.floor((maxWidth - extraPadding) / (tileWidth));

  // Calculate how many tiles we want to show (whichever is smaller)
  const visibleTiles = Math.min(tileCount, maxTilesPerRow);

  // Final width based on number of visible tiles
  const calculatedWidth = (visibleTiles * tileWidth) + extraPadding;

  // Constrain between min and max
  const finalWidth = Math.max(minWidth, Math.min(calculatedWidth, maxWidth));

  // Apply to modal
  const modal = document.getElementById("booksModal");
  if (modal) {
    modal.style.width = `${finalWidth}px`;
  }
}