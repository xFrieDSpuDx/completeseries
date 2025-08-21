// scripts/debug.js (refactored quickFacts schema)
import { emptyDivContent } from "./elementFactory.js";
import { hideDebugButtons } from "./uiFeedback.js";
// Opt-in debugging utilities kept separate from core filtering logic.
// All functions are silent (no console output). They append entries to debugStore.logs.

/** Shared in-memory store of debug records. */
export const debugStore = { logs: [] };

/**
 * Generate a new debug session identifier.
 * Format: "dbg_YYYYMMDD_<rand4>"
 *
 * @returns {string} The generated session id.
 */
function generateSessionId() {
  const datePart = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 8); // YYYYMMDD
  const randomPart = Math.random().toString(36).slice(2, 6);
  return `dbg_${datePart}_${randomPart}`;
}

/**
 * Ensure there is an active session id. If none, one is created automatically.
 *
 * @returns {string} The current session id.
 */
export function getCurrentDebugSessionId() {
  if (!debugStore.currentSessionId) startDebugSession(); // auto-start with no label

  return debugStore.currentSessionId;
}

/**
 * Start a new debug session. Resets the per-session sequence counter.
 * Optionally include a label to help identify the run.
 *
 * @param {{ label?: string }} [options]
 * @returns {string} The newly created session id.
 */
export function startDebugSession(options = {}) {
  const sessionLabel = options && options.label ? String(options.label) : undefined;
  const newSessionId = generateSessionId();

  debugStore.currentSessionId = newSessionId;
  debugStore.sessionSequence = 0;

  if (!Array.isArray(debugStore.sessions)) debugStore.sessions = [];

  debugStore.sessions.push({
    sessionId: newSessionId,
    startedAtIso: new Date().toISOString(),
    label: sessionLabel || null,
  });

  return newSessionId;
}

/**
 * Append a record to the store, automatically tagging it with the current session id
 * and a monotonically increasing sequence number within the session.
 *
 * @param {Record<string, any>} record - The record payload to store.
 * @returns {void}
 */
function pushDebugRecord(record) {
  const sessionId = getCurrentDebugSessionId();

  if (typeof debugStore.sessionSequence !== "number") debugStore.sessionSequence = 0;

  const recordWithSession = {
    sessionId,
    sessionIndex: ++debugStore.sessionSequence,
    ...record,
  };

  debugStore.logs.push(recordWithSession);
}

/** Accessor helpers. */

/**
 * Get a shallow copy of the debug logs.
 * @returns {Array<Object>} The stored debug records (copied).
 */
export function getDebugLogs() {
  return debugStore.logs.slice();
}

/**
 * Clear all debug logs (preserves the logs array reference).
 * @returns {void}
 */
export function clearDebugLogs() {
  debugStore.logs.length = 0;
}

/**
 * Reads the "Debug checks" checkbox in the UI.
 * Debug actions are performed only when this returns true.
 *
 * @returns {boolean} Whether debug is enabled.
 */
export function isDebugEnabled() {
  const debugCheckbox = document.getElementById("enableDebugChecks").checked;
  return Boolean(debugCheckbox);
}

/**
 * Build a simple summary of the series membership for a book.
 * Returns items like: [{ seriesName: "Name", seriesPosition: "3" }, ...]
 *
 * @param {{ series?: Array<{ name?: string, position?: string|number }> }} book
 * @returns {Array<{ seriesName: string, seriesPosition: string }>} */
export function summariseBookSeries(book) {
  const seriesList = Array.isArray(book?.series) ? book.series : [];
  return seriesList.map((seriesEntry) => {
    const seriesName = seriesEntry?.name != null ? String(seriesEntry.name) : "N/A";
    const hasPosition = seriesEntry?.position !== undefined && seriesEntry?.position !== null;
    const seriesPosition = hasPosition ? String(seriesEntry.position) : "N/A";
    return { seriesName, seriesPosition };
  });
}

