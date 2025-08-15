/**
 * dataCleaner.js — cleaned docs pass
 * NOTE: This pass adds JSDoc headers above functions without changing logic.
 * Public APIs, exports, and code behavior remain identical.
 */
// dataCleaner.js

import { getHiddenItems, isCurrentlyHiddenByAsin } from "./visibility.js";
import { getFormData } from "./formHandler.js";
import { selectedLibraries, libraryArrayObject } from "./main.js";
import { debugLogBookViability, 
  debugLogBookAlreadyInLibrary, 
  debugLogOnlyUnabridgedGate, 
  debugLogIgnoreNoPosition, 
  debugLogIgnoreMultiplePositions, 
  debugLogIgnoreDecimalPositions, 
  debugLogIgnoreFutureRelease, 
  debugLogIgnorePastRelease,
  debugLogIgnoreTitleSubtitleExisting,
  debugLogIgnoreSameSeriesPositionExisting,
  debugLogIgnoreTitleSubtitleMissing,
  debugLogIgnoreSameSeriesPositionMissing,
  startDebugSession } from "./debug.js";

  /**
 * @typedef {Object} BookRecord
 * @property {string} asin - Audible ASIN identifier for the book.
 * @property {string} [title] - Title of the book.
 * @property {string|null} [subtitle] - Subtitle of the book, or null if none.
 * @property {string} [series] - Series name the book belongs to (if any).
 * @property {Array<Object>} [seriesMetadata] - Raw series metadata for this book (implementation-dependent).
 * @property {Date|string} [releaseDate] - Release date of the book.
 * @property {boolean} [abridged] - Whether the book is abridged.
 */

/**
 * @typedef {Object} SeriesRecord
 * @property {string} series - Name of the series.
 * @property {string} seriesAsin - Audible ASIN identifier for the series.
 * @property {Array<BookRecord>} response - Array of books in the series.
 */

/**
 * Flags controlling gate behavior across the filtering pipeline.
 * All flags are optional and default to `false` unless set.
 *
 * @typedef {Object} GateOptions
 * @property {boolean} [filterUnabridged] - Include only unabridged books when true.
 * @property {boolean} [onlyUnabridged] - (Deprecated) Legacy alias for `filterUnabridged`.
 * @property {boolean} [ignoreNoPositionBooks] - Skip books with no explicit series position.
 * @property {boolean} [ignoreSubPositionBooks] - Skip books with decimal positions (e.g., "3.5").
 * @property {boolean} [ignoreMultiBooks] - Skip books with multiple positions (e.g., "1-2").
 * @property {boolean} [ignoreFutureDateBooks] - Skip books whose release date is in the future.
 * @property {boolean} [ignorePastDateBooks] - Skip books whose release date is in the past.
 * @property {boolean} [ignoreTitleSubtitle] - Skip if title+subtitle matches an existing library item in the same series.
 * @property {boolean} [ignoreSameSeriesPosition] - Skip if series position overlaps an existing library item.
 * @property {boolean} [ignoreTitleSubtitleInMissingArray] - Skip duplicates (title+subtitle) within the current missing list.
 * @property {boolean} [ignoreSameSeriesPositionInMissingArray] - Skip duplicates (series position) within the current missing list.
 */

/**
 * Normalizes the AudiobookShelf URL to ensure it starts with https://
 * and has no trailing slashes.
 *
 * @param {string} audiobookShelfURL - The raw AudiobookShelf server URL input.
 * @returns {string} - A cleaned and normalized server URL.
 */
/**
 * Sanitiseaudiobookshelfurl.
 *
 * @param {any} audiobookShelfURL 
 * @returns {any}
 */
export function sanitiseAudiobookShelfURL(audiobookShelfURL) {
  if (!/^https?:\/\//i.test(audiobookShelfURL)) {
    audiobookShelfURL = "https://" + audiobookShelfURL;
  }

  return audiobookShelfURL.replace(/\/$/, ""); // Remove trailing slash
}

/**
Normalize strings for robust equality/lookup:
Unicode normalize (NFKD) to separate diacritics
Strip diacritics
Collapse punctuation & whitespace to single spaces
Trim and lowercase
@param {string|null|undefined} input - Raw user or API text.
@returns {string} - A normalized string (empty string for nullish inputs).
*/
/**
 * Normalizetext.
 *
 * @param {any} input 
 * @returns {any}
 */
