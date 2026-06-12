import type { LocalBookEvidence, ProviderSeriesBook } from "../../domain/audiobook";
import {
  normaliseIdentifier,
  normaliseText,
  parseSeriesPosition,
  textSimilarity,
  valuesOverlap,
} from "../../domain/normalise";
import type { MetadataDiscoveryOptions } from "./metadataDiscovery";
import { getMetadataProvidersById } from "../../integrations/metadata/metadataProviderRegistry";

/**
 * Purpose: Look up the provider's canonical metadata for local books that
 * already have ASINs, then turn those provider records into extra local
 * ownership evidence.
 *
 * @param localBooks - Local Audiobookshelf books from the series currently
 * being checked, or from the wider scanned library.
 * @param options - Scan settings that control region and provider cache usage.
 * @param progress - Optional callback for fine-grained provider lookup status.
 * @param candidateBooks - Optional missing-provider candidates used to narrow
 * which local ASINs are worth enriching.
 * @returns Local book evidence enriched with provider title, subtitle,
 * contributor, SKU, and series-membership metadata. Failed ASIN lookups are
 * skipped so unavailable country records do not stop the scan.
 */
export async function enrichLocalBooksWithProviderMetadata(
  localBooks: LocalBookEvidence[],
  options: MetadataDiscoveryOptions,
  progress?: (message: string) => void,
  candidateBooks: ProviderSeriesBook[] = []
): Promise<LocalBookEvidence[]> {
  const localBooksByAsin = new Map<string, LocalBookEvidence>();

  for (const localBook of selectLocalBooksForEnrichment(localBooks, candidateBooks)) {
    const asin = normaliseIdentifier(localBook.asin);
    if (!asin || asin === "UNKNOWN ASIN" || localBooksByAsin.has(asin)) continue;
    localBooksByAsin.set(asin, localBook);
  }

  const booksWithAsins = [...localBooksByAsin.values()];
  const enrichedBooks: LocalBookEvidence[] = [];

  for (let bookIndex = 0; bookIndex < booksWithAsins.length; bookIndex += 1) {
    const localBook = booksWithAsins[bookIndex];
    progress?.(`checking owned ASIN metadata ${bookIndex + 1} / ${booksWithAsins.length}`);

    const providerBook = await getProviderBookForLocalAsin(localBook, options);
    if (providerBook) enrichedBooks.push(mapProviderBookToLocalEvidence(providerBook, localBook));
  }

  return enrichedBooks;
}

/**
 * Purpose: Keep owned-ASIN enrichment focused on local books that could explain
 * one of the currently visible missing-provider candidates.
 *
 * @param localBooks - Local Audiobookshelf books available for ownership
 * enrichment.
 * @param candidateBooks - Provider books currently being shown as missing.
 * @returns Local books worth looking up by ASIN.
 */
function selectLocalBooksForEnrichment(
  localBooks: LocalBookEvidence[],
  candidateBooks: ProviderSeriesBook[]
): LocalBookEvidence[] {
  if (candidateBooks.length === 0) return localBooks;

  return localBooks.filter((localBook) =>
    candidateBooks.some((candidateBook) => couldLocalBookExplainCandidate(localBook, candidateBook))
  );
}

/**
 * Purpose: Decide whether a local book is close enough to a visible missing
 * provider candidate to justify one provider ASIN lookup.
 *
 * @param localBook - Local Audiobookshelf book being considered for enrichment.
 * @param candidateBook - Provider book currently shown as missing.
 * @returns `true` when title, author, series, or position evidence suggests
 * this local ASIN could be the owned edition of the visible candidate.
 */
function couldLocalBookExplainCandidate(
  localBook: LocalBookEvidence,
  candidateBook: ProviderSeriesBook
): boolean {
  const hasRelatedTitle = textSimilarity(localBook.title, candidateBook.title) >= 0.5;
  const hasRelatedAuthor = valuesOverlap(localBook.authors, candidateBook.authors);
  const hasRelatedSeries = valuesOverlap(
    localBook.seriesNames ?? [],
    candidateBook.series.map((seriesEntry) => seriesEntry.name)
  );
  const hasRelatedPosition = hasAnySeriesPositionOverlap(localBook, candidateBook);

  if (hasRelatedTitle && (hasRelatedAuthor || hasRelatedSeries)) return true;
  return hasRelatedPosition && (hasRelatedAuthor || hasRelatedSeries || hasRelatedTitle);
}

