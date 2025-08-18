import { getDebugLogs } from "./debug.js";
import {
  emptyDivContent,
  setSelectOptions,
  addChipCheckbox,
  addTableElement,
  addTableSection,
  addTableRow,
  addHeaderCell,
  addCell,
  addTextElement
} from "./elementFactory.js";
// --- Click-to-sort state & helpers ---
let __dbgSort = { key: null, dir: "asc" }; // dir: "asc" | "desc"

/**
 * Convert a visible table header label into the canonical sort key used by the sorter.
 *
 * Accepts any casing and trims whitespace. Returns `null` when the label
 * is not recognized (so header remains non-sortable).
 *
 * @param {string} headerLabel - The display text from the table header.
 * @returns {"Index"|"Session"|"Check"|"Outcome"|"ASIN"|"Series"|"Title"|"Region"|"Available"|"Details"|null}
 */
function normaliseHeaderToSortKey(headerLabel) {
  const normalisedLabel = String(headerLabel ?? "")
    .trim()
    .toLowerCase();

  if (normalisedLabel === "index") return "Index";
  if (normalisedLabel === "session") return "Session";
  if (normalisedLabel === "check") return "Check";
  if (normalisedLabel === "outcome") return "Outcome";
  if (normalisedLabel === "asin") return "ASIN";
  if (normalisedLabel === "series") return "Series";
  if (normalisedLabel === "title") return "Title";
  if (normalisedLabel === "region") return "Region";
  if (normalisedLabel === "available") return "Available";
  if (normalisedLabel === "details") return "Details";

  return null;
}

/**
 * Derive the sortable value for a given record and sort key.
 *
 * Notes:
 * - Preserves the original logic and fallback values.
 * - Returns numbers for "Index" and "Available" (1/0), strings for textual fields,
 *   and `null` when an appropriate value is not available.
 *
 * @param {Object} record - The debug log record to extract a sortable value from.
 * @param {"Index"|"Session"|"Check"|"Outcome"|"ASIN"|"Series"|"Title"|"Region"|"Available"|"Details"|string} sortKey
 *   The canonical sort key (as produced by `normaliseHeaderToSortKey`).
 * @returns {string|number|null} The value to compare during sorting.
 */
function valueForSort(record, sortKey) {
  switch (sortKey) {
    case "Index":     return record.sessionIndex ?? null;
    case "Session":   return record.sessionId ?? "";
    case "Check":     return record.checkLabel || record.check || "";
    case "Outcome":   return record.outcome ?? "";
    case "ASIN":      return record.asin ?? "";
    case "Series":    return (typeof formatSeriesNames === "function"
                              ? formatSeriesNames(record)
                              : (record.seriesAsin || ""));
    case "Title":     return record.title ?? "";
    case "Region":    return record.region ?? "";
    case "Available": return record.isAvailable != null ? (record.isAvailable ? 1 : 0) : null;
    case "Details":   return record.details ?? "";
    default:          return null;
  }
}

/**
 * Compare two values using the specified sort direction.
 *
 * Behavior:
 * - Nullish/empty values ("", null, undefined) sort last.
 * - Numeric values are compared numerically; everything else as strings (locale & numeric aware).
 *
 * @param {string|number|null|undefined} firstValue
 * @param {string|number|null|undefined} secondValue
 * @param {"asc"|"desc"} direction
 * @returns {number} Negative if first < second, positive if first > second, 0 if equal.
 */
function cmpVals(firstValue, secondValue, direction) {
  const directionMultiplier = direction === "desc" ? -1 : 1;
  const isNullishValue = (value) => value === null || value === undefined || value === "";

  if (isNullishValue(firstValue) && isNullishValue(secondValue)) return 0;
  if (isNullishValue(firstValue)) return 1;   // nulls last
  if (isNullishValue(secondValue)) return -1; // nulls last

  if (typeof firstValue === "number" && typeof secondValue === "number")
    return directionMultiplier * (firstValue - secondValue);

  const firstString = String(firstValue);
  const secondString = String(secondValue);
  return directionMultiplier * firstString.localeCompare(
    secondString,
    undefined,
    { numeric: true, sensitivity: "base" }
  );
}

/**
 * Update the global debug sort state.
 * - Clicking the same key toggles asc/desc.
 * - Clicking a new key starts in asc order.
 *
 * @param {string} sortKey - Canonical key from `normaliseHeaderToSortKey`.
 * @returns {void}
 */
