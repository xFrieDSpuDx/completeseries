// ===============================
// localStorage.js — IndexedDB storage + in-memory working cache + run lifecycle
// ===============================
//
// Exports (function names unchanged):
//   loadMetadataFromLocalStorage(storeIdentifier): any[]
//   storeMetadataToLocalStorage(metadata, storeIdentifier): Promise<void>
//   storeUpdateFullValueForLocalStorage(fullValue, storeIdentifier): Promise<void>
//   clearLocalStorageByIdentifier(storeIdentifier): Promise<void>
//   clearLocalStorage(): Promise<void>
//   exportStorageToJSON(): void
//   importLocalStorage(file: File): Promise<void>
//   ensureWorkingMemoryReady({ forceReload = false } = {}): Promise<void>
//   beginRun({ fresh = "auto" } = {}): Promise<void>
//   endRun({ persist = true, clearMemory = false, clearHeavy = false, clearKeys = [] } = {}): Promise<void>
//   flushToDB(): Promise<string[]>
//   isRunActive(): boolean
//   hasUnsavedChanges(): boolean
//   bindStorageUploadUI({ inputId?, boxId?, placeholderId? } = {}): void
//
// Notes:
//   • Working memory holds arrays for fast, synchronous reads.
//   • Database values are stored as JSON strings (e.g., "[]").
//   • Export/Import only handle the three required keys.
// ===============================

const REQUIRED_KEYS = Object.freeze([
  "existingBookMetadata",
  "existingFirstBookASINs",
  "hiddenItems",
]);

const HEAVY_KEYS = Object.freeze(["existingBookMetadata", "existingFirstBookASINs"]);

const DB_NAME = "AudibleSeriesMetadataDB";
const DB_VERSION = 1;
const STORE_NAME = "kv";

/** In-memory cache: { [key: string]: any[] } */
const workingCache = Object.create(null);
for (const storageKey of REQUIRED_KEYS) workingCache[storageKey] = [];

/** Run and cache state. */
let runIsActive = false;
const modifiedKeys = new Set(); // identifiers modified during the current run
let cacheSnapshotIsFresh = false; // true when workingCache mirrors DB

let cachedDatabase = null;
let databaseOpenPromise = null;

/**
 * Report whether a run is currently active.
 *
 * @returns {boolean} True when beginRun() has been called and endRun() has not yet finished.
 */
export function isRunActive() {
  return runIsActive;
}

/**
 * Report whether there are pending, unflushed modifications in working memory.
 *
 * @returns {boolean} True when one or more keys have been modified since the last flushToDB()/endRun().
 */
export function hasUnsavedChanges() {
  return modifiedKeys.size > 0;
}

/**
 * Open (or reuse) the IndexedDB database for this module.
 *
 * Behavior:
 * - Creates the object store on first run or version upgrade.
 * - Reuses a cached IDBDatabase instance between calls.
 * - Listens for version changes and closes the cached connection to allow upgrades.
 *
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  if (cachedDatabase) return Promise.resolve(cachedDatabase);
  if (databaseOpenPromise) return databaseOpenPromise;

  databaseOpenPromise = new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    // If another tab holds an older version open, the upgrade can be blocked.
    // Keep waiting; caller’s promise resolves once unblocked or fails on error.
    openRequest.onblocked = () => {
      /* no-op: waiting for other contexts to close */
    };

    openRequest.onerror = () => {
      databaseOpenPromise = null;
      reject(openRequest.error);
    };

    openRequest.onsuccess = () => {
      const database = openRequest.result;

      // Allow future upgrades by closing this handle if a versionchange occurs.
      database.onversionchange = () => {
        try {
          database.close();
        } catch {
          /* ignore */
        }
        cachedDatabase = null;
        databaseOpenPromise = null;
      };

      cachedDatabase = database;
      resolve(database);
    };
  });

  return databaseOpenPromise;
}

/**
 * Run a task inside a single-object-store IndexedDB transaction and resolve
 * only after BOTH the task has settled and the transaction has completed.
 *
 * Guarantees:
 * - `objectStoreTask` is executed with an `IDBObjectStore` for STORE_NAME.
 * - If `objectStoreTask` returns a promise, it is awaited.
 * - The returned promise resolves with the task’s return value after
 *   `transaction.oncomplete` fires (all requests finished).
 * - The returned promise rejects on transaction error/abort or task rejection.
 *
 * @param {"readonly" | "readwrite"} mode
 * @param {(objectStore: IDBObjectStore) => any} objectStoreTask
 * @returns {Promise<any>} Resolves to the value returned by `objectStoreTask`.
 */
