// main.js

// Imports
import { getFormData, validateLibraryForm, validateForm, clearErrors } from "./formHandler.js";
import {
  setMessage,
  clearMessage,
  clearRateMessage,
  showSpinner,
  hideSpinner,
  toggleElementVisibility,
  showLibraryFilterInSettings,
  showDebugButtons,
  enableExportButtons
} from "./uiFeedback.js";
import { collectBookMetadata, collectSeriesMetadata } from "./metadataFlow.js";
import { fetchExistingContent, fetchAudiobookShelfLibraries } from "./dataFetcher.js";
import {
  removeHiddenSeries,
  findMissingBooks,
  groupBooksBySeries,
} from "./dataCleaner.js";
import { renderSeriesAndBookTiles } from "./seriesTileBuilder.js";
import { populateHiddenItemsMenu } from "./tileVisibilityUpdater.js";
import {
  initializeUIInteractions,
  disableClickEventsOnLoad,
  enableClickEventsOnLoadEnd,
  libraryCheckboxWatcher
} from "./interactions.js";
import { emptyDivContent, addLabeledCheckbox } from "./elementFactory.js";

import { bindDebugViewerControls } from "./interactions.js";
import { initDebugModal } from "./debugView.js";
import { isDebugEnabled, getDebugLogs } from "./debug.js";

// Stores current data fetched from AudiobookShelf
export let existingContent;
export let groupedMissingBooks;
// eslint-disable-next-line prefer-const
export let selectedLibraries = {
  authToken: "",
  librariesList: [],
};
export let libraryArrayObject = {};

/**
 * Initializes core UI and form behavior after DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  // Set up UI event listeners and populate hidden series menu
  initializeUIInteractions();
  populateHiddenItemsMenu();

  bindDebugViewerControls();

  const loginForm = document.getElementById("loginForm");
  const libraryForm = document.getElementById("libraryForm");
  const libraryList = document.getElementById("availableLibraries");
  const settingsLibraries = document.getElementById("availableLibrariesSettings");

  if (!loginForm || !libraryForm || !libraryList) return;

  // --- Handle login form submission ---
  loginForm.addEventListener("submit", async function (loginFormEvent) {
    loginFormEvent.preventDefault();
    clearErrors();

    const formData = getFormData();
    if (!validateForm(formData)) return;

    resetUserInterfaceAndStartLoadingProcess();

    try {
      setMessage("Logging in…");

      // Fetch all libraries from AudiobookShelf
      libraryArrayObject = await fetchAudiobookShelfLibraries(formData);

      if (!libraryArrayObject?.librariesList?.length) {
        errorHandler({ message: "No libraries found. Please check your AudiobookShelf setup." });
        return;
      }

      // Store all libraries found
      selectedLibraries.librariesList = structuredClone(libraryArrayObject.librariesList);
      selectedLibraries.authToken = libraryArrayObject.authToken;
      
      if (libraryArrayObject.librariesList.length === 1) {
        // Auto-process single-library users
        fetchExistingLibraryData(formData, libraryArrayObject);
      } else {
        // Build UI checkboxes for each library
        populateLibraryCheckboxes(libraryArrayObject.librariesList, libraryList);
      }
    } catch (error) {
      errorHandler(error);
    } finally {
      hideSpinner();
    }
  });

  // --- Handle library checkbox form submission ---
  libraryForm.addEventListener("submit", async function (libraryFormEvent) {
    libraryFormEvent.preventDefault();
    clearErrors();

    const formData = getFormData();
    if (!validateForm(formData)) return;

    if (!validateLibraryForm(selectedLibraries.librariesList)) return;

    toggleElementVisibility("library-form-container", false);
    resetUserInterfaceAndStartLoadingProcess();

    // Move library check boxes
    settingsLibraries.appendChild(libraryList);
    // Show library filter in settings
    showLibraryFilterInSettings();
    
    fetchExistingLibraryData(formData, selectedLibraries);
  });
});


/**
 * Coordinates the process of fetching the user's existing AudiobookShelf library data.
 * - Resets the UI and displays loading state
 * - Fetches all series and books for the selected libraries
 * - Validates content and displays results or an error message
 *
 * @param {Object} formData - The form submission data (URL, username, password, region, etc.)
 * @param {Object} selectedLibraries - Object containing the selected library IDs and auth token
 */
export async function fetchExistingLibraryData(formData, selectedLibraries) {
  resetUserInterfaceAndStartLoadingProcess();

  try {
    setMessage("Fetching libraries and series...");

    // Fetch user's existing library data
    existingContent = await collectExistingSeriesFromAudiobookShelf(formData, selectedLibraries);

    if (!existingContent || !existingContent.seriesFirstASIN) {
      errorHandler({ message: "No series found in the selected library." });
      return;
    }

    // Store for global use (e.g. refreshes)
    await fetchAndDisplayResults(existingContent, formData);
  } catch (error) {
    errorHandler(error);
  } finally {
    hideSpinner();
  }
}

/**
 * Resets interface state before starting a new metadata fetch.
 * Hides form, shows spinner and disables interaction during processing.
 */
export function resetUserInterfaceAndStartLoadingProcess() {
  disableClickEventsOnLoad();

  // Clear the results area
  const seriesOutputDiv = document.getElementById("seriesOutput");
  emptyDivContent(seriesOutputDiv);

  // Hide form and show feedback
  showLoadingState();
}