function setDebugSort(sortKey) {
  if (!sortKey) return;
  if (__dbgSort.key === sortKey)
    __dbgSort.dir = __dbgSort.dir === "asc" ? "desc" : "asc";
  else
    __dbgSort = { key: sortKey, dir: "asc" };
}

/**
 * Sort records according to the current global sort state.
 * Falls back to the stable original order (sessionId, then sessionIndex) to break ties.
 *
 * @param {Array<Object>} records
 * @returns {Array<Object>} A new, sorted array (does not mutate the input).
 */
function sortDebugRecordsWithState(records) {
  if (!__dbgSort.key) return sortDebugRecords(records);

  const sortKey = __dbgSort.key;
  const direction = __dbgSort.dir;

  return [...records].sort((firstRecord, secondRecord) => {
    const firstSortValue = valueForSort(firstRecord, sortKey);
    const secondSortValue = valueForSort(secondRecord, sortKey);

    const primaryComparison = cmpVals(firstSortValue, secondSortValue, direction);
    if (primaryComparison !== 0) return primaryComparison;

    // Stable fallback to original order (do not change)
    if (firstRecord.sessionId !== secondRecord.sessionId)
      return String(firstRecord.sessionId).localeCompare(String(secondRecord.sessionId));
    
    return (firstRecord.sessionIndex ?? 0) - (secondRecord.sessionIndex ?? 0);
  });
}

/**
 * Build (or rebuild) the Sessions / Outcomes / Check chips inside the Debug Modal.
 * Uses existing markup in `index.html` and only hydrates content (no container creation).
 *
 * Behavior:
 * - Populates the session <select> with distinct session IDs plus "(All)".
 * - Populates the outcome <select> with distinct outcomes plus "(Any)".
 * - Rebuilds the list of check “chips” (checkboxes), preserving previously checked items.
 *
 * Side effects:
 * - Mutates the DOM under `#dbgSession`, `#dbgOutcome`, and `#dbgCheckList`.
 *
 * @param {HTMLElement} debugModalElement - The root element for the debug modal.
 * @returns {void}
 */
function hydrateControls(debugModalElement) {
  const sessionSelectElement   = debugModalElement.querySelector("#dbgSession");
  const outcomeSelectElement   = debugModalElement.querySelector("#dbgOutcome");
  const groupBySelectElement   = debugModalElement.querySelector("#dbgGroupBy"); // intentionally unused (future use)
  const checkListContainerElement = debugModalElement.querySelector("#dbgCheckList");

  // Abort if any required control is missing
  if (!sessionSelectElement || !outcomeSelectElement || !groupBySelectElement || !checkListContainerElement) return;

  const debugLogs = getDebugLogs();

  // ----- Sessions -----
  const distinctSessionIds = Array.from(
    new Set(
      debugLogs.map((logRecord) => logRecord.sessionId).filter(Boolean)
    )
  );
  const sessionOptions = [
    { value: "", text: "(All)" },
    ...distinctSessionIds.map((sessionId) => ({ value: sessionId, text: sessionId })),
  ];
  setSelectOptions(sessionSelectElement, sessionOptions, true);

  // ----- Outcomes -----
  const distinctOutcomeValues = Array.from(
    new Set(
      debugLogs.map((logRecord) => logRecord.outcome).filter(Boolean)
    )
  ).sort();
  const outcomeOptions = [
    { value: "any", text: "(Any)" },
    ...distinctOutcomeValues.map((outcome) => ({ value: outcome, text: outcome })),
  ];
  setSelectOptions(outcomeSelectElement, outcomeOptions, true);

  // ----- Check chips -----
  // Preserve previous checked state
  const previouslyCheckedCheckIds = new Set(
    Array.from(
      checkListContainerElement.querySelectorAll('input[type="checkbox"]:checked')
    ).map((inputEl) => inputEl.value)
  );

  // Clear existing chips
  emptyDivContent(checkListContainerElement);

  // Build a map of checkId -> human label
  const checkIdToLabelMap = new Map();
  for (const logRecord of debugLogs) {
    const checkKey = logRecord?.check;
    if (!checkKey) continue;

    if (!checkIdToLabelMap.has(checkKey)) {
      const humanLabel = logRecord?.checkLabel || toHumanCheckLabelFromId(checkKey);
      checkIdToLabelMap.set(checkKey, humanLabel);
    }
  }

  // Recreate chips, preserving prior selection
  for (const [checkId, label] of checkIdToLabelMap.entries()) {
    const isChecked = previouslyCheckedCheckIds.has(checkId);
    addChipCheckbox(
      { id: `chk_${checkId}`, value: checkId, label, checked: isChecked },
      checkListContainerElement
    );
  }
}

