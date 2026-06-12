export const AUDIBLE_RESPONSE_CACHE_DB_NAME = "CompleteSeriesAudibleResponseCacheV2";
export const AUDIBLE_RESPONSE_CACHE_STORE_NAME = "responses";

const AUDIBLE_RESPONSE_CACHE_DB_VERSION = 1;
const AUDIBLE_API_HOSTS = new Set([
  "api.audible.com.au",
  "api.audible.com.br",
  "api.audible.ca",
  "api.audible.de",
  "api.audible.es",
  "api.audible.fr",
  "api.audible.in",
  "api.audible.it",
  "api.audible.co.jp",
  "api.audible.co.uk",
  "api.audible.com",
]);

export type AudibleResponseCacheRecord = {
  fetchedAt: string;
  path: string;
  payload: unknown | null;
  schemaVersion: 1;
};

/**
 * Purpose: Load one cached Audible API response from persistent browser
 * storage.
 *
 * @param path - Same-origin Audible route or direct no-proxy trial URL used as
 * the cache key.
 * @returns Cache hit state and payload when IndexedDB contains the request.
 */
export async function loadCachedAudibleResponse<T>(
  path: string
): Promise<{ hit: boolean; payload: T | null }> {
  try {
    const database = await openAudibleResponseCache();
    const record = await readAudibleResponseRecord(database, path);
    database.close();

    return record ? { hit: true, payload: record.payload as T | null } : { hit: false, payload: null };
  } catch {
    return { hit: false, payload: null };
  }
}

/**
 * Purpose: Save one Audible API response to persistent browser storage.
 *
 * @param path - Same-origin Audible route used as the cache key.
 * @param payload - Parsed Audible response, or `null` for a 404.
 * @returns A promise that resolves after the cache write attempt finishes.
 */
export async function saveCachedAudibleResponse(path: string, payload: unknown | null): Promise<void> {
  try {
    const database = await openAudibleResponseCache();
    await writeAudibleResponseRecord(database, {
      fetchedAt: new Date().toISOString(),
      path,
      payload,
      schemaVersion: 1,
    });
    database.close();
  } catch {
    // Cache writes should never block scans.
  }
}

/**
 * Purpose: Export every cached Audible API response for backup or transfer to
 * another browser.
 *
 * @returns Cached Audible response records, newest or oldest as stored by the
 * browser.
 */
export async function exportAudibleResponseCache(): Promise<AudibleResponseCacheRecord[]> {
  try {
    const database = await openAudibleResponseCache();
    const records = await readAllAudibleResponseRecords(database);
    database.close();

    return records;
  } catch {
    return [];
  }
}

/**
 * Purpose: Import cached Audible API responses from a local data file.
 *
 * @param records - Cache records parsed from a local data export.
 * @returns Number of cache records written.
 */
export async function importAudibleResponseCache(
  records: AudibleResponseCacheRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  try {
    const database = await openAudibleResponseCache();
    await writeAudibleResponseRecords(database, records);
    database.close();

    return records.length;
  } catch {
    return 0;
  }
}

/**
 * Purpose: Parse Audible API cache records from a V2 local data export.
 *
 * @param payloadText - JSON text from an imported local data file.
 * @returns Valid cache records from the payload.
 */
export function parseAudibleResponseCachePayload(
  payloadText: string
): AudibleResponseCacheRecord[] {
  try {
    const parsed = JSON.parse(payloadText) as { audibleResponseCache?: unknown };
    if (!Array.isArray(parsed.audibleResponseCache)) return [];

    return parsed.audibleResponseCache.map(normaliseCacheRecord).filter(isPresent);
  } catch {
    return [];
  }
}

/**
 * Purpose: Count cached Audible API responses for local data management.
 *
 * @returns Number of cached records, or zero when storage is unavailable.
 */
export async function countAudibleResponseCache(): Promise<number> {
  try {
    const database = await openAudibleResponseCache();
    const count = await countAudibleResponseRecords(database);
    database.close();

    return count;
  } catch {
    return 0;
  }
}

/**
 * Purpose: Delete every cached Audible API response.
 *
 * @returns A promise that resolves after the delete attempt finishes.
 */