function normalizeText(input) {
  return (input ?? "")
    .toString()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // remove diacritics (é → e)
    .replace(/[\p{P}\p{S}]+/gu, " ") // punctuation & symbols → space
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Normalize various input shapes into an array of book-like records.
 * Supports:
 *  - an array of records
 *  - objects with .items / .results / .data arrays
 *  - plain object maps (falls back to Object.values)
 */
/**
 * Normalizetoarray.
 *
 * @param {any} input 
 * @returns {any}
 */
function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") return [];

  // common wrappers
  if (Array.isArray(input.items))   return input.items;
  if (Array.isArray(input.results)) return input.results;
  if (Array.isArray(input.data))    return input.data;

  // fallback: if it's a map-like object, use its values
  const values = Object.values(input);
  // only use if it looks like a collection (avoid using Object.values on e.g. Date)
  if (values.length && values.every(value => typeof value === "object" || typeof value === "string")) {
    return values;
  }

  // last resort
  return [];
}

/**
 * Checks if a given IP address is a private/internal IPv4 address.
 * @param {string} ipAddress - IP address to check.
 * @returns {boolean} - True if the IP is private/internal.
 */
/**
 * Isprivateip.
 *
 * @param {any} ipAddress 
 * @returns {any}
 */
function isPrivateIP(ipAddress) {
  return (
    /^10\.(\d{1,3}\.){2}\d{1,3}$/.test(ipAddress) ||                          // 10.x.x.x
    /^192\.168\.(\d{1,3})\.\d{1,3}$/.test(ipAddress) ||                      // 192.168.x.x
    /^172\.(1[6-9]|2\d|3[0-1])\.(\d{1,3})\.\d{1,3}$/.test(ipAddress) ||      // 172.16.x.x - 172.31.x.x
    /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(ipAddress)                 // loopback
  );
}

/**
 * Determines whether the host in a sanitized URL is a private/internal IP address.
 * Skips domain names and only checks if the host is a valid IP address.
 *
 * @param {string} sanitizedUrl - The URL to inspect (already cleaned)
 * @returns {boolean} - True if it's a private/internal IP, false otherwise
 */
/**
 * Isinternalaudiobookshelfurl.
 *
 * @param {any} sanitizedUrl 
 * @returns {any}
 */
export function isInternalAudiobookShelfURL(sanitizedUrl) {
  try {
    const { hostname } = new URL(sanitizedUrl);

    // If hostname is an IP address, test if it's private
    const isIp = /^[\d.]+$/.test(hostname);
    return isIp ? isPrivateIP(hostname) : false;
  } catch (err) {
    console.warn("Invalid URL format:", sanitizedUrl);
    return false;
  }
}

/**
 * Returns a new `existingContent` where series present in the hidden list are removed from `seriesFirstASIN`.
 * (Pure: does not mutate the input.)
 *
 * @param {{ seriesFirstASIN: Array<{series: string, asin: string}> }} existingContent
 * @returns {{ seriesFirstASIN: Array<{series: string, asin: string}> }}
 */
/**
 * Removehiddenseries.
 *
 * @param {any} existingContent 
 * @returns {any}
 */
export function removeHiddenSeries(existingContent) {
  const hiddenItemsList = getHiddenItems() || [];

  const visibleSeriesList = (existingContent?.seriesFirstASIN || []).filter(seriesEntry =>
    !hiddenItemsList.some(hiddenEntry =>
      hiddenEntry?.type === "series" && hiddenEntry?.series === seriesEntry?.series
    )
  );

  return { ...existingContent, seriesFirstASIN: visibleSeriesList };
}

/**
 * Finds books from the given series metadata that are missing from the existing library content,
 * applying an ordered sequence of gate functions to decide which books to skip.
 *
 * @param {BookRecord[]} existingContent - Flat array of existing library book objects.
 * @param {SeriesRecord[]} seriesMetadata - Array of series records, each typically containing `seriesAsin` and `response` (array of book records).
 * @param {GateOptions} formData - User-selected filtering options consumed by the gate functions.
 * @returns {BookRecord[]} - Array of book records considered missing from the library after all gates are applied.
 */
/**
 * Findmissingbooks.
 *
 * @param {any} existingContent 
 * @param {any} seriesMetadata 
 * @param {any} formData 
 * @returns {any}
 */