/**
 * Read the current filter values from the Debug Modal controls.
 *
 * Returns a normalised object with selected session, outcome, grouping mode,
 * free-text query, and the set of selected check IDs.
 *
 * @param {HTMLElement} debugModalElement - Root element for the debug modal.
 * @returns {{ sessionId: string, outcome: string, groupBy: string, query: string, selectedChecks: Set<string> }}
 */
function readFilters(debugModalElement) {
  const sessionSelectElement    = debugModalElement.querySelector("#dbgSession");
  const outcomeSelectElement    = debugModalElement.querySelector("#dbgOutcome");
  const groupBySelectElement    = debugModalElement.querySelector("#dbgGroupBy");
  const searchInputElement      = debugModalElement.querySelector("#dbgSearch");
  const checkListContainerElement = debugModalElement.querySelector("#dbgCheckList");

  const selectedCheckIds = new Set(
    Array.from(
      checkListContainerElement.querySelectorAll('input[type="checkbox"]:checked')
    ).map((inputEl) => inputEl.value)
  );

  return {
    sessionId: sessionSelectElement?.value || "",
    outcome:  outcomeSelectElement?.value || "any",
    groupBy:  groupBySelectElement?.value || "none",
    query:    searchInputElement?.value?.trim() || "",
    selectedChecks: selectedCheckIds
  };
}

/**
 * Render the Debug Viewer results into #dbgContent using the table helpers.
 * - Applies current filters (session, checks, outcome, text query).
 * - Updates the count label (e.g., "12 of 84 entries").
 * - Renders either a single table or multiple grouped tables (with headers).
 *
 * Side effects:
 * - Mutates the DOM under `#dbgContent` in the provided modal element.
 * - Updates the count label returned by `getOrCreateCountLabelElement`.
 *
 * @param {HTMLElement} debugModalElement - The root element for the debug modal UI.
 * @returns {void}
 */
function renderResults(debugModalElement) {
  const contentContainerElement = debugModalElement.querySelector("#dbgContent");
  if (!contentContainerElement) return;

  const debugLogs = getDebugLogs();
  const currentFilters = readFilters(debugModalElement);

  // ----- Filtering -----
  const filteredLogs = debugLogs.filter((logEntry) => {
    if (currentFilters.sessionId && logEntry.sessionId !== currentFilters.sessionId) return false;
    if (currentFilters.selectedChecks.size && !currentFilters.selectedChecks.has(logEntry.check)) return false;
    if (currentFilters.outcome !== "any" && logEntry.outcome !== currentFilters.outcome) return false;

    if (currentFilters.query) {
      const searchableText = `${logEntry.asin ?? ""} ${logEntry.title ?? ""} ${formatSeriesNames(logEntry)}`.toLowerCase();
      if (!searchableText.includes(currentFilters.query.toLowerCase())) return false;
    }

    return true;
  });

  // ----- Update count label (e.g., "7 of 42 entries") -----
  const countLabelElement = getOrCreateCountLabelElement(debugModalElement);
  if (countLabelElement) {
    const filteredCount = filteredLogs.length;
    const totalCount = debugLogs.length;
    countLabelElement.textContent = `${filteredCount} of ${totalCount} ${filteredCount === 1 ? "entry" : "entries"}`;
  }

  // ----- Clear container -----
  emptyDivContent(contentContainerElement);

  // ----- Empty state -----
  if (filteredLogs.length === 0) {
    const emptyMessageElement = document.createElement("div");
    emptyMessageElement.textContent = "No debug entries match your filter.";
    contentContainerElement.appendChild(emptyMessageElement);
    return;
  }

  // ----- Grouping -----
  const groupByMode = currentFilters.groupBy || "none";
  if (groupByMode === "none") {
    // Single table
    renderTableForRecords(contentContainerElement, sortDebugRecordsWithState(filteredLogs));
    return;
  }

  // Build groups: Map<label, records[]>
  const recordsByGroup = new Map();
  for (const record of filteredLogs) {
    const groupLabel = getGroupLabelForRecord(record, groupByMode);
    if (!recordsByGroup.has(groupLabel)) recordsByGroup.set(groupLabel, []);
    recordsByGroup.get(groupLabel).push(record);
  }

  // Render each group as its own table (headers preserved), sorted by label
  for (const [groupLabel, groupRecords] of [...recordsByGroup.entries()].sort(
    (groupA, groupB) => String(groupA[0]).localeCompare(String(groupB[0]))
  )) {
    const groupTitleElement = document.createElement("h3");
    groupTitleElement.textContent = groupLabel;
    contentContainerElement.appendChild(groupTitleElement);

    renderTableForRecords(contentContainerElement, sortDebugRecordsWithState(groupRecords));
  }
}