/**
 * Handles the full flow of fetching, filtering and rendering data.
 * Can be triggered by login or "apply filter" from settings.
 *
 * @param {Object} existingContent - Previously fetched library content
 * @param {Object} formData - Form configuration from user
 * @param {boolean} [refreshFilter=false] - Whether triggered by UI filter refresh
 */
export async function fetchAndDisplayResults(existingContent, formData, refreshFilter = false) {
  if (refreshFilter) 
    setMessage("Refreshing filter results...");

  // Fetch book + series metadata
  const seriesMetadata = await fetchAllMetadataForBooks(existingContent, formData);

  // Clean and group missing books by series
  groupedMissingBooks = await groupMissingBooks(existingContent, seriesMetadata, formData);

  // Render tiles and update UI
  uiUpdateAndDrawResults(groupedMissingBooks);
}

/**
 * Fetches all known series from user's AudiobookShelf and filters out hidden entries.
 *
 * @param {Object} formData - Auth and config input from form
 * @returns {Promise<Object>} - Filtered content from AudiobookShelf
 */
async function collectExistingSeriesFromAudiobookShelf(formData, libraryArrayObject) {
  existingContent = await fetchExistingContent(formData, libraryArrayObject);

  setMessage("Login successful. Fetching book and series information...");

  // Remove hidden series before further processing
  return await removeHiddenSeries(existingContent);
}

/**
 * Dynamically generates checkboxes for each available library.
 *
 * @param {Array<Object>} librariesList - List of libraries from the server
 * @param {HTMLElement} parentContainer - The container where checkboxes will be appended
 */
function populateLibraryCheckboxes(librariesList, parentContainer) {
  clearMessage();
  emptyDivContent(parentContainer);
  toggleElementVisibility("library-form-container", true);

  librariesList.forEach((library) => {
    addLabeledCheckbox(
      {
        id: library.id,
        labelText: library.name,
        checked: true, // default to all selected
      },
      parentContainer
    );
  });

  libraryCheckboxWatcher(parentContainer); // Sync changes to selectedLibraries
}

/**
 * Fetches book metadata, then maps to series ASINs and fetches their metadata.
 *
 * @param {Object} existingContent - Original fetched content
 * @param {Object} formData - Form configuration
 * @returns {Promise<Array>} - Full metadata per series
 */
async function fetchAllMetadataForBooks(existingContent, formData) {
  // Extract all series ASINs by examining first-book metadata
  const seriesASINs = await collectBookMetadata(
    existingContent.seriesFirstASIN,
    formData.region,
    formData.includeSubSeries
  );

  // Use those ASINs to get full series details
  return await collectSeriesMetadata(seriesASINs, formData.region, existingContent);
}

/**
 * Determines which books are missing from the user's library.
 * Optionally groups them by series/subseries.
 *
 * @param {Object} existingContent - AudiobookShelf content
 * @param {Array} seriesMetadata - Metadata for each series
 * @param {Object} formData - User form settings
 * @returns {Promise<Object>} - Grouped missing books ready to render
 */
async function groupMissingBooks(existingContent, seriesMetadata, formData) {
  const missingBooks = findMissingBooks(
    existingContent.seriesAllASIN,
    seriesMetadata,
    formData
  );

  return await groupBooksBySeries(missingBooks, formData.includeSubSeries);
}

/**
 * Updates the DOM and user interface with the final book tiles.
 *
 * @param {Object} groupedMissingBooks - Data structured by series
 */
function uiUpdateAndDrawResults(groupedMissingBooks) {
  renderSeriesAndBookTiles(groupedMissingBooks);

  toggleElementVisibility("form-container", false);
  toggleElementVisibility("message", false);
  hideSpinner();
  enableClickEventsOnLoadEnd();
  enableExportButtons();
  // After run completes (and logs have been written), re-render:
  populateDebugViewerIfResultsExist();
}

/**
 * Updates the UI to reflect a loading state.
 * - Hides the form container
 * - Displays the loading spinner
 * - Ensures the message element is visible (used for progress updates)
 */
function showLoadingState() {
  toggleElementVisibility("form-container", false);
  showSpinner();
  toggleElementVisibility("message", true, "block");
}

/**
 * Run this script when an error occurs during data fetching or processing.
 * @param {*} error Error details from failed operations
 */
function errorHandler(error) {
  console.error(error);
  toggleElementVisibility("form-container", true);
  toggleElementVisibility("library-form-container", false);
  setMessage(error.message || "Something went wrong. Please try again.");
  clearRateMessage();
  throw new Error(error.message || "An unexpected error occurred. Please try again.");
}

/**
 * Populate the Debug Viewer once logs exist.
 *
 * Early-exits if debugging is disabled or if there are no logs to display.
 * Side effects:
 *  - Initializes the debug modal UI.
 *  - Reveals the debug-related buttons/controls.
 *
 * @returns {void}
 */
function populateDebugViewerIfResultsExist() {
  // Abort if debug features are not enabled.
  if (!isDebugEnabled()) return;

  // Ensure we actually have logs before initializing the viewer.
  const debugLogs = getDebugLogs();
  if (!Array.isArray(debugLogs) || debugLogs.length === 0) return;

  // Initialize the modal and show related UI controls.
  initDebugModal();
  showDebugButtons();
}