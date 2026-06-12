const LEGACY_DB_NAME = "AudibleSeriesMetadataDB";
const LEGACY_DB_VERSION = 1;
const LEGACY_STORE_NAME = "kv";

export type LegacyStorageKey =
  | "existingBookMetadata"
  | "existingFirstBookASINs"
  | "hiddenItems";

export const LEGACY_STORAGE_ENTRIES: Array<{
  description: string;
  key: LegacyStorageKey;
  name: string;
}> = [
  {
    key: "existingBookMetadata",
    name: "V1 book metadata cache",
    description: "Legacy cached metadata responses",
  },
  {
    key: "existingFirstBookASINs",
    name: "V1 first-book ASIN cache",
    description: "Legacy first-book lookup cache",
  },
  {
    key: "hiddenItems",
    name: "V1 hidden items",
    description: "Legacy hidden series and books",
  },
];

/**
 * Purpose: Delete one known V1 IndexedDB collection without touching the other
 * legacy collections.
 *
 * @param key - Legacy V1 storage collection key to delete.
 * @returns A promise that resolves once the key has been removed.
 */
export async function deleteLegacyStorageKey(key: LegacyStorageKey): Promise<void> {
  const database = await openLegacyDatabase();
  await runLegacyStoreRequest(database, (store) => store.delete(key));
  database.close();
}

/**
 * Purpose: Delete the whole V1 IndexedDB database when the user asks to clear
 * all local data.
 *
 * @returns A promise that resolves once the legacy database has been deleted or
 * when IndexedDB is unavailable.
 */
export async function deleteLegacyStorageDatabase(): Promise<void> {
  if (!canUseIndexedDb()) return;

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(LEGACY_DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Purpose: Open the V1 IndexedDB database and create its object store if the
 * browser has not already created it.
 *
 * @returns A promise resolving to the opened IndexedDB database.
 */
function openLegacyDatabase(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable."));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LEGACY_DB_NAME, LEGACY_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        database.createObjectStore(LEGACY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Purpose: Run one write request against the V1 object store and resolve when
 * its transaction completes.
 *
 * @param database - Opened V1 IndexedDB database.
 * @param buildRequest - Callback that creates the store request to run.
 * @returns A promise that resolves after the transaction finishes.
 */
function runLegacyStoreRequest(
  database: IDBDatabase,
  buildRequest: (store: IDBObjectStore) => IDBRequest
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LEGACY_STORE_NAME);
    const request = buildRequest(store);

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Purpose: Check whether IndexedDB can be used from the current runtime.
 *
 * @returns `true` when IndexedDB is available in the browser.
 */
function canUseIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