async function withStore(mode, objectStoreTask) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const objectStore = transaction.objectStore(STORE_NAME);

    // Coordination between task settlement and transaction completion.
    let taskSettled = false;
    let txCompleted = false;
    let taskResult;

    const tryFinish = () => {
      if (taskSettled && txCompleted) resolve(taskResult);
    };

    // Transaction-level failure handling.
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => {
      txCompleted = true;
      tryFinish();
    };

    // Execute task and wait for its completion (sync or async).
    try {
      const possiblePromise = objectStoreTask(objectStore);
      Promise.resolve(possiblePromise)
        .then((value) => {
          taskResult = value;
          taskSettled = true;
          tryFinish();
        })
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Persist a single key/value pair in IndexedDB.
 *
 * Behavior:
 * - Opens one readwrite transaction and issues a `put` for the given key.
 * - Resolves after the transaction completes successfully.
 * - Rejects if the transaction fails.
 *
 * @param {string} storageKey   Key to write.
 * @param {string} stringValue  Serialized value (JSON string).
 * @returns {Promise<void>}
 */
async function dbSet(storageKey, stringValue) {
  await withStore("readwrite", (objectStore) => {
    objectStore.put(stringValue, storageKey);
  });
}

/**
 * Read a set of keys from IndexedDB within a single readonly transaction.
 *
 * Behavior:
 * - Queues a `get()` request for each key.
 * - Resolves after the transaction completes, returning a map of key → value (or null when missing).
 * - Values are returned as stored (JSON strings), without parsing.
 *
 * @param {string[]} storageKeys - List of keys to fetch.
 * @returns {Promise<Record<string, string|null>>} Map of requested keys to stored strings (or null).
 */
async function dbGetAll(storageKeys) {
  if (!Array.isArray(storageKeys) || storageKeys.length === 0) {
    return {};
  }

  const keyValueResult = Object.create(null);

  await withStore("readonly", (objectStore) => {
    const pendingReads = storageKeys.map(
      (storageKey) =>
        new Promise((resolve, reject) => {
          const request = objectStore.get(storageKey);
          request.onsuccess = () => {
            keyValueResult[storageKey] = request.result ?? null;
            resolve();
          };
          request.onerror = () => reject(request.error);
        })
    );

    // `withStore` resolves after the transaction completes; return the batching promise here.
    return Promise.all(pendingReads);
  });

  return keyValueResult;
}

/**
 * Write multiple key/value pairs in a single IndexedDB transaction.
 *
 * Behavior:
 * - Opens one readwrite transaction and issues a `put` for each entry.
 * - Resolves only after the transaction completes successfully.
 * - Rejects if any request in the transaction fails (transaction aborts).
 *
 * @param {{[key: string]: string}} recordMap - Map of storage keys to JSON strings.
 * @returns {Promise<void>}
 */
async function dbSetAll(recordMap) {
  if (!recordMap || typeof recordMap !== "object") return;

  await withStore("readwrite", (objectStore) => {
    for (const [storageKey, serializedValue] of Object.entries(recordMap)) {
      objectStore.put(serializedValue, storageKey);
    }
    // Resolution is handled by `withStore` on transaction completion.
  });
}

/**
 * Remove all key/value entries from the IndexedDB object store.
 *
 * Behavior:
 * - Issues a single `clear()` on the object store within a readwrite transaction.
 * - Resolves only after the transaction completes successfully.
 * - Rejects if the transaction or request fails.
 *
 * @returns {Promise<void>}
 */
async function dbClear() {
  return withStore("readwrite", (objectStore) => {
    objectStore.clear(); // transaction completion is awaited by withStore
  });
}

/**
 * Safely parse a JSON string.
 *
 * Behavior:
 * - Accepts only string input; non-strings return the provided fallback value.
 * - Trims an optional UTF-8 BOM and surrounding whitespace before parsing.
 * - Returns the fallback value when the string is empty or parsing fails.
 *
 * @template T
 * @param {unknown} jsonText       Potential JSON string to parse.
 * @param {T}       fallbackValue  Value to return if parsing is not possible.
 * @returns {any|T} Parsed JSON value on success; otherwise `fallbackValue`.
 */
function parseJsonSafe(jsonText, fallbackValue) {
  if (typeof jsonText !== "string") return fallbackValue;

  // Remove optional BOM and surrounding whitespace.
  let normalizedText = jsonText;
  if (normalizedText && normalizedText.charCodeAt(0) === 0xfeff) {
    normalizedText = normalizedText.slice(1);
  }
  normalizedText = normalizedText.trim();
  if (normalizedText === "") return fallbackValue;

  try {
    return JSON.parse(normalizedText);
  } catch {
    return fallbackValue;
  }
}

/**
 * Normalize and validate a backup payload tailored to the current export shape.
 *
 * Required top level (EXACT keys, no extras):
 * {
 *   existingBookMetadata: series[] | JSON-stringified series[],
 *   existingFirstBookASINs: book[] | JSON-stringified book[],
 *   hiddenItems: string[] | {asin:string,...}[] | JSON-stringified of either
 * }
 *
 * Types:
 *   book   := plain object that includes a non-empty `asin` string (other fields allowed)
 *   series := { seriesAsin: string, response: book[] }
 *
 * Returns:
 *   { ok: true, recordToWrite: {key: string}, arraysForCache: {key: any[]} }
 * or:
 *   { ok: false, reason: string }
 */
function normalizeBackupJson(parsedJson) {
  // -------------------------------
  // Utilities
  // -------------------------------
  const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

  /** Coerce an input into an array. Accepts an array or a JSON-stringified array. */
  const coerceToArray = (rawValue) => {
    if (Array.isArray(rawValue)) return { ok: true, array: rawValue };
    if (typeof rawValue === "string") {
      let text = rawValue;
      // Trim an optional BOM
      if (text && text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
          ? { ok: true, array: parsed }
          : { ok: false, reason: "Value parses to a non-array." };
      } catch {
        return { ok: false, reason: "Invalid JSON string." };
      }
    }
    return { ok: false, reason: "Value must be an array or a JSON string." };
  };

  /** Find first index that fails a predicate; returns -1 if all pass. */
  const firstInvalidIndex = (array, predicate) => {
    for (let index = 0; index < array.length; index++) {
      if (!predicate(array[index])) return index;
    }
    return -1;
  };

  // -------------------------------
  // Top-level validation
  // -------------------------------
  if (!isPlainObject(parsedJson)) {
    return { ok: false, reason: "Top-level JSON must be an object." };
  }

  const incomingKeys = Object.keys(parsedJson);
  const missingKeys = REQUIRED_KEYS.filter((key) => !(key in parsedJson));
  const unexpectedKeys = incomingKeys.filter((key) => !REQUIRED_KEYS.includes(key));

  if (missingKeys.length > 0) {
    return { ok: false, reason: `Missing key(s): ${missingKeys.join(", ")}` };
  }
  if (unexpectedKeys.length > 0) {
    return { ok: false, reason: `Unexpected key(s): ${unexpectedKeys.join(", ")}` };
  }

  // -------------------------------
  // Key-specific parsing + validation
  // -------------------------------

  // existingFirstBookASINs → array of BOOK OBJECTS with asin:string
  const firstBooksResult = coerceToArray(parsedJson.existingFirstBookASINs);
  if (!firstBooksResult.ok) {
    return { ok: false, reason: `Key "existingFirstBookASINs": ${firstBooksResult.reason}` };
  }
  const firstBooksArray = firstBooksResult.array;
  {
    const invalidIndex = firstInvalidIndex(
      firstBooksArray,
      (item) => isPlainObject(item) && isNonEmptyString(item.asin)
    );
    if (invalidIndex !== -1) {
      const badSample = firstBooksArray[invalidIndex];
      console.warn(
        `(invalid element at index ${invalidIndex}: ${JSON.stringify(badSample).slice(0, 200)}...)`
      );
      return {
        ok: false,
        reason: `Key "existingFirstBookASINs" must be an array of objects each with a non-empty "asin"`,
      };
    }
  }

  // existingBookMetadata → array of SERIES OBJECTS { seriesAsin:string, response: book[] }
  const seriesResult = coerceToArray(parsedJson.existingBookMetadata);
  if (!seriesResult.ok) {
    return { ok: false, reason: `Key "existingBookMetadata": ${seriesResult.reason}` };
  }
  const seriesArray = seriesResult.array;
  {
    const invalidSeriesIndex = firstInvalidIndex(
      seriesArray,
      (seriesItem) =>
        isPlainObject(seriesItem) &&
        isNonEmptyString(seriesItem.seriesAsin) &&
        Array.isArray(seriesItem.response)
    );
    if (invalidSeriesIndex !== -1) {
      const badSeries = seriesArray[invalidSeriesIndex];
      console.warn(
        `(invalid series at index ${invalidSeriesIndex}: ${JSON.stringify(badSeries).slice(0, 200)}...)`
      );
      return {
        ok: false,
        reason: `Key "existingBookMetadata" must be an array of { seriesAsin:string, response: book[] }`,
      };
    }

    // Validate each book inside each response
    for (let seriesIndex = 0; seriesIndex < seriesArray.length; seriesIndex++) {
      const responseBooks = seriesArray[seriesIndex].response;
      const invalidBookIndex = firstInvalidIndex(
        responseBooks,
        (book) => isPlainObject(book) && isNonEmptyString(book.asin)
      );
      if (invalidBookIndex !== -1) {
        const badBook = responseBooks[invalidBookIndex];
        console.warn(
          `(invalid book at index ${invalidBookIndex}: ${JSON.stringify(badBook).slice(0, 200)}...)`
        );
        return {
          ok: false,
          reason: `Key "existingBookMetadata" → series[${seriesIndex}].response must be book objects with non-empty "asin"`,
        };
      }
    }
  }

  // hiddenItems → array of NON-EMPTY STRINGS *or* OBJECTS with asin:string (matches your sample)
  const hiddenResult = coerceToArray(parsedJson.hiddenItems);
  if (!hiddenResult.ok) {
    return { ok: false, reason: `Key "hiddenItems": ${hiddenResult.reason}` };
  }
  const hiddenItemsArray = hiddenResult.array;
  {
    const invalidHiddenIndex = firstInvalidIndex(
      hiddenItemsArray,
      (value) => isNonEmptyString(value) || (isPlainObject(value) && isNonEmptyString(value.asin))
    );
    if (invalidHiddenIndex !== -1) {
      const badHidden = hiddenItemsArray[invalidHiddenIndex];
      console.warn(
        `(invalid element at index ${invalidHiddenIndex}: ${JSON.stringify(badHidden)})`
      );
      return {
        ok: false,
        reason: `Key "hiddenItems" must be strings or objects with an "asin"`,
      };
    }
  }

  // -------------------------------
  // Outputs for persistence + cache
  // -------------------------------
  const arraysForCache = {
    existingBookMetadata: seriesArray,
    existingFirstBookASINs: firstBooksArray,
    hiddenItems: hiddenItemsArray,
  };

  const recordToWrite = {
    existingBookMetadata: JSON.stringify(seriesArray),
    existingFirstBookASINs: JSON.stringify(firstBooksArray),
    hiddenItems: JSON.stringify(hiddenItemsArray),
  };

  return { ok: true, recordToWrite, arraysForCache };
}

/**
 * Load values from IndexedDB into working memory when needed.
 *
 * Behavior:
 * - When `forceReload` is true, always reads from the database.
 * - Otherwise, loads only if the cache snapshot is stale or any key is not an array.
 * - For each required key:
 *     • expects a JSON string (e.g., "[]") from the database,
 *     • parses it safely, and
 *     • stores an array in working memory (falls back to []).
 * - Marks the cache snapshot as fresh only after a successful read.
 *
 * @param {{ forceReload?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function ensureWorkingMemoryReady({ forceReload = false } = {}) {
  const needsLoad =
    forceReload ||
    !cacheSnapshotIsFresh ||
    REQUIRED_KEYS.some((storageKey) => !Array.isArray(workingCache[storageKey]));

  if (!needsLoad) return;

  try {
    const keyValueSnapshot = await dbGetAll(REQUIRED_KEYS);

    for (const storageKey of REQUIRED_KEYS) {
      const serializedValue =
        typeof keyValueSnapshot[storageKey] === "string" ? keyValueSnapshot[storageKey] : "[]";

      const parsedArray = parseJsonSafe(serializedValue, []);
      workingCache[storageKey] = Array.isArray(parsedArray) ? parsedArray : [];
    }

    cacheSnapshotIsFresh = true;
  } catch {
    // If the read fails, keep existing working memory as-is and leave the snapshot marked stale.
    cacheSnapshotIsFresh = false;
  }
}

/**
 * Begin a run and prepare working memory.
 *
 * Reload policy (based on `fresh`):
 * - true   : force a reload from the database.
 * - false  : ensure working memory is populated if empty/stale, but do not force.
 * - "auto" : reload only when the cache snapshot is not fresh.
 *
 * Effects:
 * - Optionally reloads working memory from IndexedDB.
 * - Clears the set of modified keys for a clean run.
 * - Marks the run as active.
 *
 * @param {{ fresh?: true | false | "auto" }} [options]
 * @returns {Promise<void>}
 */
export async function beginRun({ fresh = "auto" } = {}) {
  let shouldForceReload = false;
  let shouldEnsureOnly = false;

  if (fresh === true) {
    shouldForceReload = true;
  } else if (fresh === false) {
    shouldEnsureOnly = true;
  } else {
    // Treat any other value as "auto".
    shouldForceReload = !cacheSnapshotIsFresh;
  }

  if (shouldForceReload) {
    await ensureWorkingMemoryReady({ forceReload: true });
  } else if (shouldEnsureOnly) {
    await ensureWorkingMemoryReady({ forceReload: false });
  }
  // If "auto" and the cache is fresh, no load is required.

  modifiedKeys.clear();
  runIsActive = true;
}

/**
 * Persist all modified collections to IndexedDB in a single batch.
 *
 * Behavior:
 * - Collects keys from `modifiedKeys`, limited to REQUIRED_KEYS.
 * - Serializes each working-cache array to a JSON string (defaults to "[]").
 * - Writes all keys in one transaction via `dbSetAll`.
 * - Clears `modifiedKeys` after a successful write.
 *
 * @returns {Promise<string[]>} List of keys that were flushed.
 */
export async function flushToDB() {
  if (modifiedKeys.size === 0) return [];

  // Determine which keys to flush (only known buckets), in a stable order.
  const keysToFlush = Array.from(modifiedKeys)
    .filter((key) => REQUIRED_KEYS.includes(key))
    .sort();

  if (keysToFlush.length === 0) {
    modifiedKeys.clear();
    return [];
  }

  // Build a single record map for atomic write.
  const recordToWrite = {};
  for (const storageKey of keysToFlush) {
    const value = Array.isArray(workingCache[storageKey]) ? workingCache[storageKey] : [];
    recordToWrite[storageKey] = JSON.stringify(value);
  }

  // One transaction for all pending keys.
  await dbSetAll(recordToWrite);

  // After a successful commit, no keys remain dirty.
  modifiedKeys.clear();
  return keysToFlush;
}

/**
 * Finish a run and optionally clear selected collections from working memory.
 *
 * Behavior:
 * - When `persist` is true, writes all modified keys to the database in one batch.
 *   When false, discards pending modifications.
 * - Clears zero or more in-memory collections based on the flags below.
 * - If any collection is cleared, the cache snapshot is marked stale so the next
 *   run will reload those values from the database.
 *
 * Clearing options (evaluated in this order):
 * - clearMemory: clears all REQUIRED_KEYS except "hiddenItems".
 * - clearHeavy : clears only HEAVY_KEYS.
 * - clearKeys  : clears a provided subset (unknown keys are ignored; "hiddenItems" is excluded).
 *
 * @param {{
 *   persist?: boolean,
 *   clearMemory?: boolean,
 *   clearHeavy?: boolean,
 *   clearKeys?: string[]
 * }} [options]
 * @returns {Promise<void>}
 */
export async function endRun({
  persist = true,
  clearMemory = false,
  clearHeavy = false,
  clearKeys = [],
} = {}) {
  // Commit or discard pending changes from this run.
  if (persist) {
    await flushToDB();
  } else {
    modifiedKeys.clear();
  }
  runIsActive = false;

  // Determine which keys to clear from working memory.
  let keysToClear = [];
  if (clearMemory) {
    keysToClear = [...REQUIRED_KEYS];
  } else if (clearHeavy) {
    keysToClear = [...HEAVY_KEYS];
  } else if (Array.isArray(clearKeys) && clearKeys.length > 0) {
    keysToClear = [...clearKeys];
  }

  // Keep visibility state; ignore unknown keys.
  const normalizedKeysToClear = keysToClear
    .filter((key) => REQUIRED_KEYS.includes(key))
    .filter((key) => key !== "hiddenItems");

  if (normalizedKeysToClear.length === 0) return;

  // Clear selected collections from memory.
  for (const storageKey of normalizedKeysToClear) {
    workingCache[storageKey] = [];
  }

  // Memory no longer mirrors the database for cleared keys.
  cacheSnapshotIsFresh = false;
  computeStoragePresence();
}

/**
 * Return a read-only snapshot of the collection for a given key.
 *
 * Behavior:
 * - For known keys (REQUIRED_KEYS), returns a shallow copy of the in-memory array.
 * - For unknown keys, returns an empty array without creating a new bucket.
 * - If a non-array is found (defensive), normalizes the cache entry to [] and returns [].
 *
 * @param {string} storeIdentifier - One of REQUIRED_KEYS.
 * @returns {any[]} Shallow copy of the stored array.
 */
export function loadMetadataFromLocalStorage(storeIdentifier) {
  if (!REQUIRED_KEYS.includes(storeIdentifier)) {
    return [];
  }

  const currentValue = workingCache[storeIdentifier];

  if (Array.isArray(currentValue)) {
    // Return a shallow copy to prevent external mutation of the cache.
    return [...currentValue];
  }

  // Defensive: normalize unexpected shapes.
  workingCache[storeIdentifier] = [];
  return [];
}

/**
 * Append a single item to a stored collection with basic de-duplication.
 *
 * De-duplication rules (non-breaking):
 * - Primitive values (string/number/boolean): uses Array.includes.
 * - Objects: if an identifiable key is present, uses it to avoid duplicates:
 *     • prefers "asin" when present (book objects)
 *     • otherwise "seriesAsin" (series records)
 *   If no identifiable key exists, falls back to reference equality (includes).
 *
 * Persistence:
 * - During an active run, marks the key as modified (database write deferred).
 * - When no run is active, writes through to the database immediately.
 *
 * @param {any}    metadata        Item to append (primitive or object).
 * @param {string} storeIdentifier One of REQUIRED_KEYS.
 * @returns {Promise<void>}
 */
export async function storeMetadataToLocalStorage(metadata, storeIdentifier) {
  // Ignore unknown keys to prevent accidental buckets.
  if (!REQUIRED_KEYS.includes(storeIdentifier)) return;

  // Ensure a working array exists for this key.
  if (!Object.prototype.hasOwnProperty.call(workingCache, storeIdentifier)) {
    workingCache[storeIdentifier] = [];
  }
  const targetArray = workingCache[storeIdentifier];

  // Determine if the item already exists.
  let itemExists = false;

  if (metadata !== null && typeof metadata === "object") {
    // Prefer an explicit uniqueness key when possible.
    /** @type {string|undefined} */
    let uniqueField;
    if (typeof metadata.asin === "string" && metadata.asin.trim()) {
      uniqueField = "asin";
    } else if (typeof metadata.seriesAsin === "string" && metadata.seriesAsin.trim()) {
      uniqueField = "seriesAsin";
    }

    if (uniqueField) {
      const uniqueValue = metadata[uniqueField];
      itemExists = targetArray.some(
        (existing) =>
          existing && typeof existing === "object" && existing[uniqueField] === uniqueValue
      );
    } else {
      // Fallback: reference equality (matches prior behavior for opaque objects).
      itemExists = targetArray.includes(metadata);
    }
  } else {
    // Primitive de-duplication.
    itemExists = targetArray.includes(metadata);
  }

  // Append and persist (or mark dirty) only if not already present.
  if (!itemExists) {
    targetArray.push(metadata);

    if (runIsActive) {
      modifiedKeys.add(storeIdentifier);
    } else {
      await dbSet(storeIdentifier, JSON.stringify(targetArray));
      computeStoragePresence();
    }
  }
}

/**
 * Replace the entire collection for a key.
 *
 * Accepted input formats for `fullValue`:
 * - Array                       → used as-is (cloned)
 * - JSON-stringified array      → parsed, then used
 * - Iterable object (e.g., Set) → converted via Array.from
 * - Anything else               → treated as an empty array
 *
 * Behavior:
 * - Updates the in-memory cache immediately.
 * - When a run is active, marks the key as modified (database write is deferred).
 * - When no run is active, writes through to the database immediately.
 * - Element shape is not validated here; this function only replaces the value.
 *
 * @param {any}    fullValue       New collection to store (array, JSON string, or iterable).
 * @param {string} storeIdentifier One of REQUIRED_KEYS.
 * @returns {Promise<void>}
 */
export async function storeUpdateFullValueForLocalStorage(fullValue, storeIdentifier) {
  // Ignore unknown keys to avoid creating arbitrary buckets.
  if (!REQUIRED_KEYS.includes(storeIdentifier)) {
    return;
  }

  // Normalize input into a real array.
  let normalizedArray = [];
  if (Array.isArray(fullValue)) {
    normalizedArray = fullValue;
  } else if (typeof fullValue === "string") {
    const parsedValue = parseJsonSafe(fullValue, []);
    normalizedArray = Array.isArray(parsedValue) ? parsedValue : [];
  } else if (fullValue && typeof fullValue === "object") {
    try {
      normalizedArray = Array.from(fullValue);
    } catch {
      normalizedArray = [];
    }
  }

  // Ensure the working cache has a slot for this key, then replace it.
  if (!Object.prototype.hasOwnProperty.call(workingCache, storeIdentifier)) {
    workingCache[storeIdentifier] = [];
  }
  // Clone to avoid external mutation of the internal array.
  workingCache[storeIdentifier] = [...normalizedArray];

  // Defer or persist depending on run state.
  if (runIsActive) {
    modifiedKeys.add(storeIdentifier);
  } else {
    await dbSet(storeIdentifier, JSON.stringify(workingCache[storeIdentifier]));
    computeStoragePresence();
  }
}

/**
 * Clear a single stored collection by key (e.g., "hiddenItems").
 *
 * Behavior:
 * - Empties the in-memory array for the given key.
 * - If a run is active, defers persistence by marking the key as modified.
 * - If no run is active, writes an empty JSON array ("[]") to the database.
 * - When clearing a heavy key, marks the cache snapshot as stale so the next run reloads it.
 *
 * Notes:
 * - Operates only on known keys listed in REQUIRED_KEYS; unknown keys are ignored.
 *
 * @param {string} storeIdentifier - One of REQUIRED_KEYS.
 * @returns {Promise<void>}
 */
export async function clearLocalStorageByIdentifier(storeIdentifier) {
  if (!REQUIRED_KEYS.includes(storeIdentifier)) {
    return; // ignore unknown keys
  }

  // Reset working memory for this key.
  workingCache[storeIdentifier] = [];

  // Clearing heavy keys invalidates the cache snapshot for subsequent runs.
  if (HEAVY_KEYS.includes(storeIdentifier)) {
    cacheSnapshotIsFresh = false;
  }

  // Defer or persist depending on run state.
  if (runIsActive) {
    modifiedKeys.add(storeIdentifier);
  } else {
    await dbSet(storeIdentifier, "[]");
    computeStoragePresence();
  }
}

/**
 * Create and download a JSON backup containing the three required keys.
 *
 * Behavior:
 * - Reads the current values for REQUIRED_KEYS from IndexedDB.
 * - Ensures each exported value is a JSON string; defaults missing entries to "[]".
 * - Serializes an object with exactly those keys and triggers a file download.
 *
 * File name: "series-data.json"
 * Returned value: none (download is initiated as a side effect).
 */
export function exportStorageToJSON() {
  dbGetAll(REQUIRED_KEYS)
    .then((keyValueSnapshot) => {
      const downloadFileName = `Complete-Series-Local-Storage-${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "-")
        .replace(/\..*/, "")}.json`;

      // Build a minimal export object with deterministic keys.
      const exportPayload = {};
      for (const storageKey of REQUIRED_KEYS) {
        const serializedValue =
          typeof keyValueSnapshot[storageKey] === "string" ? keyValueSnapshot[storageKey] : "[]";
        exportPayload[storageKey] = serializedValue;
      }

      // Prepare a Blob and a temporary link to trigger the download.
      const fileContents = JSON.stringify(exportPayload, null, 2);
      const jsonBlob = new Blob([fileContents], { type: "application/json" });
      const objectUrl = URL.createObjectURL(jsonBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = downloadFileName;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Release the object URL to free memory.
      URL.revokeObjectURL(objectUrl);
    })
    .catch(() => {
      // Silent failure by design; UI may handle/report errors if desired.
    });
}

/**
 * Clear all persisted data and reset the in-memory working cache.
 *
 * Behavior:
 * - Deletes every key in the IndexedDB object store.
 * - Empties the in-memory arrays for all REQUIRED_KEYS.
 * - Clears the set of modified keys for the current run.
 * - Marks the cache snapshot as stale (`cacheSnapshotIsFresh = false`).
 *
 * Notes:
 * - Memory is reset even if the database clear fails.
 * - Callers that need fresh data afterward should run `beginRun({ fresh: true })`.
 *
 * @returns {Promise<void>}
 */
export async function clearLocalStorage() {
  try {
    await dbClear();
  } finally {
    for (const storageKey of REQUIRED_KEYS) {
      workingCache[storageKey] = [];
    }
    modifiedKeys.clear();
    cacheSnapshotIsFresh = false;
    computeStoragePresence();
  }
}

/**
 * Import a JSON backup into storage.
 *
 * Behavior:
 * - Accepts either real arrays or JSON-stringified arrays for each required key.
 * - Clears the database, writes the normalized values, and refreshes the in-memory cache.
 * - On success: clears the modified-keys set and marks the cache snapshot as fresh.
 *
 * Failure modes:
 * - Rejects if no file is provided, the file cannot be read, the JSON is invalid,
 *   or the payload does not match the expected shape.
 *
 * @param {File} file - JSON file produced by exportStorageToJSON (or compatible).
 * @returns {Promise<void>}
 */
export function importLocalStorage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = async (loadEvent) => {
      try {
        // Read text and trim an optional BOM.
        let fileText = loadEvent?.target?.result ?? "";
        if (fileText && fileText.charCodeAt(0) === 0xfeff) {
          fileText = fileText.slice(1);
        }

        const parsedJson = JSON.parse(fileText);
        const normalized = normalizeBackupJson(parsedJson);
        if (!normalized.ok) {
          reject(new Error(normalized.reason));
          return;
        }

        // Replace persisted data, then mirror into working memory.
        await dbClear();
        await dbSetAll(normalized.recordToWrite);

        for (const storageKey of Object.keys(normalized.arraysForCache)) {
          const arrayValue = normalized.arraysForCache[storageKey];
          workingCache[storageKey] = Array.isArray(arrayValue) ? arrayValue : [];
        }

        modifiedKeys.clear();
        cacheSnapshotIsFresh = true;
        computeStoragePresence();
        resolve();
      } catch {
        reject(new Error("Invalid or unreadable JSON file."));
      }
    };

    fileReader.onerror = () => {
      reject(new Error("Failed to read the file."));
    };

    fileReader.readAsText(file);
  });
}

