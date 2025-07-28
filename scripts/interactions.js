// interactions.js

import { populateHiddenItemsMenu, getBookModalAnchor, emptyDivContent } from "../scripts/render.js";

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
  const bookDetailContent = document.getElementById("bookDetailModalContent");
  const closeBookDetail = document.getElementById("closeBookDetail");

  /**
   * Closes the books modal and overlay
   */
  function closeBooksModal() {
    booksModal.classList.remove("active");
    modalOverlay.classList.remove("active");
    seriesOutput.classList.remove("no-scroll");
  }

  /**
   * Closes the visibility manager panel and overlay
   */
  function closeVisibilityPanel() {
    visibilityManagerPanel.classList.remove("active");
    modalOverlay.classList.remove("active");
  }

  /**
   * Closes the book detail modal and overlay
   */
  function closeBookDetailModal() {
    closeBookDetail.classList.remove("active");
    bookDetailModalOverlay.classList.remove("active");
    bookDetailModal.style.pointerEvents = "none";
    bookDetailModal.style.transform = getBookModalAnchor() || "translateX(-50%) scale(0)";
    // After transition, hide modal and clear content
    setTimeout(() => {
      emptyDivContent(bookDetailContent);
      bookDetailModal.classList.remove("active");
      bookDetailModal.style.pointerEvents = "none";
    }, 500); // match your transition duration
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
