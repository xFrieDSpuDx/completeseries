// visibility.js

import { sortBySeriesThenTitle } from "./dataCleaner.js";
import { applyFilterButton } from "./interactions.js";
import { loadMetadataFromLocalStorage, storeUpdateFullValueForLocalStorage } from "./localStorage.js";

// Local storage key value
const VISIBILITY_KEY = "hiddenItems";

/**
 * Retrieves hidden items from localStorage.
 * @returns {Array<Object>} List of hidden {type, series, title, asin} objects.
 */
export function getHiddenItems() {
  try {
    return loadMetadataFromLocalStorage(VISIBILITY_KEY);
  } catch (error) {
    console.error("Failed to parse hidden items from localStorage:", error);
    return [];
  }
}

/**
 * Stores hidden items into localStorage.
 * @param {Array<Object>} items - List of hidden items to persist.
 */
export function setHiddenItems(items) {
  try {
    const sortedItems = sortBySeriesThenTitle(items);
    storeUpdateFullValueForLocalStorage(sortedItems, VISIBILITY_KEY);
  } catch (error) {
    console.error("Failed to store hidden items to localStorage:", error);
  }
}

/**
 * Hides an item (series or book) by adding it to the local storage.
 * Updates the hidden items menu afterward.
 *
 * @param {Object} item - The item to hide.
 */
export function hideItem(item) {
  if (!isCurrentlyHidden(item)) {
    const currentHidden = getHiddenItems();
    const updatedHidden = [...currentHidden, item];
    setHiddenItems(updatedHidden);
  }
}

/**
 * Unhides an item by removing it from the local storage.
 *
 * @param {Object} item - The item to unhide.
 */
export function unhideItem(item) {
  const currentHidden = getHiddenItems();
  const updatedHidden = currentHidden.filter(
    (hiddenItem) =>
      !(
        hiddenItem.type === item.type &&
        hiddenItem.series === item.series &&
        hiddenItem.title === item.title &&
        hiddenItem.asin === item.asin
      )
  );
  setHiddenItems(updatedHidden);
}

/**
 * Toggles visibility of an item based on its current state and eye icon class.
 *
 * @param {Object} item - The item to toggle.
 * @param {HTMLElement} eyeIcon - The icon element indicating hidden state.
 */
export function toggleHiddenItem(item, eyeIcon) {
  if (eyeIcon.classList.contains("eyeClosed")) 
    unhideItem(item);
  else 
    hideItem(item);
}

/**
 * Updates the visibility menu UI based on the eye icon state.
 * Used when interacting with the "Visibility Manager".
 *
 * @param {HTMLElement} eyeIcon - The eye icon clicked inside the menu.
 */
export function toggleHiddenItemVisibilityMenu(eyeIcon) {
  const requestReload = document.getElementById("requestReloadDiv");

  if (eyeIcon.classList.contains("eyeClosed")) {
    requestReload.classList.remove("active");
    applyFilterButton.classList.remove("active");
  } else {
    requestReload.classList.add("active");
    applyFilterButton.classList.add("active");
  }
}

/**
 * Checks if a given book or series is currently hidden.
 *
 * @param {Object} item - The item to check (must contain type and series).
 * @returns {boolean} True if the item is hidden, otherwise false.
 */
export function isCurrentlyHidden(item) {
  const hiddenItems = getHiddenItems();
  return hiddenItems.some(
    (hiddenItem) =>
      hiddenItem.type === item.type &&
      hiddenItem.series === item.series &&
      // If it's a book, title must also match
      (item.type === "series" || hiddenItem.title === item.title)
  );
}

/**
 * Checks whether a given ASIN is currently marked as hidden.
 *
 * This function scans the list of hidden items (retrieved from the local storage)
 * and returns `true` if an item with the provided ASIN exists.
 *
 * @param {string} asin - The ASIN to check.
 * @returns {boolean} - Returns true if the ASIN is hidden, false otherwise.
 */
export function isCurrentlyHiddenByAsin(asin) {
  const hiddenItems = getHiddenItems();

  // Check if any item in the hidden list has a matching ASIN
  return hiddenItems.some((item) => item.asin === asin);
}

/**
 * Returns the total number of hidden books for a given series.
 *
 * @param {string} seriesName - The name of the series to check.
 * @returns {number} Number of hidden books in the series.
 */
export function totalHiddenInSeries(seriesName) {
  const hiddenItems = getHiddenItems();
  return hiddenItems.filter(
    (item) => item.type === "book" && item.series === seriesName
  ).length;
}