export function findMissingBooks(existingContent, seriesMetadata, formData) {
  ensureDebugSession(); // only starts when debug is enabled

  const libraryASINs = new Set(existingContent.map(bookItem => bookItem.asin));
  const missingBooks = [];

  // Ordered list of gates; behavior unchanged
  const BOOK_FILTER_GATES = [
    gateNotViable,
    gateAlreadyInLibrary,
    gateOnlyUnabridged,
    gateIgnoreNoSeriesPosition,
    gateIgnoreMultiplePositions,
    gateIgnoreDecimalPositions,
    gateIgnoreFutureRelease,
    gateIgnorePastRelease,
    gateIgnoreTitleSubtitleExisting,
    gateIgnoreSameSeriesPositionExisting,
    gateIgnoreTitleSubtitleMissing,
    gateIgnoreSameSeriesPositionMissing,
  ];

  for (const seriesRecord of seriesMetadata) {
    const booksInSeries = Array.isArray(seriesRecord.response) ? seriesRecord.response : [];
    for (const bookRecord of booksInSeries) {
      const gateContext = {
        // primary objects
        book: bookRecord,
        seriesContext: seriesRecord,

        // derived values
        asin: bookRecord.asin,
        bookSeriesArray: Array.isArray(bookRecord.series) ? bookRecord.series : [],
        releaseDate: normalizeDate(bookRecord.releaseDate || new Date()),
        title: bookRecord.title || "N/A",
        subtitle: bookRecord.subtitle ?? null,

        // collections and options
        existingContent,
        missingBooks,
        libraryASINs,
        formData,
      };

      // If any gate says "skip", go to the NEXT BOOK (not the next series)
      if (runGatePipeline(gateContext, BOOK_FILTER_GATES)) continue;

      if (!doesBookExistInArray(missingBooks, gateContext.asin)) {
        bookRecord.seriesAsin = seriesRecord.seriesAsin;
        missingBooks.push(bookRecord);
      }
    }
  }

  return missingBooks;
}

/**
 * Runs the gates for one book context.
 * @param {object} context - The gate context for a single book.
 * @param {Array<Function>} gates - Gate functions that return true to skip.
 * @returns {boolean} - true if any gate requested to skip this book.
 */
/**
 * Rungatepipeline.
 *
 * @param {any} context 
 * @param {any} gates 
 * @returns {any}
 */
function runGatePipeline(context, gates) {
  for (const gate of gates) {
    if (gate(context) === true) return true;
  }
  return false;
}

/* ======================================================================
   Gate implementations (return true => skip this book)
   Each gate is small, pure, and fully documented.
   ====================================================================== */

/**
Generic gate checker: if a user option is enabled and the condition is true,
log (optionally) and signal “skip” by returning true.
@param {boolean} optionEnabled - Whether the user-enabled filter is active.
@param {boolean} condition - Whether the gate’s condition has been met.
@param {Function} [debugFn] - Optional debug logger function to call on skip.
@param {() => Object} [payloadBuilder] - Optional lazy builder for the debug payload.
@returns {boolean} - True when the gate should skip (option & condition are both truthy), otherwise false.
*/
/**
 * Gatecheck.
 *
 * @param {any} optionEnabled 
 * @param {any} condition 
 * @param {any} debugFn 
 * @param {any} payloadBuilder 
 * @returns {any}
 */
function gateCheck(optionEnabled, condition, debugFn, payloadBuilder) {
  if (optionEnabled && condition) {
    if (typeof debugFn === "function") {
      const payload = typeof payloadBuilder === "function" ? payloadBuilder() : undefined;
      debugFn(payload);
    }
    return true;
    }
  return false;
}

/**
 * Gate: require a "viable" book before any other checks.
 * Determines if the book meets minimum criteria for processing (via {@link isBookViable}).
 * If not viable, logs the result for debugging and skips the book.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {Object} context.book - The book metadata object to evaluate.
 * @param {Object} context.seriesContext - The metadata object for the series containing the book.
 * @returns {boolean} - True if the book is not viable (and should be skipped), otherwise false.
 */
