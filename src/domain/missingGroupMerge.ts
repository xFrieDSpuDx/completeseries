import type { ProviderSeriesBook } from "./audiobook";
import type {
  MergedSeriesSource,
  MissingBookDebugDecision,
  MissingBookDiagnostic,
  MissingBookGroup,
} from "./missingBookTypes";
import { normaliseIdentifier, normaliseText } from "./normalise";

/**
 * Purpose: Merge duplicate missing-book groups and remove repeated books across
 * the whole scan result.
 *
 * @param groups - Missing-book groups produced while scanning individual local
 * series.
 * @returns Consolidated groups with duplicate books removed and empty groups
 * discarded.
 */
export function mergeMissingBookGroups(groups: MissingBookGroup[]): MissingBookGroup[] {
  const mergedGroupsByKey = new Map<string, MissingBookGroup>();
  const globalBookOwnersByKey = new Map<string, string>();

  for (const group of groups) {
    const groupKey = buildGroupKey(group);
    const mergedGroup =
      mergedGroupsByKey.get(groupKey) ?? createEmptyMergedGroup(group);

    rememberMergedSeriesSource(mergedGroup, group);
    mergedGroup.debugDecisions.push(...group.debugDecisions);

    for (const book of group.books) {
      const bookKeys = buildGlobalBookKeys(book);
      const existingOwnerKey = findExistingBookOwnerKey(bookKeys, globalBookOwnersByKey);
      if (existingOwnerKey) {
        const existingOwner = mergedGroupsByKey.get(existingOwnerKey);
        if (existingOwner && existingOwner !== mergedGroup) {
          rememberMergedSeriesSource(existingOwner, group);
          existingOwner.debugDecisions.push(...group.debugDecisions);
        }
        continue;
      }

      mergedGroup.books.push(book);
      for (const bookKey of bookKeys) globalBookOwnersByKey.set(bookKey, groupKey);

      const diagnostic = group.diagnosticsByAsin[book.asin];
      if (diagnostic) mergedGroup.diagnosticsByAsin[book.asin] = diagnostic;
    }

    mergedGroupsByKey.set(groupKey, mergedGroup);
  }

  return [...mergedGroupsByKey.values()]
    .filter((group) => group.books.length > 0)
    .map(removeSingleSourceMergeMetadata);
}

/**
 * Purpose: Build the key used to merge repeated series groups.
 *
 * @param group - Missing-book group to key.
 * @returns A stable key based on provider series ASIN when possible, otherwise
 * normalised series name.
 */
function buildGroupKey(group: MissingBookGroup): string {
  const seriesAsin = normaliseIdentifier(group.seriesAsin);
  if (seriesAsin && seriesAsin !== "UNKNOWN") return `asin:${seriesAsin}`;

  return `name:${normaliseText(group.seriesName)}`;
}

/**
 * Purpose: Build a global duplicate key for one provider book.
 *
 * @param book - Provider book that may already exist in another visible group.
 * @returns Identifier-based, edition title, and work title keys that can detect
 * repeated books across overlapping provider series.
 */
function buildGlobalBookKeys(book: ProviderSeriesBook): string[] {
  const keys: string[] = [];
  const identifier = [book.asin, book.sku, book.skuGroup].map(normaliseIdentifier).find(Boolean);
  const title = normaliseText(book.title);
  const firstAuthor = normaliseText(book.authors[0]);
  const titleKey = [
    "title",
    title,
    normaliseText(book.subtitle),
    firstAuthor,
  ].join(":");
  const workKey = ["work", title, firstAuthor].join(":");

  if (identifier) keys.push(`id:${identifier}`);
  if (title) keys.push(titleKey);
  if (title && firstAuthor) keys.push(workKey);

  return keys;
}

/**
 * Purpose: Find the result group that already owns one of a provider book's
 * duplicate keys.
 *
 * @param bookKeys - Global duplicate keys for the provider book.
 * @param globalBookOwnersByKey - Map from duplicate key to owning group key.
 * @returns Existing owning group key, or `null` when this is the first copy.
 */
function findExistingBookOwnerKey(
  bookKeys: string[],
  globalBookOwnersByKey: Map<string, string>
): string | null {
  for (const bookKey of bookKeys) {
    const existingOwnerKey = globalBookOwnersByKey.get(bookKey);
    if (existingOwnerKey) return existingOwnerKey;
  }

  return null;
}

/**
 * Purpose: Remember which provider series contributed to a merged visible
 * result group.
 *
 * @param targetGroup - Visible result group receiving merged source evidence.
 * @param sourceGroup - Original missing-book group that contributed books or
 * duplicate evidence.
 * @returns Nothing. The target group's `mergedFrom` array is updated.
 */
function rememberMergedSeriesSource(
  targetGroup: MissingBookGroup,
  sourceGroup: MissingBookGroup
): void {
  const nextSource = buildMergedSeriesSource(sourceGroup);
  const existingSources = targetGroup.mergedFrom ?? [];
  const sourceExists = existingSources.some(
    (source) => buildMergedSourceKey(source) === buildMergedSourceKey(nextSource)
  );

  targetGroup.mergedFrom = sourceExists ? existingSources : [...existingSources, nextSource];
}

/**
 * Purpose: Build display metadata for one provider series involved in a merge.
 *
 * @param group - Missing-book group before or after merging.
 * @returns Source-series metadata suitable for the result tile and drawer.
 */
function buildMergedSeriesSource(group: MissingBookGroup): MergedSeriesSource {
  return {
    seriesName: group.seriesName,
    seriesAsin: group.seriesAsin,
    providerId: group.providerId,
    providerName: group.providerName,
    missingBookCount: group.books.length,
  };
}

/**
 * Purpose: Build a stable de-duplication key for merged source metadata.
 *
 * @param source - Merged source-series metadata.
 * @returns Identifier key for comparing source entries.
 */
function buildMergedSourceKey(source: MergedSeriesSource): string {
  const seriesAsin = normaliseIdentifier(source.seriesAsin);
  if (seriesAsin && seriesAsin !== "UNKNOWN") {
    return `${source.providerId ?? "provider"}:${seriesAsin}`;
  }

  return `${source.providerId ?? "provider"}:${normaliseText(source.seriesName)}`;
}

/**
 * Purpose: Avoid adding noisy merge metadata to normal, unmerged result groups.
 *
 * @param group - Result group after merge processing.
 * @returns The same group with single-source merge metadata removed.
 */
function removeSingleSourceMergeMetadata(group: MissingBookGroup): MissingBookGroup {
  if ((group.mergedFrom?.length ?? 0) <= 1) {
    const { mergedFrom, ...groupWithoutMergeMetadata } = group;
    void mergedFrom;
    return groupWithoutMergeMetadata;
  }

  return group;
}

/**
 * Purpose: Create an empty result group ready to receive merged books.
 *
 * @param seriesName - Display name for the merged group.
 * @param seriesAsin - Provider series ASIN for the merged group.
 * @returns A missing-book group with no books and no diagnostics.
 */
function createEmptyMergedGroup(group: MissingBookGroup): MissingBookGroup {
  return {
    seriesName: group.seriesName,
    seriesAsin: group.seriesAsin,
    providerId: group.providerId,
    providerName: group.providerName,
    confidence: group.confidence,
    books: [],
    diagnosticsByAsin: {} satisfies Record<string, MissingBookDiagnostic>,
    debugDecisions: [] satisfies MissingBookDebugDecision[],
  };
}
