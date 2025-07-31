// main.js

// Imports
import { getFormData, validateForm, clearErrors } from "./formHandler.js";
import {
  setMessage,
  setRateMessage,
  showSpinner,
  hideSpinner,
  toggleElementVisibility,
} from "./uiFeedback.js";
import { collectBookMetadata, collectSeriesMetadata } from "./metadataFlow.js";
import { fetchExistingContent } from "./dataFetcher.js";
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
} from "./interactions.js";
import { emptyDivContent } from "./elementFactory.js";

// Stores current data fetched from AudiobookShelf
export let existingContent;

/**
 * Initializes core UI and form behavior after DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  initializeUIInteractions();
  populateHiddenItemsMenu();

  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Handle form submission
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const formData = getFormData();
    if (!validateForm(formData)) return;

    resetUserInterfaceAndStartLoadingProcess();

    try {
      setMessage("Logging in…");

      // Fetch user's existing library data
      const existing = await collectExistingSeriesFromAudiobookShelf(formData);

      // Store for global use (e.g. refreshes)
      await fetchAndDisplayResults(existing, formData);
    } catch (err) {
      console.error(err);
      toggleElementVisibility("form-container", true);
      setMessage(err.message || "Something went wrong. Please try again.");
      setRateMessage("");
    } finally {
      hideSpinner();
    }
  });
});

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
  toggleElementVisibility("form-container", false);
  showSpinner();
  toggleElementVisibility("message", true, "block");
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
  if (refreshFilter) {
    setMessage("Refreshing filter results...");
  }

  // Fetch book + series metadata
  const seriesMetadata = await fetchAllMetadataForBooks(existingContent, formData);

  // Clean and group missing books by series
  const groupedMissingBooks = await groupMissingBooks(existingContent, seriesMetadata, formData);

  // Render tiles and update UI
  uiUpdateAndDrawResults(groupedMissingBooks);
}

/**
 * Fetches all known series from user's AudiobookShelf and filters out hidden entries.
 *
 * @param {Object} formData - Auth and config input from form
 * @returns {Promise<Object>} - Filtered content from AudiobookShelf
 */
async function collectExistingSeriesFromAudiobookShelf(formData) {
  existingContent = await fetchExistingContent(formData);

  setMessage("Login successful. Fetching book and series information...");

  // Remove hidden series before further processing
  return await removeHiddenSeries(existingContent);
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
  return await collectSeriesMetadata(seriesASINs, formData.region);
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
}