/* ---------------------------
   quickFacts standard helpers
   --------------------------- */

/**
 * Build the common, rule-agnostic context used by every quickFacts payload.
 * Uses null for missing values (no "N/A" strings inside quickFacts).
 */
function baseQuickFacts(book, seriesContext) {
  const seriesArray = Array.isArray(book?.series) ? book.series : [];
  const seriesNames = seriesArray.map((series) => series?.name).filter(Boolean);
  const positions = seriesArray
    .map((series) => (series?.position != null ? String(series.position) : null))
    .filter(Boolean);
  const hasDecimalPositions = positions.some((seriesPosition) => seriesPosition.includes("."));

  return {
    schemaVersion: 1,
    common: {
      book: {
        asin: book?.asin ?? null,
        title: book?.title ?? null,
        region: book?.region ?? null,
        isAvailable: book?.isAvailable ?? null,
        isListenable: book?.isListenable ?? null,
        format: book?.format ?? null,
        releaseDateISO:
          book?.releaseDate instanceof Date
            ? book.releaseDate.toISOString().slice(0, 10)
            : typeof book?.releaseDate === "string"
              ? book.releaseDate.slice(0, 10)
              : null,
        isAbridged: book?.isAbridged ?? null,
      },
      series: {
        seriesAsin: seriesContext?.seriesAsin ?? null,
        names: seriesNames,
        positions,
        positionsCount: positions.length,
      },
      flags: {
        hasAsin: !!book?.asin,
        hasSeriesArray: seriesArray.length > 0,
        hasPositions: positions.length > 0,
        hasDecimalPositions,
      },
    },
  };
}

/**
 * Assemble the final quickFacts object for a rule.
 */
function makeQuickFacts({ ruleId, ruleLabel, base, inputs = {}, computed = {}, decision }) {
  return {
    ...base,
    rule: { id: ruleId, label: ruleLabel },
    inputs,
    computed,
    decision, // { outcome, reason, reasonCodes? }
  };
}

/* ---------------------------------------------------------
   Individual loggers for each filtering gate
   --------------------------------------------------------- */

/**
 * Viability failed at the first gate.
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string } }} params
 * @returns {void}
 */
export function debugLogBookViability({ book, seriesContext }) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "Decide whether the book has the minimum required metadata/flags to proceed. If not, skip here.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "book-viability",
    ruleLabel: "Initial viability",
    base,
    inputs: {},
    computed: {
      missingRequired: !(base.common.flags.hasAsin && base.common.flags.hasSeriesArray),
    },
    decision: {
      outcome: "failed",
      reason: descriptionText,
      reasonCodes: ["MISSING_REQUIRED_METADATA"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "book-viability",
    checkLabel: "Initial viability",
    description: descriptionText,
    outcome: "failed",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Already in library (ASIN found in current library set).
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, libraryASINs?: Set<string> }} params
 * @returns {void}
 */
