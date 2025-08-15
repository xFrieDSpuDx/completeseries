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
import { clearDebugLogsAndModal, debugStore } from "./debug.js";
import { refreshDebugModal } from "./debugView.js";
import { exportFilteredLogsAsJson, exportFilteredLogsAsCsv } from "./debugExports.js";

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

  // --- Debug Checkbox ---
  const enableDebugChecks = document.getElementById("enableDebugChecks");

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

  if (enableDebugChecks) {
    enableDebugChecks.addEventListener("click", allowReloadForDebug)
  }

  // -------------------------
  // LOCAL STORAGE CONTROLS
  // -------------------------

  if (clearSeriesList) {
    clearSeriesList.addEventListener("click", () => {
      clearLocalStorageByIdentifier("existingFirstBookASINs");
      temporaryChangeElementText(clearSeriesList, "Series list successfully deleted");
    });
  }

  if (clearBooksList) {
    clearBooksList.addEventListener("click", () => {
      clearLocalStorageByIdentifier("existingBookMetadata");
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
      const requestReload = document.getElementById("requestReloadDiv");
      requestReload.classList.remove("active");

      const formData = getFormData();
      if (!validateForm(formData)) return;

      closeSettingsPanel();
      resetUserInterfaceAndStartLoadingProcess();
      fetchExistingLibraryData(formData, selectedLibraries);
      commitFilterBaseline();
    });
  }

  // -----------------------------------------------------------------------------
  // Checkbox filter "Apply" button visibility manager
  // Shows the Apply button only when the CURRENT checkbox selection differs
  // from the LAST APPLIED baseline. If the user toggles back to the baseline,
  // the button hides again.
  // -----------------------------------------------------------------------------

  // ---- Baseline of the last "applied" state (object: key -> boolean) ----
  let lastAppliedFilterState = null;

  /**
   * Create a stable snapshot of all checkbox states inside a container.
   * Uses a stable key for each checkbox: prefers `name`, then `id`, then `value`,
   * with an index fallback to avoid collisions.
   *
   * @param {HTMLElement} [root=settingsManagerFilterOptios]
   *        The container that holds the checkbox inputs.
   * @returns {Record<string, boolean>} An object mapping checkbox keys to `true/false`.
   */
  function snapshotFilterState(root = settingsManagerFilterOptios) {
    /** @type {Record<string, boolean>} */
    const checkboxStateMap = {};
    if (!root) return checkboxStateMap;

    const checkboxNodeList = root.querySelectorAll('input[type="checkbox"]');
    checkboxNodeList.forEach((checkboxElement, index) => {
      // Stable identity for each checkbox
      const key =
        checkboxElement.name ||
        checkboxElement.id ||
        checkboxElement.value ||
        `__idx_${index}`;

      checkboxStateMap[key] = !!checkboxElement.checked;
    });

    return checkboxStateMap;
  }

  /**
   * Shallow equality check for two checkbox state objects.
   * Returns true only if both have the same keys and all corresponding
   * boolean values are equal.
   *
   * @param {Record<string, boolean>|null|undefined} stateA
   * @param {Record<string, boolean>|null|undefined} stateB
   * @returns {boolean}
   */
  function statesEqual(stateA, stateB) {
    if (!stateA || !stateB) return false;

    const aKeys = Object.keys(stateA);
    const bKeys = Object.keys(stateB);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (stateA[key] !== stateB[key]) return false;
    }
    return true;
  }

  /**
   * Event handler: run whenever any filter checkbox changes.
   * - If the series output has no nodes yet, do nothing (matches existing behavior).
   * - Compare current snapshot to the baseline; toggle the Apply button's "active" class.
   *
   * @returns {void}
   */
  function filterChangeDetected() {
    if (!outputContainerPopulated()) return;

    const currentCheckboxStateSnapshot = snapshotFilterState();
    const hasChangedSinceBaseline = !statesEqual(
      currentCheckboxStateSnapshot,
      lastAppliedFilterState
    );

    applyFilterButton.classList.toggle("active", hasChangedSinceBaseline);
  }

  /**
   * Commit the current checkbox state as the new baseline.
   * Call this right after filters are actually applied.
   * Also hides the Apply button by removing the "active" class.
   *
   * @returns {void}
   */
  function commitFilterBaseline() {
    lastAppliedFilterState = snapshotFilterState();
    applyFilterButton.classList.remove("active");
  }

  /**
   * Determine whether the #seriesOutput container currently has any child nodes.
   *
   * Notes:
   * - Uses `Node.hasChildNodes()`, which counts **any** child nodes (including text nodes).
   *
   * @returns {boolean} `true` if the container exists and has at least one child node; otherwise `false`.
   */
  function outputContainerPopulated() {
    const seriesOutputContainerElement = document.getElementById("seriesOutput");
    return Boolean(seriesOutputContainerElement?.hasChildNodes());
  }

  /**
   * Decide whether the "Apply filters" button should be visible when the Debug checkbox changes.
   *
   * Behavior:
   * 1) First, let the generic checkbox-diff logic run (`filterChangeDetected()`).
   *    If that already marked the button as active, we **exit early** to avoid overriding it.
   * 2) Otherwise, we show the button only when:
   *    - there are **no debug logs yet** (fresh run)
   *    - the **debug checkbox is now checked**
   *    - the **output container is populated** (so applying will do something)
   *    In all other cases, we hide the button.
   *
   * @param {Event | { target?: { checked?: boolean } }} debugToggleEvent
   *        The change event from the Debug checkbox (must expose `target.checked`).
   * @returns {void}
   */
  function allowReloadForDebug(debugToggleEvent) {
    // Let the shared checkbox-change handler update the button first (diff vs. baseline).
    filterChangeDetected();

    // If that logic already turned the button on, don't second-guess it here.
    if (applyFilterButton.classList.contains("active")) return;

    // Read current conditions for this extra rule.
    const isDebugChecked   = !!debugToggleEvent?.target?.checked;
    const noDebugLogsYet = !(Array.isArray(debugStore?.logs) && debugStore.logs.length > 0);
    const hasVisibleOutput = outputContainerPopulated();

    // Show only when all three conditions are true; otherwise hide.
    const shouldShowApply = noDebugLogsYet && isDebugChecked && hasVisibleOutput;
    applyFilterButton.classList.toggle("active", shouldShowApply);
  }

  // ---- Wiring: attach to all filter checkbox elements ----
  settingsManagerFilterOptios
    .querySelectorAll('input[type="checkbox"]')
    .forEach((filterCheckboxElement) => {
      filterCheckboxElement.addEventListener("change", filterChangeDetected);
    });

  // ---- Initialize baseline once so the button stays hidden until a real change ----
  lastAppliedFilterState = snapshotFilterState();
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

  // -------------------------
  // INTERACTION STATES
  // -------------------------
  
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

  // -------------------------
  // DEBUG UI INTERACTIONS
  // -------------------------