/**
 * Bind the upload UI for importing a JSON backup into storage.
 * - Listens to file selection on <input id="uploadLocalStorage">.
 * - Supports drag & drop on <div id="uploadBox">.
 * - Writes brief status text into <p id="uploadPlaceholder">.
 * - Uses CSS classes only:
 *     • "uploadHover" while a file is dragged over the drop zone
 *     • "success"     after a successful import
 *     • "error"       after a failed import
 *
 * Expects: an `importLocalStorage(File)` function in scope.
 *
 * @returns {Promise<void>}
 */
export function bindStorageUploadUI() {
  const fileInput = document.getElementById("uploadLocalStorage");
  const dropZone = document.getElementById("uploadBox");
  const placeholder = document.getElementById("uploadPlaceholder");

  // If the input is missing, nothing to bind.
  if (!fileInput) return;

  // Handle file selection from the native file picker.
  fileInput.addEventListener("change", async (event) => {
    const selectedFile = event.target.files && event.target.files[0];
    if (!selectedFile) return;

    if (placeholder) placeholder.textContent = `Uploading: ${selectedFile.name}`;
    if (dropZone) dropZone.classList.remove("success", "error");

    try {
      await importLocalStorage(selectedFile);
      if (dropZone) dropZone.classList.add("success");
      if (placeholder) placeholder.textContent = `${selectedFile.name} successfully uploaded`;
    } catch (error) {
      if (dropZone) dropZone.classList.add("error");
      if (placeholder) placeholder.textContent = `Upload failed: ${error.message}`;
    } finally {
      // Reset input so the same file can be chosen again if needed.
      fileInput.value = "";
    }
  });

  // Drag & drop support is optional; require the drop zone element to proceed.
  if (!dropZone) return;

  // Helpers to toggle visual hover state; prevent default so the browser
  // does not open the file when dropped.
  const addHover = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.add("uploadHover");
  };
  const removeHover = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove("uploadHover");
  };

  dropZone.addEventListener("dragenter", addHover);
  dropZone.addEventListener("dragover", addHover);
  dropZone.addEventListener("dragleave", removeHover);

  // On drop: remove hover, forward the FileList to the input, trigger "change".
  dropZone.addEventListener("drop", (event) => {
    removeHover(event);
    const droppedFile =
      event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!droppedFile) return;
    fileInput.files = event.dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/**
 * Report whether the *persisted database* has any content for a given key.
 *
 * Behavior:
 * - For unknown keys (not in REQUIRED_KEYS), returns false.
 * - If the in-memory snapshot is fresh, answers from `workingCache` (fast path).
 * - Otherwise, reads the single key from IndexedDB and parses it safely.
 * - Treats missing/invalid/non-array values as empty.
 *
 * @param {string} storeIdentifier - One of REQUIRED_KEYS
 * @returns {Promise<boolean>} True if the stored array has length > 0.
 */
export async function hasDatabaseContentForKey(storeIdentifier) {
  if (!REQUIRED_KEYS.includes(storeIdentifier)) {
    return false;
  }

  // Fast path: working cache mirrors DB.
  const cachedValue = workingCache[storeIdentifier];
  if (cacheSnapshotIsFresh && Array.isArray(cachedValue)) {
    return cachedValue.length > 0;
  }

  // Slow path: read the single key from IndexedDB.
  try {
    const keyValueSnapshot = await dbGetAll([storeIdentifier]);
    const serializedValue =
      typeof keyValueSnapshot[storeIdentifier] === "string"
        ? keyValueSnapshot[storeIdentifier]
        : "[]";

    const parsed = parseJsonSafe(serializedValue, []);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    // On read failure, answer conservatively.
    return false;
  }
}

/**
 * Update visibility of storage-related menus based on current workingCache.
 * Adds/removes the "active" class on:
 *  - #localStorageMenu            (active if any data exists)
 *  - #clearSeriesListContainer    (active if existingFirstBookASINs has items)
 *  - #clearBooksListContainer     (active if existingBookMetadata has items)
 *  - #clearHiddenListContainer    (active if hiddenItems has items)
 *  - #clearAllListContainer       (active if any data exists)
 */
export async function computeStoragePresence() {
  const hasExistingBookMetadata = await hasDatabaseContentForKey("existingBookMetadata");
  const hasExistingFirstBookASINs = await hasDatabaseContentForKey("existingFirstBookASINs");
  const hasHiddenItems = await hasDatabaseContentForKey("hiddenItems");
  const hasAny = hasExistingBookMetadata || hasExistingFirstBookASINs || hasHiddenItems;

  // Resolve elements once
  const exportStorageContainer = document.getElementById("exportStorageContainer");
  const clearSeriesListContainer = document.getElementById("clearSeriesListContainer");
  const clearBooksListContainer = document.getElementById("clearBooksListContainer");
  const clearHiddenListContainer = document.getElementById("clearHiddenListContainer");

  // Helper: toggle "active" class safely
  const setActive = (element, makeActive, timeout = 1500) => {
    if (!element) return;
    setTimeout(() => {
      element.classList.toggle("active", !!makeActive);
    }, timeout);
  };

  // Apply per-rule visibility
  setActive(clearSeriesListContainer, hasExistingFirstBookASINs);
  setActive(clearBooksListContainer, hasExistingBookMetadata);
  setActive(clearHiddenListContainer, hasHiddenItems);
  setActive(exportStorageContainer, hasAny);
}