export function debugLogBookAlreadyInLibrary({ book, seriesContext, libraryASINs }) {
  if (!isDebugEnabled()) return;

  const asin = book?.asin ?? "N/A";
  const descriptionText =
    "Do not include this book in the 'missing' list because its ASIN is already present in the library.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "already-in-library",
    ruleLabel: "Already in library",
    base,
    inputs: {
      librarySize: libraryASINs instanceof Set ? libraryASINs.size : undefined,
    },
    computed: {
      asinFoundInLibrary: libraryASINs instanceof Set ? libraryASINs.has(asin) : true,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["ASIN_PRESENT_IN_LIBRARY"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "already-in-library",
    checkLabel: "Already in library",
    description: descriptionText,
    outcome: "skipped",
    asin,
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Only include unabridged: skip when enabled and helper reports unabridged.
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, onlyUnabridgedEnabled?: boolean, helperReportedUnabridged?: boolean }} params
 * @returns {void}
 */
export function debugLogOnlyUnabridgedGate({
  book,
  seriesContext,
  onlyUnabridgedEnabled,
  helperReportedUnabridged,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "The 'only unabridged' option was enabled and this book matched the helper check, so it was skipped.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "only-unabridged",
    ruleLabel: "Only include unabridged",
    base,
    inputs: { onlyUnabridgedEnabled: !!onlyUnabridgedEnabled },
    computed: {
      helperReportedUnabridged: !!helperReportedUnabridged,
      bookFlag_isAbridged: book?.isAbridged ?? undefined,
      format: book?.format ?? undefined,
      releaseDateISO: base.common.book.releaseDateISO,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["ONLY_UNABRIDGED_ENABLED"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "only-unabridged",
    checkLabel: "Only include unabridged",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore items without a series position.
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, optionEnabled?: boolean, hasNoPosition?: boolean, positionsList?: Array<any> }} params
 * @returns {void}
 */
export function debugLogIgnoreNoPosition({
  book,
  seriesContext,
  optionEnabled,
  hasNoPosition,
  positionsList,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "This book was skipped because the option to ignore items without a series position was enabled, and the book does not provide a series position.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-no-position",
    ruleLabel: "Ignore books with no series position",
    base,
    inputs: { optionEnabled: !!optionEnabled },
    computed: {
      hasNoPosition: !!hasNoPosition,
      positionsList: Array.isArray(positionsList) ? positionsList : [],
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["NO_SERIES_POSITION"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-no-position",
    checkLabel: "Ignore books with no series position",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore multi-book audiobooks (multiple series positions).
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, optionEnabled?: boolean, multiplePositions?: boolean, positionsList?: Array<any> }} params
 * @returns {void}
 */
export function debugLogIgnoreMultiplePositions({
  book,
  seriesContext,
  optionEnabled,
  multiplePositions,
  positionsList,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "This book was skipped because the option to ignore multi-book audiobooks is enabled and the item reports multiple series positions.";

  const base = baseQuickFacts(book, seriesContext);
  const list = Array.isArray(positionsList) ? positionsList : [];

  const quickFacts = makeQuickFacts({
    ruleId: "ignore-multiple-positions",
    ruleLabel: "Ignore multi-book audiobooks",
    base,
    inputs: { optionEnabled: !!optionEnabled },
    computed: {
      multiplePositions: !!multiplePositions,
      positionsList: list,
      positionsCount: list.length,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["MULTIPLE_SERIES_POSITIONS"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-multiple-positions",
    checkLabel: "Ignore multi-book audiobooks",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore decimal sub-positions (e.g., position 3.5).
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, optionEnabled?: boolean, decimalPositions?: Array<any>, positionsList?: Array<any> }} params
 * @returns {void}
 */
export function debugLogIgnoreDecimalPositions({
  book,
  seriesContext,
  optionEnabled,
  decimalPositions,
  positionsList,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "This book was skipped because the option to ignore sub positions is enabled and the series positions include decimal values (e.g. 3.5).";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-decimal-positions",
    ruleLabel: "Ignore books with a sub position (e.g. #3.5)",
    base,
    inputs: { optionEnabled: !!optionEnabled },
    computed: {
      positionsList: Array.isArray(positionsList) ? positionsList : [],
      decimalPositions: Array.isArray(decimalPositions) ? decimalPositions : [],
      hasDecimalPositions: base.common.flags.hasDecimalPositions,
      positionsCount: base.common.series.positionsCount,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["DECIMAL_SERIES_POSITION"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-decimal-positions",
    checkLabel: "Ignore books with a sub position (e.g. #3.5)",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore books that have not been released yet.
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, optionEnabled?: boolean, releaseDate?: Date|null, isFuture?: boolean }} params
 * @returns {void}
 */
export function debugLogIgnoreFutureRelease({
  book,
  seriesContext,
  optionEnabled,
  releaseDate, // Date
  isFuture,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "This book was skipped because the option to ignore unreleased items is enabled and the release date is in the future.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-future-date",
    ruleLabel: "Ignore books that have not been released yet",
    base,
    inputs: {
      optionEnabled: !!optionEnabled,
      releaseDateISO: releaseDate instanceof Date ? releaseDate.toISOString().slice(0, 10) : null,
      todayISO: new Date().toISOString().slice(0, 10),
    },
    computed: { treatedAsFuture: !!isFuture },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["UNRELEASED_FUTURE_DATE"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-future-date",
    checkLabel: "Ignore books that have not been released yet",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore books that have already been released.
 *
 * @param {{ book: any, seriesContext?: { seriesAsin?: string }, optionEnabled?: boolean, releaseDate?: Date|null, isPast?: boolean }} params
 * @returns {void}
 */
export function debugLogIgnorePastRelease({
  book,
  seriesContext,
  optionEnabled,
  releaseDate, // Date
  isPast,
}) {
  if (!isDebugEnabled()) return;

  const descriptionText =
    "This book was skipped because the option to ignore already released items is enabled and the release date is not in the future.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-past-date",
    ruleLabel: "Ignore books that have already been released",
    base,
    inputs: {
      optionEnabled: !!optionEnabled,
      releaseDateISO: releaseDate instanceof Date ? releaseDate.toISOString().slice(0, 10) : null,
      todayISO: new Date().toISOString().slice(0, 10),
    },
    computed: { treatedAsPast: !!isPast },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["ALREADY_RELEASED"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-past-date",
    checkLabel: "Ignore books that have already been released",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore title/subtitle matches against existing library items.
 *
 * @param {{
 *  book: any,
 *  seriesContext?: { seriesAsin?: string },
 *  optionEnabled?: boolean,
 *  title?: string,
 *  subtitle?: string,
 *  bookSeriesArray?: Array<{ name?: string }>,
 *  existingContent?: Array<{ asin?: string, title?: string, subtitle?: string, series?: Array<{ name?: string }> }>,
 *  helperMatched?: boolean
 * }} params
 * @returns {void}
 */
export function debugLogIgnoreTitleSubtitleExisting({
  book,
  seriesContext,
  optionEnabled,
  title,
  subtitle,
  bookSeriesArray,
  existingContent,
  helperMatched,
}) {
  if (!isDebugEnabled()) return;

  const normalise = (str) =>
    String(str ?? "")
      .trim()
      .toLowerCase();

  // Series names linked to the current book
  const bookSeriesNames = new Set(
    (Array.isArray(bookSeriesArray) ? bookSeriesArray : [])
      .map((entry) => entry?.name)
      .filter(Boolean)
      .map(normalise)
  );

  // Sample up to 5 matches in existingContent with same title, subtitle, and shared series.
  const sampleMatches = [];
  if (Array.isArray(existingContent)) {
    for (const existingItem of existingContent) {
      const sameTitle = normalise(existingItem?.title) === normalise(title);
      const sameSubtitle =
        normalise(existingItem?.subtitle ?? "No Subtitle") === normalise(subtitle ?? "No Subtitle");

      const existingSeriesNames = new Set(
        (Array.isArray(existingItem?.series) ? existingItem.series : [])
          .map((entry) => entry?.name)
          .filter(Boolean)
          .map(normalise)
      );
      const sharesSeries = [...bookSeriesNames].some((name) => existingSeriesNames.has(name));

      if (sameTitle && sameSubtitle && sharesSeries) {
        sampleMatches.push({
          asin: existingItem?.asin ?? "N/A",
          title: existingItem?.title ?? "N/A",
          subtitle: existingItem?.subtitle ?? "No Subtitle",
          series: summariseBookSeries(existingItem),
        });
        if (sampleMatches.length >= 5) break;
      }
    }
  }

  const descriptionText =
    "This book was skipped because the option is enabled and it matched the title and subtitle of an item already present.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-title-subtitle-existing",
    ruleLabel: "Ignore books with title and subtitle matches",
    base,
    inputs: {
      optionEnabled: !!optionEnabled,
      providedTitle: title ?? "N/A",
      providedSubtitle: subtitle ?? "No Subtitle",
    },
    computed: {
      helperMatched: !!helperMatched,
      sampleMatches,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["TITLE_SUBTITLE_MATCH_EXISTS"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-title-subtitle-existing",
    checkLabel: "Ignore books with title and subtitle matches",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore same series position when an existing library item already has it.
 *
 * @param {{
 *  book: any,
 *  seriesContext?: { seriesAsin?: string },
 *  optionEnabled?: boolean,
 *  bookSeriesArray?: Array<{ name?: string, position?: string|number }>,
 *  existingContent?: Array<{ asin?: string, title?: string, series?: Array<{ name?: string, position?: string|number }> }>,
 *  helperDetectedOverlap?: boolean
 * }} params
 * @returns {void}
 */
export function debugLogIgnoreSameSeriesPositionExisting({
  book,
  seriesContext,
  optionEnabled,
  bookSeriesArray,
  existingContent,
  helperDetectedOverlap,
}) {
  if (!isDebugEnabled()) return;

  const normaliseSeriesArray = (inputArray) => {
    const list = Array.isArray(inputArray) ? inputArray : [];
    return list.map((seriesEntry) => {
      const nameOriginal = seriesEntry?.name ?? "N/A";
      const nameLower = String(nameOriginal).toLowerCase();
      const positionStr = seriesEntry?.position != null ? String(seriesEntry.position) : "N/A";
      return { nameOriginal, nameLower, positionStr };
    });
  };

  const bookSeriesnormalised = normaliseSeriesArray(bookSeriesArray);

  // Build lookup for the current book: seriesNameLower -> Set(positionStr)
  const bookIndex = new Map();
  for (const seriesInfo of bookSeriesnormalised) {
    if (!bookIndex.has(seriesInfo.nameLower)) bookIndex.set(seriesInfo.nameLower, new Set());

    bookIndex.get(seriesInfo.nameLower).add(seriesInfo.positionStr);
  }

  // Identify overlaps and collect sample matches from existingContent
  const overlappingPairsMap = new Map(); // key: `${nameLower}::${pos}` -> { seriesName, position }
  const sampleMatches = [];

  if (Array.isArray(existingContent)) {
    for (const existingItem of existingContent) {
      const existingSeriesnormalised = normaliseSeriesArray(existingItem?.series);

      const matchedForItem = existingSeriesnormalised.filter((existingSeriesInfo) => {
        const positionsForName = bookIndex.get(existingSeriesInfo.nameLower);
        return positionsForName ? positionsForName.has(existingSeriesInfo.positionStr) : false;
      });

      if (matchedForItem.length > 0) {
        for (const matched of matchedForItem) {
          const key = `${matched.nameLower}::${matched.positionStr}`;
          if (!overlappingPairsMap.has(key)) {
            overlappingPairsMap.set(key, {
              seriesName: matched.nameOriginal,
              position: matched.positionStr,
            });
          }
        }

        if (sampleMatches.length < 5) {
          sampleMatches.push({
            asin: existingItem?.asin ?? "N/A",
            title: existingItem?.title ?? "N/A",
            series: summariseBookSeries(existingItem),
            matchedPairs: matchedForItem.map((info) => ({
              seriesName: info.nameOriginal,
              position: info.positionStr,
            })),
          });
        }
      }
    }
  }

  const positionsList = bookSeriesnormalised.map((info) => info.positionStr);
  const overlappingPairs = Array.from(overlappingPairsMap.values());

  const descriptionText =
    "This book was skipped because at least one existing library item shares the same series name and the same position.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-same-series-position-existing",
    ruleLabel: "Ignore books with the same series position",
    base,
    inputs: { optionEnabled: !!optionEnabled },
    computed: {
      helperDetectedOverlap: !!helperDetectedOverlap,
      positionsList,
      overlappingPositions: overlappingPairs,
      sampleMatches,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["SERIES_POSITION_CONFLICT_EXISTS"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-same-series-position-existing",
    checkLabel: "Ignore books with the same series position",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore title/subtitle when the current missing list already contains a match.
 *
 * @param {{
 *  book: any,
 *  seriesContext?: { seriesAsin?: string },
 *  optionEnabled?: boolean,
 *  title?: string,
 *  subtitle?: string,
 *  bookSeriesArray?: Array<{ name?: string }>,
 *  missingBooks?: Array<{ asin?: string, title?: string, subtitle?: string, series?: Array<{ name?: string }> }>,
 *  helperMatched?: boolean
 * }} params
 * @returns {void}
 */
export function debugLogIgnoreTitleSubtitleMissing({
  book,
  seriesContext,
  optionEnabled,
  title,
  subtitle,
  bookSeriesArray,
  missingBooks,
  helperMatched,
}) {
  if (!isDebugEnabled()) return;

  const normalise = (str) =>
    String(str ?? "")
      .trim()
      .toLowerCase();

  const currentSeriesNames = new Set(
    (Array.isArray(bookSeriesArray) ? bookSeriesArray : [])
      .map((entry) => entry?.name)
      .filter(Boolean)
      .map(normalise)
  );

  const sampleMatches = [];
  if (Array.isArray(missingBooks)) {
    for (const missingItem of missingBooks) {
      const sameTitle = normalise(missingItem?.title) === normalise(title);
      const sameSubtitle =
        normalise(missingItem?.subtitle ?? "No Subtitle") === normalise(subtitle ?? "No Subtitle");

      const missingSeriesNames = new Set(
        (Array.isArray(missingItem?.series) ? missingItem.series : [])
          .map((entry) => entry?.name)
          .filter(Boolean)
          .map(normalise)
      );
      const sharesSeries = [...currentSeriesNames].some((name) => missingSeriesNames.has(name));

      if (sameTitle && sameSubtitle && sharesSeries) {
        sampleMatches.push({
          asin: missingItem?.asin ?? "N/A",
          title: missingItem?.title ?? "N/A",
          subtitle: missingItem?.subtitle ?? "No Subtitle",
          series: summariseBookSeries(missingItem),
        });
        if (sampleMatches.length >= 5) break;
      }
    }
  }

  const descriptionText =
    "Skipped because another item with the same title and subtitle is already present in the current missing list.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-title-subtitle-missing",
    ruleLabel: "Only show first found version of Title and Subtitle",
    base,
    inputs: {
      optionEnabled: !!optionEnabled,
      providedTitle: title ?? "N/A",
      providedSubtitle: subtitle ?? "No Subtitle",
    },
    computed: {
      helperMatched: !!helperMatched,
      sampleMatches,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["TITLE_SUBTITLE_ALREADY_IN_MISSING"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-title-subtitle-missing",
    checkLabel: "Only show first found version of Title and Subtitle",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Ignore when the current missing list already has the same series position.
 *
 * @param {{
 *  book: any,
 *  seriesContext?: { seriesAsin?: string },
 *  optionEnabled?: boolean,
 *  bookSeriesArray?: Array<{ name?: string, position?: string|number }>,
 *  missingBooks?: Array<{ asin?: string, title?: string, series?: Array<{ name?: string, position?: string|number }> }>,
 *  helperDetectedOverlap?: boolean
 * }} params
 * @returns {void}
 */
export function debugLogIgnoreSameSeriesPositionMissing({
  book,
  seriesContext,
  optionEnabled,
  bookSeriesArray,
  missingBooks,
  helperDetectedOverlap,
}) {
  if (!isDebugEnabled()) return;

  const normaliseSeriesArray = (inputArray) => {
    const list = Array.isArray(inputArray) ? inputArray : [];
    return list.map((seriesEntry) => {
      const nameOriginal = seriesEntry?.name ?? "N/A";
      const nameLower = String(nameOriginal).toLowerCase();
      const positionStr = seriesEntry?.position != null ? String(seriesEntry.position) : "N/A";
      return { nameOriginal, nameLower, positionStr };
    });
  };

  const bookSeriesnormalised = normaliseSeriesArray(bookSeriesArray);

  // Build lookup for the current book: seriesNameLower -> Set(positionStr)
  const bookIndex = new Map();
  for (const seriesInfo of bookSeriesnormalised) {
    if (!bookIndex.has(seriesInfo.nameLower)) bookIndex.set(seriesInfo.nameLower, new Set());

    bookIndex.get(seriesInfo.nameLower).add(seriesInfo.positionStr);
  }

  // Identify overlaps and collect samples from current missing list
  const overlappingPairsMap = new Map(); // key: `${nameLower}::${pos}` -> { seriesName, position }
  const sampleMatches = [];

  if (Array.isArray(missingBooks)) {
    for (const missingItem of missingBooks) {
      const missingSeriesnormalised = normaliseSeriesArray(missingItem?.series);

      const matchedForItem = missingSeriesnormalised.filter((missingSeriesInfo) => {
        const positionsForName = bookIndex.get(missingSeriesInfo.nameLower);
        return positionsForName ? positionsForName.has(missingSeriesInfo.positionStr) : false;
      });

      if (matchedForItem.length > 0) {
        for (const matched of matchedForItem) {
          const key = `${matched.nameLower}::${matched.positionStr}`;
          if (!overlappingPairsMap.has(key)) {
            overlappingPairsMap.set(key, {
              seriesName: matched.nameOriginal,
              position: matched.positionStr,
            });
          }
        }

        if (sampleMatches.length < 5) {
          sampleMatches.push({
            asin: missingItem?.asin ?? "N/A",
            title: missingItem?.title ?? "N/A",
            series: summariseBookSeries(missingItem),
            matchedPairs: matchedForItem.map((info) => ({
              seriesName: info.nameOriginal,
              position: info.positionStr,
            })),
          });
        }
      }
    }
  }

  const positionsList = bookSeriesnormalised.map((info) => info.positionStr);
  const overlappingPairs = Array.from(overlappingPairsMap.values());

  const descriptionText =
    "Skipped because another item in the current missing list already has the same series name and position.";

  const base = baseQuickFacts(book, seriesContext);
  const quickFacts = makeQuickFacts({
    ruleId: "ignore-same-series-position-missing",
    ruleLabel: "Only show first found series position",
    base,
    inputs: { optionEnabled: !!optionEnabled },
    computed: {
      helperDetectedOverlap: !!helperDetectedOverlap,
      positionsList,
      overlappingPositions: overlappingPairs,
      sampleMatches,
    },
    decision: {
      outcome: "skipped",
      reason: descriptionText,
      reasonCodes: ["SERIES_POSITION_ALREADY_IN_MISSING"],
    },
  });

  const record = {
    timestampIso: new Date().toISOString(),
    check: "ignore-same-series-position-missing",
    checkLabel: "Only show first found series position",
    description: descriptionText,
    outcome: "skipped",
    asin: book?.asin ?? "N/A",
    title: book?.title ?? "N/A",
    seriesAsin: seriesContext?.seriesAsin ?? "N/A",
    region: book?.region ?? undefined,
    isAvailable: book?.isAvailable ?? null,
    series: summariseBookSeries(book),
    quickFacts,
  };

  pushDebugRecord(record);
}

/**
 * Clear debug logs and clear the debug modal results content.
 * - Preserves the logs array reference (length = 0).
 * - Clears #dbgContent and hides debug UI buttons.
 *
 * @returns {void}
 */
export function clearDebugLogsAndModal() {
  // 1) Clear in-memory logs
  debugStore.logs.length = 0; // keeps the same array reference

  // 2) Clear modal content
  const debugModalContent = document.getElementById("dbgContent");
  if (debugModalContent) {
    emptyDivContent(debugModalContent);
    hideDebugButtons();
  }
}
