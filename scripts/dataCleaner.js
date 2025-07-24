// dataCleaner.js

import { getHiddenItems, isCurrentlyHiddenByAsin } from "./visibility.js";
import { getFormData } from "./formHandler.js";

/**
 * Normalizes the AudiobookShelf URL to ensure it starts with https://
 * and has no trailing slashes.
 *
 * @param {string} audiobookShelfURL - The raw AudiobookShelf server URL input.
 * @returns {string} - A cleaned and normalized server URL.
 */
export function sanitiseAudiobookShelfURL(audiobookShelfURL) {
  if (!/^https?:\/\//i.test(audiobookShelfURL)) {
    audiobookShelfURL = "https://" + audiobookShelfURL;
  }

  return audiobookShelfURL.replace(/\/$/, ""); // Remove trailing slash
}

/**
 * Filters out series that the user has previously hidden.
 *
 * @param {Object} existingContent - Object containing `seriesFirstASIN`.
 * @returns {Object} - Same object with hidden series removed.
 */
export function removeHiddenSeries(existingContent) {
  const hiddenItems = getHiddenItems();

  existingContent.seriesFirstASIN = existingContent.seriesFirstASIN.filter(
    (seriesEntry) => {
      return !hiddenItems.some(
        (hidden) =>
          hidden.type === "series" && hidden.series === seriesEntry.series
      );
    }
  );

  return existingContent;
}

/**
 * Removes individual book entries that have been hidden by the user.
 * @param {Array} existingContent - Array of book metadata objects.
 * @returns {Array} - Filtered list with hidden books removed.
 */
export function removeHiddenBooks(existingContent) {
  const hiddenItems = getHiddenItems();

  return existingContent.filter((bookEntry) => {
    return !hiddenItems.some((hidden) => hidden.asin === bookEntry.asin);
  });
}

/**
 * Identifies which books from series metadata are not already in the AudiobookShelf library.
 *
 * @param {Array} existingContent - Flat array of existing book objects (must include `asin`).
 * @param {Array} seriesMetadata - Full metadata returned from Audible.
 * @returns {Array} - Array of book metadata objects missing from the library.
 */
export function findMissingBooks(existingContent, seriesMetadata) {
  const existingAsins = new Set(existingContent.map((book) => book.asin));
  const missingBooks = [];

  for (const series of seriesMetadata) {
    for (const bookMetadata of series.response) {
      const asin = bookMetadata.asin;
      // Only add books that are viable, have an ASIN and are not duplicates of ones already added
      if (
        !existingAsins.has(asin) &&
        isBookViable(bookMetadata) &&
        !doesBookExistInArray(missingBooks, asin)
      ) {
        bookMetadata.seriesAsin = series.seriesAsin;
        missingBooks.push(bookMetadata);
      }
    }
  }

  return missingBooks;
}

/**
 *
 * @param {*} missingBooks - Array of book metadata objects.
 * @param {*} bookAsin - Selected book ASIN
 * @returns {boolean} - true if book exists, false if new entry
 */
function doesBookExistInArray(missingBooks, bookAsin) {
  return missingBooks.some((item) => item.asin === bookAsin);
}

/**
 * Determines if a book meets all criteria to be added (based on user settings).
 *
 * @param {Object} bookMetadata - Metadata for a single book.
 * @returns {boolean} - True if the book should be considered for addition.
 */
function isBookViable(bookMetadata) {
  const formData = getFormData();

  return (
    bookMetadata.isAvailable !== false &&
    bookMetadata.region === formData.region &&
    (!formData.onlyUnabridged || bookMetadata.bookFormat === "unabridged")
  );
}

/**
 * Groups an array of book metadata by their series name.
 * Books without a defined series are grouped under "No Series".
 *
 * @param {Array} missingBooks - Array of book metadata objects.
 * @returns {Array} - Array of groups, each with a `series` name and `books` array.
 */
export function groupBooksBySeries(missingBooks, includeSubSeries) {
  const groupedBySeries = [];

  for (const bookMetadata of missingBooks) {
    for (const selectedSeries of bookMetadata.series) {
      const seriesName = selectedSeries.name || "No Series";

      let seriesHidden = isCurrentlyHiddenByAsin(selectedSeries.asin);

      if (seriesHidden === true) {
        continue;
      }

      let existingGroup = groupedBySeries.find(
        (groupEntry) => groupEntry.series === seriesName
      );

      if (!existingGroup) {
        existingGroup = {
          series: seriesName,
          books: [],
        };
        groupedBySeries.push(existingGroup);
      }

      existingGroup.books.push(bookMetadata);

      if (!includeSubSeries) {
          break;
        }
    }
  }

  return sortSeriesAlphabetically(groupedBySeries);
}

/**
 * Sorts an array of grouped book series alphabetically by series name.
 *
 * @param {Array<Object>} groupedBySeries - An array where each object represents a group of books in a series.
 *                                          Each object should have a `series` key (string).
 * @returns {Array<Object>} The same array, sorted alphabetically by `series` name.
 */
function sortSeriesAlphabetically(groupedBySeries) {
  // Sort the series groups by series name, ignoring case
  groupedBySeries.sort((firstGroup, secondGroup) => {
    const seriesNameA = firstGroup.series.toLowerCase();
    const seriesNameB = secondGroup.series.toLowerCase();

    return seriesNameA.localeCompare(seriesNameB);
  });

  // Return the now-sorted array
  return groupedBySeries;
}

/**
 * Sorts a list of metadata items alphabetically by series name and then by title.
 *
 * @param {Array} metadataItems - Array of objects with `series` and `title` properties.
 * @returns {Array} - A new array sorted alphabetically by series, then title.
 */
export function sortBySeriesThenTitle(metadataItems) {
  return [...metadataItems].sort((firstItem, secondItem) => {
    const firstSeries = (firstItem.series || "").toLowerCase();
    const secondSeries = (secondItem.series || "").toLowerCase();
    const firstTitle = (firstItem.title || "").toLowerCase();
    const secondTitle = (secondItem.title || "").toLowerCase();

    if (firstSeries !== secondSeries) {
      return firstSeries.localeCompare(secondSeries);
    }

    return firstTitle.localeCompare(secondTitle);
  });
}
