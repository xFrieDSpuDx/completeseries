import type { MetadataProviderId } from "../metadataProvider";

export const PROVIDER_RESPONSE_CACHE_DB_NAME = "CompleteSeriesProviderResponseCacheV2";
export const PROVIDER_RESPONSE_CACHE_STORE_NAME = "responses";

const PROVIDER_RESPONSE_CACHE_DB_VERSION = 1;

export type ProviderResponseCacheRecord = {
  fetchedAt: string;
  path: string;
  payload: unknown | null;
  providerId: MetadataProviderId;
  schemaVersion: 1;
};

/**
 * Purpose: Load one cached metadata provider response from persistent browser
 * storage.
 *
 * @param providerId - Metadata provider that owns the request.
 * @param path - Provider request URL or local proxy path used as the cache key.
 * @returns Cache hit state and payload when IndexedDB contains the request.
 */
export async function loadCachedProviderResponse<T>(
  providerId: MetadataProviderId,
  path: string
): Promise<{ hit: boolean; payload: T | null }> {
  try {
    const database = await openProviderResponseCache();
    const record = await readProviderResponseRecord(database, buildCacheKey(providerId, path));
    database.close();

    return record ? { hit: true, payload: record.payload as T | null } : { hit: false, payload: null };
  } catch {
    return { hit: false, payload: null };
  }
}

/**
 * Purpose: Save one metadata provider response to persistent browser storage.
 *
 * @param providerId - Metadata provider that owns the request.
 * @param path - Provider request URL or local proxy path used as the cache key.
 * @param payload - Parsed provider response, or `null` for a 404.
 * @returns A promise that resolves after the cache write attempt finishes.
 */
export async function saveCachedProviderResponse(
  providerId: MetadataProviderId,
  path: string,
  payload: unknown | null
): Promise<void> {
  try {
    const database = await openProviderResponseCache();
    await writeProviderResponseRecord(database, {
      fetchedAt: new Date().toISOString(),
      path,
      payload,
      providerId,
      schemaVersion: 1,
    });
    database.close();
  } catch {
    // Cache writes should never block scans.
  }
}

/**
 * Purpose: Export every cached metadata provider response for backup or
 * transfer to another browser.
 *
 * @returns Cached provider response records.
 */
export async function exportProviderResponseCache(): Promise<ProviderResponseCacheRecord[]> {
  try {
    const database = await openProviderResponseCache();
    const records = await readAllProviderResponseRecords(database);
    database.close();

    return records;
  } catch {
    return [];
  }
}

/**
 * Purpose: Import cached metadata provider responses from a local data file.
 *
 * @param records - Cache records parsed from a local data export.
 * @returns Number of cache records written.
 */
export async function importProviderResponseCache(
  records: ProviderResponseCacheRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  try {
    const database = await openProviderResponseCache();
    await writeProviderResponseRecords(database, records);
    database.close();

    return records.length;
  } catch {
    return 0;
  }
}

/**
 * Purpose: Parse provider response cache records from a V2 local data export.
 *
 * @param payloadText - JSON text from an imported local data file.
 * @returns Valid provider cache records from the payload.
 */
export function parseProviderResponseCachePayload(
  payloadText: string
): ProviderResponseCacheRecord[] {
  try {
    const parsed = JSON.parse(payloadText) as { providerResponseCache?: unknown };
    if (!Array.isArray(parsed.providerResponseCache)) return [];

    return parsed.providerResponseCache.map(normaliseCacheRecord).filter(isPresent);
  } catch {
    return [];
  }
}

/**
 * Purpose: Count cached metadata provider responses for local data management.
 *
 * @returns Number of cached records, or zero when storage is unavailable.
 */
export async function countProviderResponseCache(): Promise<number> {
  try {
    const database = await openProviderResponseCache();
    const count = await countProviderResponseRecords(database);
    database.close();

    return count;
  } catch {
    return 0;
  }
}

/**
 * Purpose: Delete every cached metadata provider response.
 *
 * @returns A promise that resolves after the delete attempt finishes.
 */
