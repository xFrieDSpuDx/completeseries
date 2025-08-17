// ui.js

/**
 * Updates the UI message and displays it to the user.
 * @param {string} text - The message to display.
 */
export function setMessage(text) {
  document.getElementById("statusText").textContent = text;
}

/**
 * Clears any status or feedback message currently displayed in the UI.
 * Typically used to reset or hide previous messages from #statusText.
 */
export function clearMessage() {
  document.getElementById("statusText").textContent = "";
}

/**
 * Updates the UI rate limit message and displays it to the user.
 * @param {number} waitTime - The message to display.
 */
export function setRateMessage(text) {
  document.getElementById("rateLimitText").textContent = text;
}

/**
 * Clears the rate limit message currently displayed in the UI.
 * Typically used to reset or hide previous messages from #rateLimitText.
 */
export function clearRateMessage() {
  document.getElementById("rateLimitText").textContent = "";
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
 * Shows or hides an element by ID, with customizable display type.
 * @param {string} elementId - The ID of the element to show/hide.
 * @param {boolean} show - Whether to show (true) or hide (false) the element.
 * @param {string} [displayType="flex"] - The display style to use when showing the element.
 */
export function toggleElementVisibility(elementId, show, displayType = "flex") {
  const targetElement = document.getElementById(elementId);
  if (targetElement)
    targetElement.style.display = show ? displayType : "none";
  
}

/**
 * Shows or hides an entire DOM element using flex display.
 *
 * @param {HTMLElement} element - The element to show or hide.
 * @param {boolean} show - Whether to show (true) or hide (false) the element.
 */
export function toggleElementVisibilityFullEntity(element, show) {
  element.style.display = show ? "flex" : "none";
}

export function temporaryChangeElementText(targetElement, temporaryText, duration = 1500) {
  if (!targetElement) return;

  const originalText = targetElement.textContent;
  targetElement.textContent = temporaryText;
  targetElement.classList.add("temporary-text");

  setTimeout(() => {
    targetElement.textContent = originalText;
    targetElement.classList.remove("temporary-text");
  }, duration);
}

/***
 * Shows the debug buttons
 */
export function showDebugButtons() {
  document.getElementById("debugButtons").classList.add("active");
}

/***
 * Hide the debug buttons
 */
export function hideDebugButtons() {
  document.getElementById("debugButtons").classList.remove("active");
}

/***
 * Shows export buttons
 */
export function enableExportButtons() {
  document.getElementById("exportResults").classList.add("active");
}

/**
 * Shows the book modal and adds the overlay
 */
export function showBooksModal() {
  // booksModal and modalOverlay focus passed to the click event
  // eslint-disable-next-line no-undef
  booksModal.classList.add("active");
  // eslint-disable-next-line no-undef
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
  if (modal)
    modal.style.width = `${finalWidth}px`;
  
}

/**
 * Shows the library filter section in the settings menu when more than one library is available
 */
export function showLibraryFilterInSettings() {
  document.getElementById("libraryFilter").classList.add("active");
}