/**
 * Gatenotviable.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateNotViable(context) {
  const { book, seriesContext } = context;
  const isViable = isBookViable(book);
  if (!isViable) {
    debugLogBookViability({ book, seriesContext });
    return true;
  }
  return false;
}

/**
 * Gate: skip books that already exist in the library by ASIN.
 * Checks if the current book's ASIN is already present in the library's ASIN set.
 * If it is, logs a debug message and skips the book.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {string} context.asin - Audible ASIN of the book being evaluated.
 * @param {Set<string>} context.libraryASINs - Set of ASINs for books already in the library.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the book already exists in the library (skip), otherwise false.
 */
/**
 * Gatealreadyinlibrary.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateAlreadyInLibrary(context) {
  const { asin, libraryASINs, book, seriesContext } = context;
  const alreadyInLibrary = libraryASINs.has(asin);
  if (alreadyInLibrary) {
    debugLogBookAlreadyInLibrary({ book, seriesContext, libraryASINs });
    return true;
  }
  return false;
}

/**
 * Gate: when "Only include unabridged" is enabled, skip any book that is NOT unabridged.
 * - Restricts results to unabridged items only.
 * - Checks `formData.filterUnabridged` first, falling back to `formData.onlyUnabridged` for backward compatibility.
 * - Uses {@link isBookUnabridged} to determine abridgement status.
 * - Logs a debug entry when a book is skipped.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the book is abridged and the unabridged-only filter is enabled (skip), otherwise false.
 */
