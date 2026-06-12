export type CacheRecord<T> = {
  key: string;
  value: T;
  createdAt: string;
  expiresAt: string | null;
};

export type CacheStore = {
  get<T>(key: string): Promise<CacheRecord<T> | null>;
  set<T>(record: CacheRecord<T>): Promise<void>;
  delete(key: string): Promise<void>;
};

/**
 * Purpose: Check whether a cached metadata record is still usable.
 *
 * @param record - Cache record with an optional expiry timestamp.
 * @param now - Current date used for comparison, injectable for tests.
 * @returns `true` when the record has no expiry date or expires in the future.
 */
export function isCacheRecordFresh(record: CacheRecord<unknown>, now = new Date()): boolean {
  if (!record.expiresAt) return true;
  return new Date(record.expiresAt).getTime() > now.getTime();
}