export async function clearAudibleResponseCache(): Promise<void> {
  if (!canUseIndexedDb()) return;

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(AUDIBLE_RESPONSE_CACHE_DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Purpose: Open the IndexedDB database used for persisted Audible responses.
 *
 * @returns A promise resolving to the opened database.
 */
function openAudibleResponseCache(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable."));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      AUDIBLE_RESPONSE_CACHE_DB_NAME,
      AUDIBLE_RESPONSE_CACHE_DB_VERSION
    );

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIBLE_RESPONSE_CACHE_STORE_NAME)) {
        database.createObjectStore(AUDIBLE_RESPONSE_CACHE_STORE_NAME, { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Purpose: Read one cache record from the opened database.
 *
 * @param database - Opened Audible response cache database.
 * @param path - Same-origin Audible route or direct no-proxy trial URL used as
 * the cache key.
 * @returns The cached record, or `null` when absent.
 */
function readAudibleResponseRecord(
  database: IDBDatabase,
  path: string
): Promise<AudibleResponseCacheRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIBLE_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(AUDIBLE_RESPONSE_CACHE_STORE_NAME);
    const request = store.get(path);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(normaliseCacheRecord(request.result));
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Purpose: Read every cache record from the opened database.
 *
 * @param database - Opened Audible response cache database.
 * @returns Cached Audible response records.
 */
function readAllAudibleResponseRecords(
  database: IDBDatabase
): Promise<AudibleResponseCacheRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIBLE_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(AUDIBLE_RESPONSE_CACHE_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const records = Array.isArray(request.result)
        ? request.result.map(normaliseCacheRecord).filter(isPresent)
        : [];
      resolve(records);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Purpose: Count cache records in the opened database.
 *
 * @param database - Opened Audible response cache database.
 * @returns Number of cached responses.
 */
function countAudibleResponseRecords(database: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIBLE_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(AUDIBLE_RESPONSE_CACHE_STORE_NAME);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Purpose: Write one cache record to the opened database.
 *
 * @param database - Opened Audible response cache database.
 * @param record - Cache record to write.
 * @returns A promise that resolves when the write transaction completes.
 */
function writeAudibleResponseRecord(
  database: IDBDatabase,
  record: AudibleResponseCacheRecord
): Promise<void> {
  return writeAudibleResponseRecords(database, [record]);
}

/**
 * Purpose: Write multiple cache records to the opened database.
 *
 * @param database - Opened Audible response cache database.
 * @param records - Cache records to write.
 * @returns A promise that resolves when the write transaction completes.
 */
function writeAudibleResponseRecords(
  database: IDBDatabase,
  records: AudibleResponseCacheRecord[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIBLE_RESPONSE_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AUDIBLE_RESPONSE_CACHE_STORE_NAME);

    for (const record of records) {
      store.put(record);
    }

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Purpose: Normalise one unknown cache record from IndexedDB or import data.
 *
 * @param value - Unknown cache record value.
 * @returns A valid cache record, or `null` when unusable.
 */
function normaliseCacheRecord(value: unknown): AudibleResponseCacheRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Partial<AudibleResponseCacheRecord>;
  if (typeof candidate.path !== "string" || !isAudibleCachePath(candidate.path)) {
    return null;
  }

  return {
    fetchedAt: typeof candidate.fetchedAt === "string" ? candidate.fetchedAt : new Date().toISOString(),
    path: candidate.path,
    payload: "payload" in candidate ? candidate.payload : null,
    schemaVersion: 1,
  };
}

/**
 * Purpose: Check whether an imported cache key belongs to Audible catalogue
 * data.
 *
 * @param path - Cache key from IndexedDB or a local data import.
 * @returns `true` for current same-origin Audible routes and direct no-proxy
 * trial URLs.
 */
function isAudibleCachePath(path: string): boolean {
  if (path.startsWith("/api/audible/")) return true;

  try {
    const url = new URL(path);
    return url.protocol === "https:" && AUDIBLE_API_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Purpose: Narrow nullable values from mapped cache record arrays.
 *
 * @param value - Nullable cache record value.
 * @returns `true` when the value is a cache record.
 */
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Purpose: Check whether IndexedDB can be used from the current runtime.
 *
 * @returns `true` when IndexedDB is available in the browser.
 */
function canUseIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