/**
 * Gateonlyunabridged.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateOnlyUnabridged(context) {
  const { formData, book, seriesContext } = context;

  // Prefer the new flag `filterUnabridged`; fall back to legacy `onlyUnabridged` if needed.
  const filterUnabridgedEnabled =
    !!(formData?.filterUnabridged ?? formData?.onlyUnabridged);

  if (!filterUnabridgedEnabled) {
    return false; // filter is off → do not skip on this gate
  }

  // Determine if this book is unabridged using the canonical helper.
  const isUnabridged = isBookUnabridged(book);

  // If it's NOT unabridged, we skip (because the filter is ON).
  if (!isUnabridged) {
    // Keep payload keys aligned with existing debug logger expectations.
    debugLogOnlyUnabridgedGate({
      book,
      seriesContext,
      onlyUnabridgedEnabled: filterUnabridgedEnabled, // keep legacy name for compatibility
      helperReportedUnabridged: isUnabridged,         // false in this branch
    });
    return true; // skip
  }

  // Unabridged book passes.
  return false;
}

/**
 * Gate: ignore books with no explicit series position when the corresponding option is enabled.
 * - Uses {@link hasNoSeriesPosition} to detect absence of a position.
 * - Reads `formData.ignoreNoPositionBooks` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the book has no series position and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignorenoseriesposition.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreNoSeriesPosition(context) {
  const { formData, bookSeriesArray, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreNoPositionBooks;
  const hasNoPosition = hasNoSeriesPosition(bookSeriesArray);

  return gateCheck(
    optionEnabled,
    hasNoPosition,
    debugLogIgnoreNoPosition,
    () => ({ book, seriesContext, optionEnabled, hasNoPosition, positionsList: toPositionsList(bookSeriesArray) })
  );
}

/**
 * Gate: ignore books that have multiple series positions (e.g., "1-2") when the corresponding option is enabled.
 * - Uses {@link hasMultiplePositions} to detect multi-position entries.
 * - Reads `formData.ignoreMultiBooks` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the book has multiple positions and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoremultiplepositions.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreMultiplePositions(context) {
  const { formData, bookSeriesArray, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreMultiBooks;
  const multiplePositions = hasMultiplePositions(bookSeriesArray);

  return gateCheck(
    optionEnabled,
    multiplePositions,
    debugLogIgnoreMultiplePositions,
    () => ({
      book,
      seriesContext,
      optionEnabled,
      multiplePositions,
      positionsList: toPositionsList(bookSeriesArray),
    })
  );
}

/**
 * Gate: ignore books with decimal sub-positions (e.g., "3.5") when the corresponding option is enabled.
 * - Uses {@link hasDecimalSeriesPosition} to detect decimal positions.
 * - Reads `formData.ignoreSubPositionBooks` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the book has one or more decimal positions and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoredecimalpositions.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreDecimalPositions(context) {
  const { formData, bookSeriesArray, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreSubPositionBooks;
  const hasAnyDecimalPosition = hasDecimalSeriesPosition(bookSeriesArray);

  return gateCheck(
    optionEnabled,
    hasAnyDecimalPosition,
    debugLogIgnoreDecimalPositions,
    () => {
      const positionsList = toPositionsList(bookSeriesArray);
      const decimalPositions = positionsList.filter((pos) => /^\d+\.\d+$/.test(pos));
      return { book, seriesContext, optionEnabled, decimalPositions, positionsList };
    }
  );
}

/**
 * Gate: ignore books that have not yet been released (i.e., release date is in the future) when the corresponding option is enabled.
 * - Uses {@link isReleaseInFuture} to determine if the book's release date is after the current date.
 * - Reads `formData.ignoreFutureDateBooks` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Date|string} context.releaseDate - The release date of the book.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the release date is in the future and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignorefuturerelease.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreFutureRelease(context) {
  const { formData, releaseDate, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreFutureDateBooks;
  const isFuture = isReleaseInFuture(releaseDate);

  return gateCheck(
    optionEnabled,
    isFuture,
    debugLogIgnoreFutureRelease,
    () => ({ book, seriesContext, optionEnabled, releaseDate, isFuture })
  );
}

/**
 * Gate: ignore books that have already been released (i.e., release date is in the past) when the corresponding option is enabled.
 * - Uses {@link isReleaseInFuture} (negated) to determine if the book's release date is before or equal to the current date.
 * - Reads `formData.ignorePastDateBooks` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Date|string} context.releaseDate - The release date of the book.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the release date is in the past and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignorepastrelease.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnorePastRelease(context) {
  const { formData, releaseDate, book, seriesContext } = context;
  const optionEnabled = !!formData.ignorePastDateBooks;
  const isPast = !isReleaseInFuture(releaseDate);

  return gateCheck(
    optionEnabled,
    isPast,
    debugLogIgnorePastRelease,
    () => ({ book, seriesContext, optionEnabled, releaseDate, isPast })
  );
}

/**
 * Gate: ignore books that match both title and subtitle with an existing library item in the same series.
 * - Uses {@link doesTitleSubtitleMatch} to detect matches against the existing library content.
 * - Reads `formData.ignoreTitleSubtitle` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {string} context.title - Title of the book being evaluated.
 * @param {string|null} context.subtitle - Subtitle of the book being evaluated (or null if none).
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Array<Object>} context.existingContent - Array of existing book metadata objects in the library.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the title/subtitle matches an existing book in the same series and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoretitlesubtitleexisting.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreTitleSubtitleExisting(context) {
  const { formData, title, subtitle, bookSeriesArray, existingContent, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreTitleSubtitle;
  const helperMatched = doesTitleSubtitleMatch(title, subtitle, bookSeriesArray, existingContent);

  if (optionEnabled && helperMatched) {
    debugLogIgnoreTitleSubtitleExisting({
      book,
      seriesContext,
      optionEnabled,
      title,
      subtitle,
      bookSeriesArray,
      existingContent,
      helperMatched,
    });
    return true;
  }
  return false;
}

/**
 * Gate: ignore books that share a series position with any existing library item.
 * - Uses {@link hasSameSeriesPosition} to detect position overlap with books already in the library.
 * - Reads `formData.ignoreSameSeriesPosition` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Array<Object>} context.existingContent - Array of existing book metadata objects in the library.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the series position overlaps with an existing library item and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoresameseriespositionexisting.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreSameSeriesPositionExisting(context) {
  const { formData, bookSeriesArray, existingContent, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreSameSeriesPosition;
  const overlap = hasSameSeriesPosition(bookSeriesArray, existingContent);

  if (optionEnabled && overlap) {
    debugLogIgnoreSameSeriesPositionExisting({
      book,
      seriesContext,
      optionEnabled,
      bookSeriesArray,
      existingContent,
      helperDetectedOverlap: overlap,
    });
    return true;
  }
  return false;
}

/**
 * Gate: ignore duplicate title/subtitle combinations within the current missing-books list, keeping only the first occurrence.
 * - Uses {@link doesTitleSubtileMatchMissingExists} to check for duplicates in the `missingBooks` array.
 * - Reads `formData.ignoreTitleSubtitleInMissingArray` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {string} context.title - Title of the book being evaluated.
 * @param {string|null} context.subtitle - Subtitle of the book being evaluated (or null if none).
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Array<Object>} context.missingBooks - Array of books already identified as missing from the library.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the title/subtitle matches an existing entry in the missing list and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoretitlesubtitlemissing.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreTitleSubtitleMissing(context) {
  const { formData, title, subtitle, bookSeriesArray, missingBooks, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreTitleSubtitleInMissingArray;
  const helperMatched = doesTitleSubtileMatchMissingExists(title, subtitle, bookSeriesArray, missingBooks);

  if (optionEnabled && helperMatched) {
    debugLogIgnoreTitleSubtitleMissing({
      book,
      seriesContext,
      optionEnabled,
      title,
      subtitle,
      bookSeriesArray,
      missingBooks,
      helperMatched,
    });
    return true;
  }
  return false;
}

/**
 * Gate: ignore duplicate series positions within the current missing-books list, keeping only the first occurrence.
 * - Uses {@link hasSameSeriesPositionMissingExists} to check for position overlap in the `missingBooks` array.
 * - Reads `formData.ignoreSameSeriesPositionInMissingArray` to determine if the filter is active.
 * - Logs a debug record when a book is skipped by this rule.
 *
 * @param {Object} context - Data for evaluating the gate.
 * @param {GateOptions} context.formData - User filter settings controlling this gate’s behavior.
 * @param {Array<Object>} context.bookSeriesArray - Array of series metadata objects for the book.
 * @param {Array<Object>} context.missingBooks - Array of books already identified as missing from the library.
 * @param {Object} context.book - Full metadata for the book being evaluated.
 * @param {Object} context.seriesContext - Metadata for the series containing this book.
 * @returns {boolean} - True if the series position overlaps with an entry in the missing list and the filter is enabled (skip), otherwise false.
 */
