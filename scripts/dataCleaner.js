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
export function findMissingBooks(existingContent, seriesMetadata, formData) {
  const libraryASINs = new Set(existingContent.map(book => book.asin));
  const missingBooks = [];

  for (const series of seriesMetadata) {
    for (const book of series.response) {
      const asin = book.asin;
      const bookSeriesArray = book.series || [];
      const releaseDate = book.releaseDate || new Date();
      const title = book.title || "N/A";
      const subtitle = book.subtitle || null;

      if (!isBookViable(book)) continue;
      if (libraryASINs.has(asin)) continue;
      if (formData.ignoreNoPositionBooks && hasNoSeriesPosition(bookSeriesArray)) continue;
      if (formData.ignoreMultiBooks && hasMultiplePositions(bookSeriesArray)) continue;
      if (formData.ignoreSubPositionBooks && hasDecimalSeriesPosition(bookSeriesArray)) continue;
      if (formData.ignoreFutureDateBooks && isReleaseInFuture(releaseDate)) continue;
      if (formData.ignoreTitleSubtitle && doesTitleSubtileMatch(title, subtitle, bookSeriesArray, existingContent)) continue;
      if (formData.ignoreSameSeriesPosition && hasSameSeriesPosition(bookSeriesArray, existingContent)) continue;
      if (formData.ignoreTitleSubtitleInMissingArray && doesTitleSubtileMatchMissingExists(title, subtitle, bookSeriesArray, missingBooks)) continue;
      if (formData.ignoreSameSeriesPositionInMissingArray && hasSameSeriesPositionMissingExists(bookSeriesArray, missingBooks)) continue;

      if (!doesBookExistInArray(missingBooks, asin)) {
        book.seriesAsin = series.seriesAsin;
        missingBooks.push(book);
      }
    }
  }

  return missingBooks;
}

/**
 * Determines whether a book has any associated series entry without a defined position.
 *
 * @param {Array<Object>} seriesArray - An array of series objects associated with a book.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
function hasNoSeriesPosition(seriesArray) {
  return seriesArray.some(entry => (entry.position || "N/A") === "N/A");
}

/**
 * Determines whether a book belongs to a series entry that spans a range (e.g., "1-2").
 *
 * @param {Array<Object>} seriesArray - An array of series objects associated with a book.
 *   Each object may contain a `position` field (e.g., "1", "1-2", "1.5").
 * @returns {boolean} - True if any series entry has a hyphen in its position (e.g., multi-part volumes).
 */
function hasMultiplePositions(seriesArray) {
  return seriesArray.some(entry => (entry.position || "N/A").includes('-'));
}

/**
 * Checks whether a book belongs to a sub-position in a series (e.g., "1.5", "2.1").
 *
 * @param {Array<Object>} seriesArray - An array of series objects for a book.
 * @returns {boolean} - True if any entry has a decimal-style position.
 */
function hasDecimalSeriesPosition(seriesArray) {
  return seriesArray.some(entry => (entry.position || "N/A").includes('.'));
}

/**
 * Checks if the given release date is today or a future date.
 *
 * @param {string|Date} releaseDateString - A date string (ISO format) or Date object.
 *   If no release date is available, today's date should already be assigned by caller.
 * @returns {boolean} - True if the release date is today or later.
 */
function isReleaseInFuture(releaseDateString) {
  const releaseDate = new Date(releaseDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);
  return today <= releaseDate;
}

/**
 * Determines whether a book has the same title and subtitle as an existing book in the library.
 *
 * @param {string} title - The title of the book to check.
 * @param {string} subtitle - The subtitle of the book to check.
 * @param {Array<Object>} existingContent - Array of existing book objects.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
function doesTitleSubtileMatch(title, subtitle, bookSeriesArray, existingContent) {
  for (const existingBook of existingContent) {
    for (const seriesEntry of bookSeriesArray) {
      if ((existingBook.title === title && (existingBook.subtitle === subtitle || existingBook.subtitle === "No Subtitle")) && existingBook.name === seriesEntry.name) {
        return true; // Found a match
      }
    }
  }

  return false; // No match found
}

/**
 * Determines whether a book has the same title and subtitle as a book in the missing book object.
 *
 * @param {string} title - The title of the book to check.
 * @param {string} subtitle - The subtitle of the book to check.
 * @param {Array<Object>} missingBooks - Array of missing book objects.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
function doesTitleSubtileMatchMissingExists(title, subtitle, bookSeriesArray, missingBooks) {
  for (const existingMissingBook of missingBooks) {
    for (const seriesEntry of bookSeriesArray) {
      for (const existingMissingBookSeries of existingMissingBook.series) {
        if ((existingMissingBook.title === title && (existingMissingBook.subtitle === subtitle || existingMissingBook.subtitle === "No Subtitle")) && existingMissingBookSeries.name === seriesEntry.name) {
          return true; // Found a match
        }
      }
    }
  }

  return false; // No match found
}

/**
 * Determines whether a book has the same title and subtitle as an existing book in the library.
 *
 * @param {Array<Object>} bookSeriesArray - An array of series objects associated with a book.
 * @param {Array<Object>} existingContent - Array of existing book objects.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
function hasSameSeriesPosition(bookSeriesArray, existingContent) {
  for (const existingBook of existingContent) {
    for (const seriesEntry of bookSeriesArray) {
      if (existingBook.seriesPosition === seriesEntry.position && existingBook.series === seriesEntry.name) {
        return true; // Found a match
      }
    }
  }

  return false; // No match found
}

/**
 * Determines whether a book has the same title and subtitle as a book in the missing book object.
 *
 * @param {Array<Object>} bookSeriesArray - An array of series objects associated with a book.
 * @param {Array<Object>} missingBooks - Array of missing book objects.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
function hasSameSeriesPositionMissingExists(bookSeriesArray, missingBooks) {
  for (const existingMissingBook of missingBooks) {
    for (const seriesEntry of bookSeriesArray) {
      for (const existingMissingBookSeries of existingMissingBook.series) {
        if (existingMissingBookSeries.position === seriesEntry.position && existingMissingBookSeries.name === seriesEntry.name) {
          return true; // Found a match
        }
      }
    }
  }

  return false; // No match found
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