/**
 * Render a single results table (with <thead> + <tbody>) for the provided records.
 * - Builds sortable headers (click to toggle asc/desc).
 * - Appends rows using elementFactory helpers.
 * - Details column renders a per-row quickFacts/details toggle element.
 *
 * Side effects:
 * - Appends a new table to `containerElement`.
 *
 * @param {HTMLElement} containerElement - The parent element to receive the table.
 * @param {Array<Object>} records - The list of debug records to render.
 * @returns {void}
 */
function renderTableForRecords(containerElement, records) {
  // Create table + header scaffolding
  const tableElement = addTableElement({ className: "dbg-table" }, containerElement);
  const theadElement = addTableSection("thead", tableElement);
  const headerRowElement = addTableRow(theadElement);

  // Header labels control visible order and sort-key mapping
  const headerLabels = [
    "Index", "Session", "Check", "Outcome",
    "ASIN", "Series", "Title", "Region",
    "Available", "Details"
  ];

  for (const headerLabel of headerLabels) {
    const headerCellElement = addHeaderCell(headerLabel, headerRowElement);

    // Enable click-to-sort for recognized headers
    const sortKey = normaliseHeaderToSortKey(headerLabel);
    if (sortKey) {
      headerCellElement.classList.add("dbg-sortable");
      headerCellElement.style.cursor = "pointer";
      headerCellElement.addEventListener("click", () => {
        setDebugSort(sortKey);
        renderResults(document.querySelector("#debugModal"));
      });

      // Visual indicator of current sort state
      if (__dbgSort.key === sortKey) {
        const arrowElement = document.createElement("span");
        arrowElement.className = "dbg-sort-arrow";
        arrowElement.textContent = __dbgSort.dir === "desc" ? " ▼" : " ▲";
        headerCellElement.appendChild(arrowElement);
      }
    }
  }

  // Body
  const tbodyElement = addTableSection("tbody", tableElement);

  for (const record of records) {
    const rowElement = addTableRow(tbodyElement);

    // Cells in the same order as headerLabels
    addCell(String(record.sessionIndex ?? ""), rowElement).setAttribute("data-label", headerLabels[0]);                         // Index
    addCell(record.sessionId ?? "", rowElement).setAttribute("data-label", headerLabels[1]);                                    // Session
    addCell(record.checkLabel || record.check || "", rowElement).setAttribute("data-label", headerLabels[2]);                   // Check
    addCell(record.outcome ?? "", rowElement).setAttribute("data-label", headerLabels[3]);                                      // Outcome
    addCell(record.asin ?? "", rowElement).setAttribute("data-label", headerLabels[4]);                                         // ASIN
    addCell(formatSeriesNames(record), rowElement).setAttribute("data-label", headerLabels[5]);                                 // Series
    addCell(record.title ?? "", rowElement).setAttribute("data-label", headerLabels[6]);                                        // Title
    addCell(record.region ?? "", rowElement).setAttribute("data-label", headerLabels[7]);                                       // Region
    addCell(record.isAvailable != null ? String(!!record.isAvailable) : "", rowElement).setAttribute("data-label", headerLabels[8]); // Available

    // Details cell with quickFacts/details toggle (kept as-is)
    (function renderDetailsCell() {
      // Add detail row
      const detailRowElement = addTableRow(tbodyElement);
      detailRowElement.hidden = true;
      const detailsCell = document.createElement("td");
      detailsCell.setAttribute("data-label", headerLabels[9]);
      const uniqueId = `${record.sessionId || "s"}_${record.sessionIndex ?? 0}`;
      const detailsObject = buildQuickFactsElement(record, uniqueId, detailRowElement);
      if (!detailsObject) 
        throw new Error("buildQuickFactsElement returned nothing");
      const { detailsWrapper: detailsElement, detailsPanel } = detailsObject;

      detailsCell.appendChild(detailsElement);
      rowElement.appendChild(detailsCell);

      // Add full width table row for details panel
      const spanDetailsTd = document.createElement("td");
      spanDetailsTd.colSpan = getColumnWidthValue();
      spanDetailsTd.appendChild(detailsPanel);
      detailRowElement.appendChild(spanDetailsTd);
    })();
  }
}