/**
 * Gateignoresameseriespositionmissing.
 *
 * @param {any} context 
 * @returns {any}
 */
function gateIgnoreSameSeriesPositionMissing(context) {
  const { formData, bookSeriesArray, missingBooks, book, seriesContext } = context;
  const optionEnabled = !!formData.ignoreSameSeriesPositionInMissingArray;
  const overlap = hasSameSeriesPositionMissingExists(bookSeriesArray, missingBooks);

  if (optionEnabled && overlap) {
    debugLogIgnoreSameSeriesPositionMissing({
      book,
      seriesContext,
      optionEnabled,
      bookSeriesArray,
      missingBooks,
      helperDetectedOverlap: overlap,
    });
    return true;
  }
  return false;
}

/* ======================================================================
   Small utilities used by the pipeline
   ====================================================================== */

/**
 * Creates a human-readable list of series positions for a book (e.g., ["1", "2", "3.5"]).
 * @param {Array<Object>} bookSeriesArray
 * @returns {Array<string>}
 */
/**
 * Topositionslist.
 *
 * @param {any} bookSeriesArray 
 * @returns {any}
 */
function toPositionsList(bookSeriesArray) {
  if (!Array.isArray(bookSeriesArray)) return [];
  return bookSeriesArray.map((seriesEntry) =>
    seriesEntry?.position != null ? String(seriesEntry.position) : "N/A"
  );
}

/**
 * Normalizes any incoming date-like value to a valid Date. Falls back to "now" if invalid/empty.
 * @param {Date|string|number|null|undefined} value
 * @returns {Date}
 */
/**
 * Normalizedate.
 *
 * @param {any} value 
 * @returns {any}
 */
function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Starts a debug session if the UI flag is enabled.
 * This reads the checkbox directly to avoid coupling findMissingBooks to DOM details.
 */
/**
 * Ensuredebugsession.
 *
 * @returns {any}
 */
function ensureDebugSession() {
  const debugEnabled =
    typeof window !== "undefined" &&
    document.getElementById("enableDebugChecks")?.checked === true;

  if (debugEnabled && typeof startDebugSession === "function") {
    startDebugSession({ label: "Find missing books" });
  }
}


/**
 * Determines whether a book has any associated series entry without a defined position.
 *
 * @param {Array<Object>} seriesArray - An array of series objects associated with a book.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
/**
 * Hasnoseriesposition.
 *
 * @param {any} seriesArray 
 * @returns {any}
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
/**
 * Hasmultiplepositions.
 *
 * @param {any} seriesArray 
 * @returns {any}
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
/**
 * Hasdecimalseriesposition.
 *
 * @param {any} seriesArray 
 * @returns {any}
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
/**
 * Isreleaseinfuture.
 *
 * @param {any} releaseDateString 
 * @returns {any}
 */
