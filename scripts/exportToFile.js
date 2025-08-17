// scripts/exportToFile.js
// Dedicated helpers for exporting the CURRENTLY FILTERED debug logs.

import { getFilteredDebugLogs } from "./debugView.js";

/**
 * Join all series names from a record into a comma-separated string.
 * Falls back to `name` or `title` on each series item when `seriesName` is absent.
 *
 * @param {{ series?: Array<{ seriesName?: string, name?: string, title?: string }> } | null | undefined} record
 * @returns {string} Comma-separated series names, or an empty string if none.
 */
function formatSeriesNames(record) {
  if (!record || !Array.isArray(record.series)) return "";
  try {
    return record.series
      .map((seriesItem) => {
        if (!seriesItem) return "";
        // Get the best series name
        const seriesName =
          seriesItem.seriesName ||
          seriesItem.name ||
          seriesItem.title ||
          "";
        // Get the position if available
        const position = seriesItem.position
          ? ` #${seriesItem.position}`
          : "";

        return seriesName ? `${seriesName}${position}` : "";
      })
      .filter(Boolean) // Remove empty strings
      .join(", ");
  } catch {
    return "";
  }
}

/**
 * Prefer `record.quickFacts`; fallback to `record.details`; otherwise return `null`.
 *
 * Does not mutate the input.
 *
 * @param {{ quickFacts?: any, details?: any } | null | undefined} record
 * @returns {any|null} The preferred details value, or null if neither is present.
 */
function selectDetails(record) {
  if (!record) return null;
  if (record.quickFacts !== undefined && record.quickFacts !== null) return record.quickFacts;
  if (record.details !== undefined && record.details !== null) return record.details;
  return null;
}

/**
 * Create a stable, filesystem-safe UTC timestamp for filenames.
 * Format: "YYYY-MM-DDTHH-MM-SSZ" (colons and dots replaced with hyphens).
 *
 * @returns {string} Timestamp string, e.g. "2025-08-14T17-59-09Z".
 */
function makeTimestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Safely resolve a DOM element from either an HTMLElement or a CSS selector string.
 * - If an HTMLElement is provided, it’s returned as-is.
 * - If a string selector is provided, queries the document for the first match.
 * - Otherwise, falls back to querying `fallbackSelector`.
 *
 * @param {HTMLElement|string|null|undefined} elementOrSelector - Element instance or CSS selector.
 * @param {string} [fallbackSelector="#debugModal"] - Selector to use when the first argument isn’t usable.
 * @returns {HTMLElement|null} The resolved element, or null if not found.
 */
function resolveElement(elementOrSelector, fallbackSelector = "#debugModal") {
  if (elementOrSelector && typeof elementOrSelector.querySelector === "function") return elementOrSelector; // Already an element
  if (typeof elementOrSelector === "string") return document.querySelector(elementOrSelector);

  return document.querySelector(fallbackSelector);
}

/**
 * Convert a JavaScript value into a CSV-safe field string.
 * - Null/undefined → empty string.
 * - If the value contains a quote, comma, or newline, wrap in quotes and escape quotes by doubling.
 *
 * @param {unknown} rawValue - The value to serialize into a CSV field.
 * @returns {string} CSV-safe field text.
 */