/**
 * Purpose: Check local series-position evidence against every provider series
 * membership on a candidate book, which matters for crossover titles.
 *
 * @param localBook - Local Audiobookshelf book with parsed position evidence.
 * @param candidateBook - Provider book whose series entries may include several
 * positions.
 * @returns `true` when any local and provider position value matches.
 */
function hasAnySeriesPositionOverlap(
  localBook: LocalBookEvidence,
  candidateBook: ProviderSeriesBook
): boolean {
  if (localBook.position.numeric === null && localBook.position.raw === null) return false;

  return candidateBook.series.some((seriesEntry) => {
    const providerPosition = parseSeriesPosition(seriesEntry.position);

    if (
      localBook.position.numeric !== null &&
      providerPosition.numeric !== null &&
      localBook.position.numeric === providerPosition.numeric
    ) {
      return true;
    }

    return (
      localBook.position.raw !== null &&
      providerPosition.raw !== null &&
      normaliseText(localBook.position.raw) === normaliseText(providerPosition.raw)
    );
  });
}

/**
 * Purpose: Fetch the provider metadata for one local ASIN from the configured
 * metadata providers.
 *
 * @param localBook - Local Audiobookshelf book containing the ASIN to look up.
 * @param options - Scan settings that control region and provider cache usage.
 * @returns Provider book metadata for the local ASIN, or `null` when no
 * provider can return it.
 */
async function getProviderBookForLocalAsin(
  localBook: LocalBookEvidence,
  options: MetadataDiscoveryOptions
): Promise<ProviderSeriesBook | null> {
  const asin = localBook.asin?.trim();
  if (!asin || asin === "Unknown ASIN") return null;

  for (const metadataProvider of getMetadataProvidersById(options.metadataProviderIds)) {
    try {
      const providerBook = await metadataProvider.getBookByAsin({
        asin,
        region: options.region,
        cache: options.cacheMetadata,
      });

      if (providerBook) return providerBook;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Purpose: Convert provider metadata for an owned ASIN into local ownership
 * evidence without losing the original Audiobookshelf record identity.
 *
 * @param providerBook - Provider metadata returned for an owned local ASIN.
 * @param localBook - Original Audiobookshelf book record.
 * @returns Local book evidence with provider-canonical matching fields.
 */
function mapProviderBookToLocalEvidence(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): LocalBookEvidence {
  return {
    id: `${localBook.id}:provider:${providerBook.asin}`,
    title: providerBook.title,
    subtitle: providerBook.subtitle ?? localBook.subtitle,
    asin: providerBook.asin || localBook.asin,
    isbn: providerBook.isbn ?? localBook.isbn,
    sku: providerBook.sku ?? localBook.sku,
    skuGroup: providerBook.skuGroup ?? localBook.skuGroup,
    authors: providerBook.authors.length > 0 ? providerBook.authors : localBook.authors,
    narrators: providerBook.narrators.length > 0 ? providerBook.narrators : localBook.narrators,
    genres:
      providerBook.genres && providerBook.genres.length > 0 ? providerBook.genres : localBook.genres,
    publisher: providerBook.publisher ?? localBook.publisher,
    publishedDate: localBook.publishedDate,
    releaseDate: providerBook.releaseDate ?? localBook.releaseDate,
    seriesNames: uniqueTextValues([
      ...(localBook.seriesNames ?? []),
      ...providerBook.series.map((seriesEntry) => seriesEntry.name),
    ]),
    position: localBook.position,
  };
}

/**
 * Purpose: Remove repeated text values while keeping their first visible form.
 *
 * @param values - Text values that may be repeated with different casing or
 * spacing.
 * @returns Unique visible values.
 */
function uniqueTextValues(values: Array<string | null | undefined>): string[] {
  const seenValues = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    const normalisedValue = normaliseText(value);
    if (!value || !normalisedValue || seenValues.has(normalisedValue)) continue;

    uniqueValues.push(value);
    seenValues.add(normalisedValue);
  }

  return uniqueValues;
}
