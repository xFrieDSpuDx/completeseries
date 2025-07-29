// interactions.js

import { populateHiddenItemsMenu } from "./tileVisibilityUpdater.js";
import { bookDetailModalAnchor } from "./modalHandler.js";

/**
 * Sets up event listeners for static UI interactions across the app.
 * These include modal windows, visibility manager toggle, and overlay handling.
 */
export function initializeUIInteractions() {
  // Get key DOM elements used for modals and menus
  const modalCloseButton = document.getElementById("modalCloseBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const booksModal = document.getElementById("booksModal");
  const visibilityManagerPanel = document.getElementById("visibilityManager");
  const openSettingsButton = document.getElementById("settingsToggle");
  const closeVisibilityManagerButton = document.getElementById(
    "closeVisibilityManager"
  );
  const bookDetailModalOverlay = document.getElementById("bookDetailModalOverlay");
  const bookDetailModal = document.getElementById("bookDetailModal");
  const closeBookDetail = document.getElementById("closeBookDetail");

  /**
   * Closes the books modal and overlay
   */
  function closeBooksModal() {
    modalOverlay.classList.remove("active");
    booksModal.classList.remove("active");
  }

  /**
   * Closes the visibility manager panel and overlay
   */
  function closeVisibilityPanel() {
    modalOverlay.classList.remove("active");
    visibilityManagerPanel.classList.remove("active");
  }

  /**
   * Closes the book detail modal and overlay
   */
  function closeBookDetailModal() {
    bookDetailModalOverlay.classList.remove("active");
    closeBookDetail.classList.remove("active");
    bookDetailModal.style.pointerEvents = "none";
    bookDetailModal.style.transform = bookDetailModalAnchor || "translateX(-50%) scale(0)";
    // Transition, hide modal, remove click events
    bookDetailModal.classList.remove("active");
    bookDetailModal.style.pointerEvents = "none";
  }

  // Close modal when close button is clicked
  if (modalCloseButton) {
    modalCloseButton.addEventListener("click", closeBooksModal);
  }

  // Close all overlays when the background overlay is clicked
  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeBooksModal();
      closeVisibilityPanel();
    });
  }

  // Open the visibility manager panel and populate its contents
  if (openSettingsButton) {
    openSettingsButton.addEventListener("click", () => {
      visibilityManagerPanel.classList.add("active");
      modalOverlay.classList.add("active");
      populateHiddenItemsMenu();
    });
  }

  // Close the visibility manager panel from inside the panel
  if (closeVisibilityManagerButton) {
    closeVisibilityManagerButton.addEventListener(
      "click",
      closeVisibilityPanel
    );
  }

  if (closeBookDetail) {
    closeBookDetail.addEventListener("click", closeBookDetailModal);
  }

  if (bookDetailModalOverlay) {
    bookDetailModalOverlay.addEventListener("click", closeBookDetailModal);
  }
}
