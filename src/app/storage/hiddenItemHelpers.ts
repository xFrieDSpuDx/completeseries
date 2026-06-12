import type { ProviderSeriesBook } from "../../domain/audiobook";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { normaliseText } from "../../domain/normalise";
import type { HiddenItem } from "./hiddenItemsStore";

/**
 * Purpose: Normalise one raw hidden item from current V2 storage or V1 imports.
 *
 * @param rawItem - Unknown hidden item shape.
 * @returns A normalised hidden item, or `null` when the value is unusable.
 */
export function normaliseHiddenItem(rawItem: unknown): HiddenItem | null {
  if (!isRecord(rawItem)) return null;

  const type = rawItem.type === "series" || rawItem.type === "book" ? rawItem.type : null;
  const seriesName = stringValue(rawItem.seriesName) ?? stringValue(rawItem.series);
  const title = stringValue(rawItem.title);
  const asin = stringValue(rawItem.asin);

  if (!type || !seriesName) return null;
  if (type === "book" && !title && !asin) return null;

  return {
    type,
    seriesName,
    seriesAsin: stringValue(rawItem.seriesAsin),
    title,
    asin,
    hiddenAt: stringValue(rawItem.hiddenAt) ?? new Date().toISOString(),
  };
}

/**
 * Purpose: Sort hidden items so exports and manager lists stay predictable.
 *
 * @param hiddenItems - Hidden item list to sort.
 * @returns A new sorted hidden item list.
 */
export function sortHiddenItems(hiddenItems: HiddenItem[]): HiddenItem[] {
  return [...hiddenItems].sort((first, second) => {
    const seriesComparison = first.seriesName.localeCompare(second.seriesName);
    if (seriesComparison !== 0) return seriesComparison;

    const typeComparison = first.type.localeCompare(second.type);
    if (typeComparison !== 0) return typeComparison;

    return (first.title ?? "").localeCompare(second.title ?? "");
  });
}

/**
 * Purpose: Decide whether two hidden item records refer to the same entity.
 *
 * @param first - First hidden item.
 * @param second - Second hidden item.
 * @returns `true` when both records should be treated as duplicates.
 */
export function hiddenItemsMatch(first: HiddenItem, second: HiddenItem): boolean {
  if (first.type !== second.type) return false;
  if (first.asin && second.asin) return first.asin === second.asin;
  if (first.seriesAsin && second.seriesAsin && first.seriesAsin !== second.seriesAsin) {
    return false;
  }

  return (
    normaliseText(first.seriesName) === normaliseText(second.seriesName) &&
    normaliseText(first.title ?? "") === normaliseText(second.title ?? "")
  );
}

/**
 * Purpose: Decide whether a hidden series record matches a result group.
 *
 * @param hiddenItem - Hidden series record.
 * @param group - Result group to compare.
 * @returns `true` when the record hides the group.
 */
export function hiddenSeriesMatchesGroup(
  hiddenItem: HiddenItem,
  group: MissingBookGroup
): boolean {
  if (hiddenItem.seriesAsin && hiddenItem.seriesAsin === group.seriesAsin) return true;
  return normaliseText(hiddenItem.seriesName) === normaliseText(group.seriesName);
}

/**
 * Purpose: Decide whether a hidden book record matches a provider book.
 *
 * @param hiddenItem - Hidden book record.
 * @param group - Result group containing the provider book.
 * @param book - Provider book to compare.
 * @returns `true` when the record hides the book.
 */
export function hiddenBookMatchesBook(
  hiddenItem: HiddenItem,
  group: MissingBookGroup,
  book: ProviderSeriesBook
): boolean {
  if (hiddenItem.asin && hiddenItem.asin === book.asin) return true;

  return (
    normaliseText(hiddenItem.seriesName) === normaliseText(group.seriesName) &&
    normaliseText(hiddenItem.title ?? "") === normaliseText(book.title)
  );
}

/**
 * Purpose: Narrow nullable values out of arrays.
 *
 * @param value - Nullable value.
 * @returns `true` when the value is present.
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Purpose: Check that an unknown value is an object with string keys.
 *
 * @param value - Unknown value to check.
 * @returns `true` when the value is a record-like object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Purpose: Convert an unknown value into a trimmed non-empty string.
 *
 * @param value - Unknown value to convert.
 * @returns A trimmed string, or `null` when the value is not usable.
 */
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