/**
 * Bind debug viewer controls and buttons to refresh the results.
 * This keeps all event handlers out of debugView.js.
 *
 * @param {HTMLElement} debugModalElement - The modal element (#debugModal).
 * @returns {void}
 */
export function bindDebugViewerControls(debugModalElement) {
  if (!debugModalElement) return;

  const sessionSelect = debugModalElement.querySelector("#dbgSession");
  const outcomeSelect = debugModalElement.querySelector("#dbgOutcome");
  const groupBySelect = debugModalElement.querySelector("#dbgGroupBy"); // included for future grouping use
  const searchInput = debugModalElement.querySelector("#dbgSearch");
  const chipListContainer = debugModalElement.querySelector("#dbgCheckList");
  const downloadJsonButton = debugModalElement.querySelector("#dbgDownloadJson");
  const downloadCsvButton = debugModalElement.querySelector("#dbgDownloadCsv");
  const debugOverlay = document.getElementById("debugModalOverlay");
  const openDebugButton = document.getElementById("openDebugModalBtn");
  const closeDebugButton = document.getElementById("closeDebugModal");
  const clearDebugLogs = document.getElementById("clearDebugBtn");

  const triggerRefresh = () => refreshDebugModal();

  sessionSelect?.addEventListener("change", triggerRefresh);
  outcomeSelect?.addEventListener("change", triggerRefresh);
  groupBySelect?.addEventListener("change", triggerRefresh);
  searchInput?.addEventListener("input", triggerRefresh);

  chipListContainer?.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.matches('input[type="checkbox"]')) triggerRefresh();
  });

  downloadJsonButton?.addEventListener("click", exportFilteredLogsAsJson);
  downloadCsvButton?.addEventListener("click", exportFilteredLogsAsCsv);
  openDebugButton?.addEventListener("click", () => {
      debugModalElement.classList.add("active");
  });
  closeDebugButton?.addEventListener("click", () => {
      debugModalElement.classList.remove("active");
  });
  debugOverlay?.addEventListener("click", () => {
      debugModalElement.classList.remove("active");
  });
  clearDebugLogs?.addEventListener("click", clearDebugLogsAndModal);
}