/**
 * Determines the preferred column width (in `ch` units) based on the current viewport width.
 * 
 * Breakpoints:
 * - > 100rem:     Column width = 10ch   (large desktops / wide screens)
 * - 75rem–100rem: Column width = 8ch    (medium desktops / laptops)
 * - ≤ 59.375rem:  Column width = 6ch    (tablets / smaller devices)
 * - Fallback:     Column width = 6ch
 * 
 * @returns {number} The numeric width in `ch` units (to be used with CSS, e.g. "10ch").
 */
function getColumnWidthValue() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize || "16"); // root font-size in px
  const windowRem = window.innerWidth / rem;

  if (windowRem > 100) return 10;
  if (windowRem >= 75) return 8;
  if (windowRem <= 59.375) return 6;
  
  // fallback for smaller screens
  return 6;
}

/**
 * Convert a machine check id (e.g., "filter:futureReleaseSkip") into a human label
 * (e.g., "Filter Future Release Skip").
 *
 * Rules:
 * - Replace any sequence of [: . _ -] with a single space.
 * - Uppercase the first character of each word.
 * - Coerces non-string input via String().
 *
 * @param {unknown} checkId - The machine-readable check identifier.
 * @returns {string} Human-readable label.
 */
function toHumanCheckLabelFromId(checkId) {
  return String(checkId)
    .replace(/[:._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

/**
 * Initialize (hydrate + render) the Debug Modal contents.
 * - Finds the modal element by selector.
 * - Hydrates filter controls (sessions / outcomes / checks).
 * - Renders the results table(s).
 *
 * Note: Event bindings (open/close, exports, etc.) are set up elsewhere (interactions.js).
 *
 * @param {{ modalSelector?: string }} [options]
 * @param {string} [options.modalSelector="#debugModal"] - CSS selector for the modal root element.
 * @returns {void}
 */
export function initDebugModal({ modalSelector = "#debugModal" } = {}) {
  const debugModalElement = document.querySelector(modalSelector);
  if (!debugModalElement) return;

  // Only hydrate controls; interactions are registered in interactions.js
  hydrateControls(debugModalElement);
  renderResults(debugModalElement);
}

/**
 * Refresh the Debug Modal UI to reflect any new logs or changed filters.
 * - Re-hydrates the controls (preserving checked state where applicable).
 * - Re-renders the results based on current filters.
 *
 * @param {{ modalSelector?: string }} [options]
 * @param {string} [options.modalSelector="#debugModal"] - CSS selector for the modal root element.
 * @returns {void}
 */
export function refreshDebugModal({ modalSelector = "#debugModal" } = {}) {
  const debugModalElement = document.querySelector(modalSelector);
  if (!debugModalElement) return;

  // Re-hydrate to reflect new sessions/outcomes/checks; preserve prior selections
  hydrateControls(debugModalElement);
  renderResults(debugModalElement);
}

/**
 * Join all series names from a record's `series` array into a comma-separated string.
 * Falls back to `name` or `title` if `seriesName` is not present on an item.
 *
 * @param {{ series?: Array<{ seriesName?: string, name?: string, title?: string }> } | null | undefined} record
 * @returns {string} Comma-separated series names (empty string if none).
 */
function formatSeriesNames(record) {
  if (!record || !Array.isArray(record.series)) return "";
  try {
    return record.series
      .map((series) => (series && (series.seriesName || series.name || series.title)) || "")
      .filter(Boolean)
      .join(", ");
  } catch {
    return "";
  }
}

/**
 * Create a collapsible “Details” element that reveals a pretty view of quickFacts/details.
 *
 * Behavior (unchanged):
 * - Renders a link-style toggle: "Show details ▶" / "Hide details ▼"
 * - Prefers `record.quickFacts`; falls back to `record.details`
 * - If the value is an object/array, pretty-prints JSON; otherwise shows plain text
 * - Adds ARIA attributes for accessibility and toggles on Enter/Space
 *
 * DOM structure & classes (unchanged and safe to theme):
 * - .dbg-details-wrapper
 *   - .dbg-details-toggle.dbg-details-toggle-linklike   (the clickable text)
 *   - .dbg-details-panel                                 (the collapsible container)
 *     - .dbg-details-json | .dbg-details-text | <em>(no details)</em>
 *
 * @param {{quickFacts?: any, details?: any}} record - Source record with optional quickFacts/details.
 * @param {string} uniqueId - Used to link the toggle to the panel via aria-controls.
 * @returns {HTMLDivElement} The wrapper element containing the toggle and collapsible panel.
 */
function buildQuickFactsElement(record, uniqueId, detailRowElement) {
  const detailsWrapper = document.createElement("div");
  detailsWrapper.className = "dbg-details-wrapper";

  // Toggle control (link-style text)
  const toggleLink = document.createElement("span");
  toggleLink.className = "dbg-details-toggle dbg-details-toggle-linklike";
  toggleLink.textContent = "Show details ▶";
  toggleLink.setAttribute("role", "button");
  toggleLink.tabIndex = 0;
  toggleLink.setAttribute("aria-expanded", "false");
  toggleLink.setAttribute("aria-controls", `dbgDetails_${uniqueId}`);
  detailsWrapper.appendChild(toggleLink);

  // Hidden panel
  const detailsPanel = document.createElement("div");
  detailsPanel.id = `dbgDetails_${uniqueId}`;
  detailsPanel.className = "dbg-details-panel";

  // Build content
  const detailsData = record && (record.quickFacts || record.details || null);
  let contentElement;

  if (detailsData && typeof detailsData === "object") {
    // Pretty JSON for now; easy to scan in debug
    const jsonElement = document.createElement("pre");
    jsonElement.className = "dbg-details-json";
    try {
      jsonElement.textContent = JSON.stringify(detailsData, null, 2);
    } catch {
      jsonElement.textContent = String(detailsData);
    }
    contentElement = jsonElement;
  } else if (detailsData != null) {
    const textContainer = document.createElement("div");
    textContainer.className = "dbg-details-text";
    textContainer.textContent = String(detailsData);
    contentElement = textContainer;
  } else {
    const emptyIndicator = document.createElement("em");
    emptyIndicator.textContent = "(no details)";
    contentElement = emptyIndicator;
  }

  detailsPanel.appendChild(contentElement);
  //detailsWrapper.appendChild(detailsPanel);

  // Toggle behavior
  toggleLink.addEventListener("click", () => {
    const isHidden= detailRowElement.hidden;
    detailRowElement.hidden = !isHidden;
    toggleLink.setAttribute("aria-expanded", String(isHidden));
    toggleLink.textContent = !isHidden ? "Show details ▶" : "Hide details ▼";
  });

  // Keyboard accessibility: toggle on Enter/Space
  toggleLink.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleLink.click();
    }
  });

  // eslint-disable-next-line object-shorthand
  return {detailsWrapper: detailsWrapper, detailsPanel: detailsPanel};
}

