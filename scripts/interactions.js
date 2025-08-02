// interactions.js

import { populateHiddenItemsMenu } from "./tileVisibilityUpdater.js";
import { bookDetailModalAnchor } from "./modalHandler.js";
import { clearLocalStorageByIdentifier, clearLocalStorage } from "./localStorage.js";
import { getFormData, validateForm } from "./formHandler.js";
import { temporaryChangeElementText } from "./uiFeedback.js";
import {
  fetchExistingLibraryData,
  resetUserInterfaceAndStartLoadingProcess,
  selectedLibraries
} from "./main.js";
import { updatedSelectedLibraries } from "./dataCleaner.js";

// Containers
const settingsManagerFilterOptios = document.getElementById("filterOptions");
const librariesListContainer = document.getElementById("availableLibraries");
export const applyFilterButton = document.getElementById("applyFilter");
/**
 * Initializes all interactive UI event listeners.
 * Handles modal behavior, panel toggles, clearing localStorage, and form filtering.
 */
export function initializeUIInteractions() {
  // --- Modal & Panel Elements ---
  const modalOverlay = document.getElementById("modalOverlay");
  const booksModal = document.getElementById("booksModal");
  const modalCloseButton = document.getElementById("modalCloseBtn");

  const visibilityManagerPanel = document.getElementById("visibilityManager");
  const openVisibleHiddenButton = document.getElementById("burgerToggle");
  const closeVisibilityManagerButton = document.getElementById("closeVisibilityManager");

  const settingsManagerPanel = document.getElementById("settingsManager");
  const openSettingsButton = document.getElementById("settingsToggle");
  const closeSettingsManagerButton = document.getElementById("closeSettingsManager");

  const bookDetailModalOverlay = document.getElementById("bookDetailModalOverlay");
  const bookDetailModal = document.getElementById("bookDetailModal");
  const closeBookDetail = document.getElementById("closeBookDetail");

  // --- Settings Buttons ---
  const clearSeriesList = document.getElementById("clearSeriesList");
  const clearBooksList = document.getElementById("clearBooksList");
  const clearHiddenList = document.getElementById("clearHiddenList");
  const clearAllList = document.getElementById("clearAllList");

  // -------------------------
  // MODAL AND PANEL CLOSERS
  // -------------------------

  function closeBooksModal() {
    modalOverlay.classList.remove("active");
    booksModal.classList.remove("active");
  }

  function closeVisibilityPanel() {
    modalOverlay.classList.remove("active");
    visibilityManagerPanel.classList.remove("active");
  }

  function closeSettingsPanel() {
    modalOverlay.classList.remove("active");
    settingsManagerPanel.classList.remove("active");
  }

  function closeBookDetailModal() {
    bookDetailModalOverlay.classList.remove("active");
    closeBookDetail.classList.remove("active");
    bookDetailModal.style.pointerEvents = "none";
    bookDetailModal.style.transform = bookDetailModalAnchor || "translateX(-50%) scale(0)";
    bookDetailModal.classList.remove("active");
  }

  // -------------------------
  // EVENT LISTENERS
  // -------------------------

  if (modalCloseButton) modalCloseButton.addEventListener("click", closeBooksModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeBooksModal();
      closeVisibilityPanel();
      closeSettingsPanel();
    });
  }

  if (openVisibleHiddenButton) {
    openVisibleHiddenButton.addEventListener("click", () => {
      visibilityManagerPanel.classList.add("active");
      modalOverlay.classList.add("active");
      populateHiddenItemsMenu();
    });
  }

  if (openSettingsButton) {
    openSettingsButton.addEventListener("click", () => {
      settingsManagerPanel.classList.add("active");
      modalOverlay.classList.add("active");
    });
  }

  if (closeVisibilityManagerButton) {
    closeVisibilityManagerButton.addEventListener("click", closeVisibilityPanel);
  }

  if (closeSettingsManagerButton) {
    closeSettingsManagerButton.addEventListener("click", closeSettingsPanel);
  }

  if (closeBookDetail) {
    closeBookDetail.addEventListener("click", closeBookDetailModal);
  }

  if (bookDetailModalOverlay) {
    bookDetailModalOverlay.addEventListener("click", closeBookDetailModal);
  }

  // -------------------------
  // LOCAL STORAGE CONTROLS
  // -------------------------

  if (clearSeriesList) {
    clearSeriesList.addEventListener("click", () => {
      clearLocalStorageByIdentifier(null, "existingFirstBookASINs");
      temporaryChangeElementText(clearSeriesList, "Series list successfully deleted");
    });
  }

  if (clearBooksList) {
    clearBooksList.addEventListener("click", () => {
      clearLocalStorageByIdentifier(null, "existingBookMetadata");
      temporaryChangeElementText(clearBooksList, "Book Metadata list successfully deleted");
  });
  }

  if (clearHiddenList) {
    clearHiddenList.addEventListener("click", () => {
      clearLocalStorageByIdentifier("hiddenItems");
      temporaryChangeElementText(clearHiddenList, "Hidden items successfully deleted");
  });
  }

  if (clearAllList) {
    clearAllList.addEventListener("click", () => {
      clearLocalStorage();
      temporaryChangeElementText(clearAllList, "All cache deleted");
    });
  }

  // -------------------------
  // FILTER HANDLER
  // -------------------------

  if (applyFilterButton) {
    applyFilterButton.addEventListener("click", () => {
      applyFilterButton.classList.remove("active");

      const formData = getFormData();
      if (!validateForm(formData)) return;

      closeSettingsPanel();
      resetUserInterfaceAndStartLoadingProcess();
      fetchExistingLibraryData(formData, selectedLibraries);
    });
  }

  // -------------------------
  // CHECKBOX STATE MONITORING
  // -------------------------

  function filterChangeDetected() {
    const seriesOutputDiv = document.getElementById("seriesOutput");
    if (seriesOutputDiv.hasChildNodes()) {
      applyFilterButton.classList.add("active");
    }
  }

  // Attach to all filter checkbox elements
  settingsManagerFilterOptios.querySelectorAll('input[type="checkbox"]').forEach((filterCheckbox) => {
    filterCheckbox.addEventListener("change", filterChangeDetected);
  });
}

/**
 * Adds a change event listener to all library checkboxes in the container.
 * 
 * On change:
 * - Updates the `selectedLibraries` object with the current checkbox states.
 * - Activates the "Apply Filter" button by adding the `active` class.
 *
 * @param {HTMLElement} libraryCheckboxContainer - The container holding the checkbox elements.
 */
export function libraryCheckboxWatcher(libraryCheckboxContainer) {
  librariesListContainer.querySelectorAll('input[type="checkbox"]').forEach((libraryCheckbox) => {
    libraryCheckbox.addEventListener("change", () => {
      updatedSelectedLibraries(libraryCheckboxContainer);
      applyFilterButton.classList.add("active");
    });
  });
}

/**
 * Temporarily disables UI click access to settings and hidden-item buttons.
 * Useful during fetch or rendering transitions.
 */
export function disableClickEventsOnLoad() {
  document.getElementById("burgerToggle").style.pointerEvents = "none";
  document.getElementById("settingsToggle").style.pointerEvents = "none";
}

/**
 * Re-enables previously disabled buttons once loading finishes.
 */
export function enableClickEventsOnLoadEnd() {
  document.getElementById("burgerToggle").style.pointerEvents = "auto";
  document.getElementById("settingsToggle").style.pointerEvents = "auto";
}