function createCsvSafeField(rawValue) {
  if (rawValue === null || rawValue === undefined) return "";
  const fieldText = String(rawValue);
  return /[",\n]/.test(fieldText) ? `"${fieldText.replace(/"/g, '""')}"` : fieldText;
}

/**
 * Map the current "group by" selection and a record to a human-readable group label.
 * Mirrors the grouping rules used in the debug view.
 *
 * @param {Record<string, any>} logRecord - The record to derive a label from.
 * @param {string} groupByMode - One of: "check" | "outcome" | "series" | "title" | "region" | "available" | (other).
 * @returns {string} The label for the group header.
 */
function groupLabelFor(logRecord, groupByMode) {
  switch (groupByMode) {
    case "check":     return logRecord.checkLabel || logRecord.check || "(none)";
    case "outcome":   return logRecord.outcome ?? "(none)";
    case "series":    return formatSeriesNames(logRecord) || "(none)";
    case "title":     return logRecord.title ?? "(none)";
    case "region":    return logRecord.region ?? "(none)";
    case "available": return logRecord.isAvailable ? "Available" : "Unavailable";
    default:          return "All results";
  }
}

/**
 * Read the current group-by value from the modal.
 *
 * @param {HTMLElement|string|null} debugModalElement - Modal root element or a selector.
 * @returns {string} The selected group-by value; defaults to "none" if unavailable.
 */
function getCurrentGroupBy(debugModalElement) {
  const resolvedModalElement = resolveElement(debugModalElement);
  const groupBySelectElement = resolvedModalElement?.querySelector("#dbgGroupBy");
  return groupBySelectElement?.value || "none";
}

/**
 * Export the CURRENT filtered view as JSON.
 * Uses the controls in #debugModal to determine the filtered set.
 *
 * Side effects:
 * - Triggers a download of a JSON file containing the filtered logs.
 *
 * @param {HTMLElement|string|null} debugModalElement - Modal root element or a selector (validated for existence).
 * @returns {void}
 */
export function exportFilteredLogsAsJson(debugModalElement) {
  const resolvedModalElement = resolveElement(debugModalElement);
  if (!resolvedModalElement) return;

  // Pull the logs based on current UI filter state.
  const filteredLogs = getFilteredDebugLogs(); // uses controls in #debugModal
  if (!filteredLogs.length) return;

  const fileName = `debug-logs-${makeTimestampForFilename()}.json`;
  const dataBlob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(dataBlob);

  const downloadAnchorElement = document.createElement("a");
  downloadAnchorElement.href = objectUrl;
  downloadAnchorElement.download = fileName;
  document.body.appendChild(downloadAnchorElement);
  downloadAnchorElement.click();
  downloadAnchorElement.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Export the CURRENT filtered view as CSV.
 * Includes a "Group" column when a group is selected (not "none").
 *
 * Side effects:
 * - Triggers a CSV download of the filtered logs.
 *
 * @param {HTMLElement|string|null} debugModalElement - Modal root element or a selector (validated for existence).
 * @returns {void}
 */
export function exportFilteredLogsAsCsv(debugModalElement) {
  const resolvedModalElement = resolveElement(debugModalElement);
  if (!resolvedModalElement) return;

  const filteredLogs = getFilteredDebugLogs(); // uses controls in #debugModal
  if (!filteredLogs.length) return;

  const groupByValue = getCurrentGroupBy(resolvedModalElement);
  const includeGroupColumn = groupByValue !== "none";

  // Column order must match the visible table
  const baseColumns = [
    "Index", "Session", "Check", "Outcome",
    "ASIN", "Series", "Title", "Region", "Available", "Details"
  ];
  const headerColumns = includeGroupColumn ? ["Group", ...baseColumns] : baseColumns;

  // NOTE: assign the function reference (do not invoke here)
  const toCsvField = createCsvSafeField;

  // Header row
  const headerRow = headerColumns.map(toCsvField).join(",");

  // Data rows
  const dataRows = filteredLogs.map((record) => {
    const groupCell = includeGroupColumn ? [groupLabelFor(record, groupByValue)] : [];
    const detailsValue = selectDetails(record);

    const fields = [
      ...groupCell,
      String(record.sessionIndex ?? ""),
      record.sessionId ?? "",
      record.checkLabel || record.check || "",
      record.outcome || "",
      record.asin || "",
      formatSeriesNames(record),
      record.title || "",
      record.region || "",
      record.isAvailable != null ? String(!!record.isAvailable) : "",
      (typeof detailsValue === "object" ? JSON.stringify(detailsValue) : (detailsValue ?? ""))
    ].map(toCsvField);

    return fields.join(",");
  });

  const csvString = [headerRow, ...dataRows].join("\n");
  const fileName = `debug-logs-${makeTimestampForFilename()}.csv`;

  const dataBlob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(dataBlob);

  const downloadAnchorElement = document.createElement("a");
  downloadAnchorElement.href = objectUrl;
  downloadAnchorElement.download = fileName;
  document.body.appendChild(downloadAnchorElement);
  downloadAnchorElement.click();
  downloadAnchorElement.remove();

  URL.revokeObjectURL(objectUrl);
}

/* ============================================================================
 * Missing Books export
 * ==========================================================================*/

/**
 * Flatten grouped series data into CSV-ready rows.
 *
 * Output columns:
 *  1) series            - The top-level series that this entry was filtered on
 *  2) seriesAsin        - The canonical series ASIN for the book (prefers book.seriesAsin, else first series[].asin)
 *  3) title             - Book title
 *  4) allSeries         - Comma-separated list of all series this book belongs to
 *  5) subtitle          - Book subtitle
 *  6) authors           - Comma-separated list of author names
 *  7) narrators         - Comma-separated list of narrator names
 *  8) publisher         - Publisher string
 *  9) genres            - Comma-separated list of genre names
 * 10) asin              - Book ASIN
 * 11) sku               - SKU
 * 12) skuGroup          - SKU group
 * 13) isbn              - ISBN
 * 14) region            - Primary region code (e.g., "uk")
 * 15) bookFormat        - e.g., "unabridged"
 *
 * @param {Array<{
 *   series?: string,
 *   seriesName?: string,
 *   name?: string,
 *   title?: string,
 *   books?: Array<any>
 * }>} groupedEntries
 * @returns {Array<Object>} Array of rows with keys in the order above.
 */
export function flattenGroupedMissingBooksForExport(groupedEntries = []) {
  const rows = [];

  // --- Local helpers (simple and explicit) ------------------------------

  /**
   * Convert any possibly-null/undefined value to a safe string.
   * @param {any} value
   * @returns {string}
   */
  function asText(value) {
    return value == null ? "" : String(value);
  }

  /**
   * Turn an array of objects (or strings) that represent people into a
   * comma-separated list of names. Expects `.name` on objects.
   * @param {Array<{name?: string}>|Array<string>|undefined|null} peopleArray
   * @returns {string}
   */
  function formatNarratorList(peopleArray) {
    if (!Array.isArray(peopleArray) || peopleArray.length === 0) return "";
    const names = peopleArray
      .map((person) => {
        if (!person) return "";
        if (typeof person === "string") return person.trim();
        if (person.name) return String(person.name).trim();
        return "";
      })
      .filter(Boolean);
    return names.join(", ");
  }

  /**
   * Turn a genres array into a comma-separated string.
   * Preference:
   *  1) Items that look like true genres (betterType === "genre" or type === "Genres")
   *  2) Otherwise, all items' names
   * Duplicates are removed while preserving the original order.
   *
   * @param {Array<{ name?: string, type?: string, betterType?: string }>|null|undefined} genres
   * @returns {string}
   */
  function formatGenresList(genres) {
    if (!Array.isArray(genres) || genres.length === 0) return "";

    // Prefer items explicitly marked as genres.
    const preferredGenres = genres.filter(
      (item) => item && (item.betterType === "genre" || item.type === "Genres")
    );

    // Choose which list to use (preferred if any, else the original).
    const candidateGenres = preferredGenres.length > 0 ? preferredGenres : genres;

    // Extract trimmed names, ignoring blanks.
    const rawGenreNames = candidateGenres
      .map((item) => asText(item?.name).trim())
      .filter(Boolean);

    // De-duplicate while preserving first occurrence.
    const seenNames = new Set();
    const uniqueGenreNames = [];
    for (const genreName of rawGenreNames) {
      if (!seenNames.has(genreName)) {
        seenNames.add(genreName);
        uniqueGenreNames.push(genreName);
      }
    }

    return uniqueGenreNames.join(", ");
  }

  /**
   * Extract a best-effort canonical series ASIN for a book.
   * Prefers `book.seriesAsin`; otherwise falls back to the first `book.series[0].asin` if present.
   * @param {any} book
   * @returns {string}
   */
  function extractSeriesAsin(book) {
    if (book?.seriesAsin) return asText(book.seriesAsin);
    const firstSeries = Array.isArray(book?.series) ? book.series[0] : null;
    return firstSeries?.asin ? asText(firstSeries.asin) : "";
  }

  // ---------------------------------------------------------------------

  for (const groupedEntry of groupedEntries || []) {
    // The main series that this group was filtered on (top-level series string).
    const filteredOnSeriesName =
      groupedEntry?.series ??
      groupedEntry?.seriesName ??
      groupedEntry?.name ??
      groupedEntry?.title ??
      "";

    const booksInGroup = Array.isArray(groupedEntry?.books) ? groupedEntry.books : [];

    for (const book of booksInGroup) {
      // Use existing series string formatter for the book's own series array.
      const allSeriesForThisBook = (typeof formatSeriesNames === "function")
        ? formatSeriesNames(book) || "(none)" // expects { series: [...] } on the passed object
        : ""; // fallback to empty string if not available

      // Build row with keys in the EXACT requested order
      rows.push({
        series: asText(filteredOnSeriesName),
        seriesAsin: extractSeriesAsin(book),
        title: asText(book?.title),
        allSeries: asText(allSeriesForThisBook),
        subtitle: asText(book?.subtitle),
        authors: formatNarratorList(book?.authors),
        narrators: formatNarratorList(book?.narrators),
        publisher: asText(book?.publisher),
        genres: formatGenresList(book?.genres),
        asin: asText(book?.asin ?? book?.ASIN),
        sku: asText(book?.sku),
        skuGroup: asText(book?.skuGroup),
        isbn: asText(book?.isbn),
        region: asText(book?.region),
        bookFormat: asText(book?.bookFormat),
      });
    }
  }

  return rows;
}

/**
 * Export `groupedMissingBooks` as a pretty-printed JSON file.
 *
 * - Uses `flattenGroupedMissingBooksForExport` to build rows
 * - Pretty prints with 2-space indent
 * - Filenames include a UTC timestamp from `makeTimestampForFilename()`
 * - Triggers a download via an object URL, then cleans up
 *
 * @param {Array} groupedMissingBooks
 * @param {string} [baseName="missing-books"]
 */
export function exportMissingAsJson(groupedMissingBooks, baseName = "missing-books") {
  // Flatten to a CSV/JSON-ready structure
  const exportRows = flattenGroupedMissingBooksForExport(groupedMissingBooks);

  // Serialize as pretty JSON
  const jsonContent = JSON.stringify(exportRows, null, 2);

  // Build a filesystem-safe filename
  const filename = `${baseName}-${makeTimestampForFilename()}.json`;

  // Prepare a Blob and object URL for download
  const fileBlob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
  const objectURL = URL.createObjectURL(fileBlob);

  // Create a temporary anchor to trigger the download
  const downloadLink = document.createElement("a");
  downloadLink.href = objectURL;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  // Revoke the object URL to free memory
  URL.revokeObjectURL(objectURL);
}

/**
 * Export `groupedMissingBooks` as a CSV file.
 *
 * Columns (in this exact order):
 *  series, seriesAsin, title, allSeries, subtitle, authors, narrators, publisher,
 *  genres, asin, sku, skuGroup, isbn, region, bookFormat
 *
 * - Uses `flattenGroupedMissingBooksForExport` to produce rows
 * - CSV quoting handled by `createCsvSafeField`
 * - Filenames include a UTC timestamp from `makeTimestampForFilename()`
 * - Triggers a download via an object URL, then cleans up
 *
 * @param {Array} groupedMissingBooks
 * @param {string} [baseName="missing-books"]
 */
export function exportMissingAsCsv(groupedMissingBooks, baseName = "missing-books") {
  // Flatten into CSV-ready rows
  const exportRows = flattenGroupedMissingBooksForExport(groupedMissingBooks);
  if (!exportRows.length) return;

  // Define header order explicitly for stable CSV column order
  const headerKeys = [
    "series",
    "seriesAsin",
    "title",
    "allSeries",
    "subtitle",
    "authors",
    "narrators",
    "publisher",
    "genres",
    "asin",
    "sku",
    "skuGroup",
    "isbn",
    "region",
    "bookFormat",
  ];

  // Build header line using CSV-safe quoting
  const headerLine = headerKeys.map(createCsvSafeField).join(",");

  // Build data lines in the exact same order as headers
  const dataLines = exportRows.map((row) =>
    headerKeys.map((key) => createCsvSafeField(row?.[key] ?? "")).join(",")
  );

  // Join lines — convention is "\n" endings and no BOM
  const csvContent = [headerLine, ...dataLines].join("\n");

  // Create a filesystem-safe filename
  const filename = `${baseName}-${makeTimestampForFilename()}.csv`;

  // Prepare a Blob and object URL for download
  const fileBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const objectURL = URL.createObjectURL(fileBlob);

  // Create a temporary anchor to trigger the download
  const downloadLink = document.createElement("a");
  downloadLink.href = objectURL;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  // Revoke the object URL to free memory
  URL.revokeObjectURL(objectURL);
}