/**
 * Get the human-readable group label for a record, based on the active "group by" mode.
 *
 * Behavior (unchanged):
 * - "check"     → record.checkLabel || record.check || "(none)"
 * - "outcome"   → record.outcome ?? "(none)"
 * - "series"    → formatSeriesNames(record) || "(none)"
 * - "title"     → record.title ?? "(none)"
 * - "region"    → record.region ?? "(none)"
 * - "available" → "Available" | "Unavailable"
 * - "none"/default → "All results"
 *
 * @param {Object} record - The debug record being rendered.
 * @param {"check"|"outcome"|"series"|"title"|"region"|"available"|"none"|string} groupByValue
 * @returns {string} The label to display for the group header.
 */
function getGroupLabelForRecord(record, groupByValue) {
  switch (groupByValue) {
    case "check":     return record.checkLabel || record.check || "(none)";
    case "outcome":   return record.outcome ?? "(none)";
    case "series":    return formatSeriesNames(record) || "(none)";
    case "title":     return record.title ?? "(none)";
    case "region":    return record.region ?? "(none)";
    case "available": return record.isAvailable ? "Available" : "Unavailable";
    case "none":
    default:          return "All results";
  }
}

/**
 * Find the count label (#dbgCount) or create it inside the first controls row.
 *
 * Behavior (unchanged):
 * - If #dbgCount exists, return it.
 * - Otherwise, create a <span id="dbgCount" class="dbg-counts"> with default text "0 entries".
 * - Insert it before the first download button (#dbgDownloadJson or #dbgDownloadCsv) if present,
 *   otherwise append to the end of the first .dbg-row.
 *
 * @param {HTMLElement} debugModalElement - Root element for the debug modal.
 * @returns {HTMLElement|null} The count label element or null if controls are missing.
 */