function isReleaseInFuture(releaseDateString) {
  const releaseDate = new Date(releaseDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);
  return today <= releaseDate;
}

/**
 * Returns true when (title, subtitle) matches any existing library item in the same series.
 *
 * @param {string} title - Candidate book title.
 * @param {string|null} subtitle - Candidate book subtitle (null if none).
 * @param {Array<Object>} bookSeriesArray - Candidate's series entries.
 * @param {Array<Object>} existingContent - Library books to check against.
 * @returns {boolean}
 */
/**
 * Doestitlesubtitlematch.
 *
 * @param {any} title 
 * @param {any} subtitle 
 * @param {any} bookSeriesArray 
 * @param {any} existingContent 
 * @returns {any}
 */
function doesTitleSubtitleMatch(title, subtitle, bookSeriesArray, existingContent) {
  const nTitle = normalizeText(title);
  const nSubtitle = normalizeText(subtitle);
  const candidateSeries = new Set(
    (Array.isArray(bookSeriesArray) ? bookSeriesArray : [])
      .map(seriesEntry => normalizeText(seriesEntry?.name ?? seriesEntry?.series ?? seriesEntry))
  );

  for (const existing of (Array.isArray(existingContent) ? existingContent : [])) {
    const eTitle = normalizeText(existing?.title);
    const eSubtitle = normalizeText(existing?.subtitle);
    const eSeries = normalizeText(existing?.series);

    if (candidateSeries.has(eSeries) && eTitle === nTitle && eSubtitle === nSubtitle) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true when (title, subtitle) matches an entry already present in the current missingBooks list
 * for the same series.
 *
 * @param {string} title - Candidate book title.
 * @param {string|null} subtitle - Candidate book subtitle (null if none).
 * @param {Array<Object>} bookSeriesArray - Candidate's series entries.
 * @param {Array<Object>} missingBooks - Current list of books marked missing.
 * @returns {boolean}
 */
/**
 * Doestitlesubtilematchmissingexists.
 *
 * @param {any} title 
 * @param {any} subtitle 
 * @param {any} bookSeriesArray 
 * @param {any} missingBooks 
 * @returns {any}
 */
function doesTitleSubtileMatchMissingExists(title, subtitle, bookSeriesArray, missingBooks) {
  const nTitle = normalizeText(title);
  const nSubtitle = normalizeText(subtitle);
  const candidateSeries = new Set(
    (Array.isArray(bookSeriesArray) ? bookSeriesArray : [])
      .map(seriesEntry => normalizeText(seriesEntry?.name ?? seriesEntry?.series ?? seriesEntry))
  );

  for (const missing of (Array.isArray(missingBooks) ? missingBooks : [])) {
    for (const selectedSeries of missing.series) {
      const mTitle = normalizeText(missing?.title);
      const mSubtitle = normalizeText(missing?.subtitle);
      const mSeries = normalizeText(selectedSeries?.name);

      if (candidateSeries.has(mSeries) && mTitle === nTitle && mSubtitle === nSubtitle) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Determines whether a book has the same title and subtitle as an existing book in the library.
 *
 * @param {Array<Object>} bookSeriesArray - An array of series objects associated with a book.
 * @param {Array<Object>} existingContent - Array of existing book objects.
 * @returns {boolean} - True if any entry has a missing or undefined position ("N/A").
 */
/**
 * Hassameseriesposition.
 *
 * @param {any} bookSeriesArray 
 * @param {any} existingContent 
 * @returns {any}
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
/**
 * Hassameseriespositionmissingexists.
 *
 * @param {any} bookSeriesArray 
 * @param {any} missingBooks 
 * @returns {any}
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
/**
 * Doesbookexistinarray.
 *
 * @param {any} missingBooks 
 * @param {any} bookAsin 
 * @returns {any}
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
/**
 * Isbookviable.
 *
 * @param {any} bookMetadata 
 * @returns {any}
 */
function isBookViable(bookMetadata) {
  const formData = getFormData();

  return (
    bookMetadata.isAvailable !== false &&
    bookMetadata.region === formData.region
  );
}

/**
 * Isbookunabridged.
 *
 * @param {any} bookMetadata 
 * @returns {any}
 */
function isBookUnabridged(bookMetadata) {
  return (
    bookMetadata.bookFormat === "unabridged"
  );
}

/**
 * Groups a flat list of book records by their series name.
 *
 * @param {BookRecord[]} books - Flat array of book records to group.
 * @returns {Map<string, BookRecord[]>} - A Map keyed by series name, where each value is an array of books in that series.
 */
/**
 * Groupbooksbyseries.
 *
 * @param {any} missingBooks 
 * @param {any} includeSubSeries 
 * @returns {any}
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
 * Sorts an array of series records alphabetically by the `series` name.
 *
 * Behavior notes:
 * - Case-insensitive comparison (`toLowerCase()`); locale-specific ordering is NOT applied.
 * - Relies on modern JS engines’ stable sort (order of equal items is preserved).
 * - If `series` is missing or falsy, it is treated as an empty string.
 *
 * @param {SeriesRecord[]} seriesArray - Array of series records to sort.
 * @returns {SeriesRecord[]} - New array sorted alphabetically by `series` (case-insensitive).
 */
/**
 * Sortseriesalphabetically.
 *
 * @param {any} groupedBySeries 
 * @returns {any}
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
 * Sorts items alphabetically by `series` (primary) and then by `title` (secondary).
 *
 * Behavior notes:
 * - Case-insensitive comparison on both fields; locale-specific ordering is NOT applied.
 * - Relies on modern JS engines’ stable sort (order of equal items is preserved).
 * - If `series` or `title` is missing/falsy, it is treated as an empty string.
 *
 * @param {BookRecord[]} metadataItems - Array of items with at least `series` and `title` strings.
 * @returns {BookRecord[]} - New array sorted by `series` then `title` (both case-insensitive).
 */
/**
 * Sortbyseriesthentitle.
 *
 * @param {any} metadataItems 
 * @returns {any}
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

/**
 * Updates the global `selectedLibraries.librariesList` based on checkbox state in the DOM
 * and toggles the submit button’s enabled state.
 *
 * NOTE:
 * - This function mixes DOM access and state updates, which makes unit testing harder.
 * - Keep DOM-reading/writing here (UI concern) and consider delegating the pure selection logic
 *   to a helper like `deriveSelectedLibraries(checkboxStates, libraryArrayObject)` for testability.
 * - If `libraryCheckboxContainer` or the submit button is missing, we silently do nothing (see inline notes).
 *
 * @param {HTMLElement} libraryCheckboxContainer - The container element holding library checkboxes.
 * @returns {void}
 */
/**
 * Updatedselectedlibraries.
 *
 * @param {any} libraryCheckboxContainer 
 * @returns {any}
 */
export function updatedSelectedLibraries(libraryCheckboxContainer) {
  // NOTE: Guarding the submit button lookup: if not found, we fail silently.
  const submitButton = document.getElementById("selectLibrarySubmit");

  // PREP: clear the current selection (stateful side-effect).
  // SAFETY: if selection is used elsewhere concurrently, consider replacing the array instead of truncating.
  selectedLibraries.librariesList.length = 0;

  // 1) READ FROM DOM: collect all checkbox inputs within the provided container (UI concern).
  // NOTE: Assumes `libraryCheckboxContainer` is a valid element and contains checkboxes.
  const libraryCheckboxes = libraryCheckboxContainer.querySelectorAll('input[type="checkbox"]');

  // 2) TRANSFORM: build a lightweight array of checkbox states (pure data shape).
  const checkboxStates = Array.from(libraryCheckboxes).map(checkbox => ({
    id: checkbox.id,
    checked: checkbox.checked,
    value: checkbox.value || null
  }));

  // 3) UPDATE APP STATE: map selected checkboxes to library objects and store in global selection (side-effect).
  // TIP: For testability, consider extracting the lookup logic to a pure helper.
  for (const checkbox of checkboxStates) {
    if (checkbox.checked) {
      const matchedLibrary = libraryArrayObject.librariesList.find(
        library => library.id === checkbox.id
      );
      if (matchedLibrary) {
        selectedLibraries.librariesList.push(matchedLibrary);
      }
    }
  }

  // 4) UPDATE UI: enable/disable the submit button based on whether any libraries are selected (UI concern).
  // NOTE: If the submit button is not present, skip without throwing.
  if (submitButton) {
    submitButton.disabled = selectedLibraries.librariesList.length === 0;
  }
}