export async function clearProviderResponseCache(): Promise<void> {
  if (!canUseIndexedDb()) return;

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(PROVIDER_RESPONSE_CACHE_DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Purpose: Open the IndexedDB database used for persisted provider responses.
 *
 * @returns A promise resolving to the opened database.
 */
function openProviderResponseCache(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable."));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      PROVIDER_RESPONSE_CACHE_DB_NAME,
      PROVIDER_RESPONSE_CACHE_DB_VERSION
    );

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROVIDER_RESPONSE_CACHE_STORE_NAME)) {
        database.createObjectStore(PROVIDER_RESPONSE_CACHE_STORE_NAME, { keyPath: "cacheKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Purpose: Read one cache record from the opened database.
 *
 * @param database - Opened provider response cache database.
 * @param cacheKey - Provider-aware cache key.
 * @returns The cached record, or `null` when absent.
 */
function readProviderResponseRecord(
  database: IDBDatabase,
  cacheKey: string
): Promise<ProviderResponseCacheRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROVIDER_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROVIDER_RESPONSE_CACHE_STORE_NAME);
    const request = store.get(cacheKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(normaliseCacheRecord(request.result));
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Purpose: Read every cache record from the opened database.
 *
 * @param database - Opened provider response cache database.
 * @returns Cached provider response records.
 */
function readAllProviderResponseRecords(
  database: IDBDatabase
): Promise<ProviderResponseCacheRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROVIDER_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROVIDER_RESPONSE_CACHE_STORE_NAME);
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
 * @param database - Opened provider response cache database.
 * @returns Number of cached responses.
 */
function countProviderResponseRecords(database: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROVIDER_RESPONSE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROVIDER_RESPONSE_CACHE_STORE_NAME);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Purpose: Write one cache record to the opened database.
 *
 * @param database - Opened provider response cache database.
 * @param record - Cache record to write.
 * @returns A promise that resolves when the write transaction completes.
 */
function writeProviderResponseRecord(
  database: IDBDatabase,
  record: ProviderResponseCacheRecord
): Promise<void> {
  return writeProviderResponseRecords(database, [record]);
}

/**
 * Purpose: Write multiple cache records to the opened database.
 *
 * @param database - Opened provider response cache database.
 * @param records - Cache records to write.
 * @returns A promise that resolves when the write transaction completes.
 */
function writeProviderResponseRecords(
  database: IDBDatabase,
  records: ProviderResponseCacheRecord[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROVIDER_RESPONSE_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PROVIDER_RESPONSE_CACHE_STORE_NAME);

    for (const record of records) {
      store.put({ ...record, cacheKey: buildCacheKey(record.providerId, record.path) });
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
function normaliseCacheRecord(value: unknown): ProviderResponseCacheRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Partial<ProviderResponseCacheRecord>;
  if (!isMetadataProviderId(candidate.providerId)) return null;
  if (typeof candidate.path !== "string" || candidate.path.trim().length === 0) return null;

  return {
    fetchedAt: typeof candidate.fetchedAt === "string" ? candidate.fetchedAt : new Date().toISOString(),
    path: candidate.path,
    payload: "payload" in candidate ? candidate.payload : null,
    providerId: candidate.providerId,
    schemaVersion: 1,
  };
}

/**
 * Purpose: Build a provider-aware key so equal URLs from different providers
 * cannot collide.
 *
 * @param providerId - Metadata provider that owns the request.
 * @param path - Provider request URL or local proxy path.
 * @returns Stable IndexedDB key.
 */
function buildCacheKey(providerId: MetadataProviderId, path: string): string {
  return `${providerId}:${path}`;
}

/**
 * Purpose: Validate provider ids from imported cache payloads.
 *
 * @param value - Unknown provider id.
 * @returns `true` when the value is a supported metadata provider id.
 */
function isMetadataProviderId(value: unknown): value is MetadataProviderId {
  return (
    value === "audible" ||
    value === "appleBooks" ||
    value === "googleBooks" ||
    value === "openLibrary"
  );
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