function getOrCreateCountLabelElement(debugModalElement) {
  const existingCountLabelElement = debugModalElement.querySelector("#dbgCount");
  if (existingCountLabelElement) return existingCountLabelElement;

  const controlsSectionElement = debugModalElement.querySelector(".dbg-modal__controls");
  const firstControlsRowElement = controlsSectionElement?.querySelector(".dbg-row");
  if (!firstControlsRowElement) return null;

  // Create the count label at the end, then move it before the first download button if present
  const countLabelElement = addTextElement("0 entries", "span", firstControlsRowElement);
  countLabelElement.id = "dbgCount";
  countLabelElement.classList.add("dbg-counts");

  const firstDownloadButtonElement =
    firstControlsRowElement.querySelector("#dbgDownloadJson") ||
    firstControlsRowElement.querySelector("#dbgDownloadCsv");

  if (firstDownloadButtonElement) 
    firstControlsRowElement.insertBefore(countLabelElement, firstDownloadButtonElement);

  return countLabelElement;
}

/**
 * Stable sort for records: sessionId, then sessionIndex.
 * Ensures consistent rendering order within and across groups.
 *
 * @param {Array<{sessionId: string, sessionIndex?: number}>} records
 * @returns {Array<Object>} New array with the same elements, sorted stably.
 */
function sortDebugRecords(records) {
  return [...records].sort((firstRecord, secondRecord) => {
    if (firstRecord.sessionId !== secondRecord.sessionId)
      return String(firstRecord.sessionId).localeCompare(String(secondRecord.sessionId));
    
    return (firstRecord.sessionIndex ?? 0) - (secondRecord.sessionIndex ?? 0);
  });
}

/**
 * Filter the provided logs using the same rules as the table renderer.
 * Kept separate so both rendering and exports stay in sync.
 *
 * @param {Array<Object>} allLogs - Full list of debug log records.
 * @param {{ sessionId:string, outcome:string, groupBy:string, query:string, selectedChecks:Set<string> }} filters
 *   Current filter state (read from the Debug Modal controls).
 * @returns {Array<Object>} Filtered subset of logs.
 */
function filterLogs(allLogs, filters) {
  return allLogs.filter((logEntry) => {
    if (filters.sessionId && logEntry.sessionId !== filters.sessionId) return false;
    if (filters.selectedChecks.size && !filters.selectedChecks.has(logEntry.check)) return false;
    if (filters.outcome !== "any" && logEntry.outcome !== filters.outcome) return false;

    if (filters.query) {
      const searchableText =
        `${logEntry.asin ?? ""} ${logEntry.title ?? ""} ${formatSeriesNames(logEntry)}`.toLowerCase();
      if (!searchableText.includes(filters.query.toLowerCase())) return false;
    }
    return true;
  });
}

/**
 * Return the CURRENTLY filtered logs based on the UI controls in the modal.
 * Used by interactions.js for exporting. Safe to call anytime.
 *
 * @param {{ modalSelector?: string }} [options]
 * @param {string} [options.modalSelector="#debugModal"] - CSS selector for the modal root element.
 * @returns {Array<Object>} Filtered logs according to the current UI state.
 */
export function getFilteredDebugLogs({ modalSelector = "#debugModal" } = {}) {
  const debugModalElement = document.querySelector(modalSelector);
  if (!debugModalElement) return [];

  const allLogs = getDebugLogs();
  const currentFilters = readFilters(debugModalElement);

  return filterLogs(allLogs, currentFilters);
}