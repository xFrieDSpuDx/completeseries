import type { ProviderSeriesBook } from "../../domain/audiobook";
import type { MissingBookGroup } from "../../domain/missingBooks";
import {
  hiddenBookMatchesBook,
  hiddenItemsMatch,
  hiddenSeriesMatchesGroup,
  isPresent,
  isRecord,
  normaliseHiddenItem,
  sortHiddenItems,
} from "./hiddenItemHelpers";

export const HIDDEN_ITEMS_STORAGE_KEY = "completeSeries.hiddenItems.v2";

export type HiddenItemType = "series" | "book";

export type HiddenItem = {
  type: HiddenItemType;
  seriesName: string;
  seriesAsin?: string | null;
  title?: string | null;
  asin?: string | null;
  hiddenAt: string;
};

/**
 * Purpose: Load hidden books and series from browser storage.
 *
 * @returns Hidden items from local storage, or an empty list when no saved data
 * exists or the saved value is invalid.
 */
export function loadHiddenItems(): HiddenItem[] {
  const storage = getBrowserStorage();
  if (!storage) return [];

  return parseHiddenItemsPayload(storage.getItem(HIDDEN_ITEMS_STORAGE_KEY) ?? "[]");
}

/**
 * Purpose: Persist the complete hidden item list to browser storage.
 *
 * @param hiddenItems - Hidden books and series to store.
 * @returns Nothing. Invalid or duplicate items are normalised before storage.
 */
export function saveHiddenItems(hiddenItems: HiddenItem[]): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.setItem(HIDDEN_ITEMS_STORAGE_KEY, JSON.stringify(sortHiddenItems(hiddenItems)));
}

/**
 * Purpose: Parse hidden item data from V2 exports or the compatible V1
 * `hiddenItems` array shape.
 *
 * @param payloadText - JSON text containing either an array or an object with a
 * `hiddenItems` array.
 * @returns Normalised hidden item records.
 */
export function parseHiddenItemsPayload(payloadText: string): HiddenItem[] {
  try {
    const parsed = JSON.parse(payloadText) as unknown;
    const rawItems = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.hiddenItems)
        ? parsed.hiddenItems
        : [];

    return sortHiddenItems(rawItems.map(normaliseHiddenItem).filter(isPresent));
  } catch {
    return [];
  }
}

/**
 * Purpose: Build a downloadable JSON payload for V2 local app data.
 *
 * @param hiddenItems - Current hidden item records.
 * @returns Pretty-printed JSON containing local V2 data.
 */
export function buildLocalDataExport(hiddenItems: HiddenItem[]): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      hiddenItems: sortHiddenItems(hiddenItems),
    },
    null,
    2
  );
}

/**
 * Purpose: Add or replace one hidden item without creating duplicates.
 *
 * @param hiddenItems - Existing hidden item list.
 * @param hiddenItem - Item to add.
 * @returns A sorted hidden item list containing the item once.
 */
export function upsertHiddenItem(
  hiddenItems: HiddenItem[],
  hiddenItem: HiddenItem
): HiddenItem[] {
  return sortHiddenItems([...hiddenItems.filter((item) => !hiddenItemsMatch(item, hiddenItem)), hiddenItem]);
}

/**
 * Purpose: Remove one hidden item from the hidden item list.
 *
 * @param hiddenItems - Existing hidden item list.
 * @param hiddenItem - Item to remove.
 * @returns A sorted hidden item list without the matching item.
 */
export function removeHiddenItem(
  hiddenItems: HiddenItem[],
  hiddenItem: HiddenItem
): HiddenItem[] {
  return sortHiddenItems(hiddenItems.filter((item) => !hiddenItemsMatch(item, hiddenItem)));
}

/**
 * Purpose: Merge imported hidden item records with current hidden items.
 *
 * @param existingItems - Hidden items already stored locally.
 * @param importedItems - Hidden items parsed from an import file.
 * @returns A sorted, de-duplicated hidden item list.
 */
export function mergeHiddenItems(
  existingItems: HiddenItem[],
  importedItems: HiddenItem[]
): HiddenItem[] {
  return importedItems.reduce(upsertHiddenItem, existingItems);
}

/**
 * Purpose: Create a hidden-series record from a result group.
 *
 * @param group - Missing-book group selected by the user.
 * @returns Hidden item metadata for the whole series.
 */
export function createHiddenSeriesItem(group: MissingBookGroup): HiddenItem {
  return {
    type: "series",
    seriesName: group.seriesName,
    seriesAsin: group.seriesAsin,
    hiddenAt: new Date().toISOString(),
  };
}

/**
 * Purpose: Create a hidden-book record from a result group and provider book.
 *
 * @param group - Missing-book group containing the book.
 * @param book - Provider book selected by the user.
 * @returns Hidden item metadata for one book.
 */
export function createHiddenBookItem(group: MissingBookGroup, book: ProviderSeriesBook): HiddenItem {
  return {
    type: "book",
    seriesName: group.seriesName,
    seriesAsin: group.seriesAsin,
    title: book.title,
    asin: book.asin,
    hiddenAt: new Date().toISOString(),
  };
}

/**
 * Purpose: Check whether a whole missing-book group is hidden.
 *
 * @param hiddenItems - Current hidden books and series.
 * @param group - Missing-book group to check.
 * @returns `true` when the group matches a hidden series record.
 */
export function isHiddenSeries(hiddenItems: HiddenItem[], group: MissingBookGroup): boolean {
  return hiddenItems.some((item) => item.type === "series" && hiddenSeriesMatchesGroup(item, group));
}

/**
 * Purpose: Check whether one provider book is hidden within a group.
 *
 * @param hiddenItems - Current hidden books and series.
 * @param group - Missing-book group containing the book.
 * @param book - Provider book to check.
 * @returns `true` when the book or its parent series is hidden.
 */
export function isHiddenBook(
  hiddenItems: HiddenItem[],
  group: MissingBookGroup,
  book: ProviderSeriesBook
): boolean {
  return hiddenItems.some(
    (item) =>
      (item.type === "series" && hiddenSeriesMatchesGroup(item, group)) ||
      (item.type === "book" && hiddenBookMatchesBook(item, group, book))
  );
}

/**
 * Purpose: Count hidden records by item type for display summaries.
 *
 * @param hiddenItems - Current hidden books and series.
 * @returns Counts for hidden series and hidden books.
 */
export function countHiddenItems(hiddenItems: HiddenItem[]): { series: number; books: number } {
  return {
    series: hiddenItems.filter((item) => item.type === "series").length,
    books: hiddenItems.filter((item) => item.type === "book").length,
  };
}

/**
 * Purpose: Read browser local storage only when it is available.
 *
 * @returns Browser local storage, or `null` outside a browser context.
 */
function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
