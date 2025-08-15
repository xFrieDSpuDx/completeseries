// scripts/debugExports.js
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
      .map((seriesItem) => (seriesItem && (seriesItem.seriesName || seriesItem.name || seriesItem.title) || ""))
      .filter(Boolean)
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
  if (elementOrSelector && typeof elementOrSelector.querySelector === "function") {
    return elementOrSelector; // Already an element
  }
  if (typeof elementOrSelector === "string") {
    return document.querySelector(elementOrSelector);
  }
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