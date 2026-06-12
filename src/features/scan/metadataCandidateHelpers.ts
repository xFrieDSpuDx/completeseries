import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "../../domain/audiobook";
import { normaliseIdentifier, normaliseIsbn, textSimilarity } from "../../domain/normalise";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";

/**
 * Purpose: Select the most relevant provider series entries from a looked-up
 * book.
 *
 * @param seriesEntries - Series memberships returned for a provider book.
 * @param localSeries - Local Audiobookshelf series currently being matched.
 * @param includeSubSeries - Whether all provider series memberships should be
 * considered.
 * @returns Either all series entries or the single entry whose name is closest
 * to the local series name.
 */
export function selectProviderSeriesEntries(
  seriesEntries: ProviderSeriesBook["series"],
  localSeries: LocalSeriesEvidence,
  includeSubSeries: boolean
): ProviderSeriesBook["series"] {
  if (includeSubSeries) return seriesEntries;

  return [...seriesEntries]
    .sort(
      (first, second) =>
        textSimilarity(localSeries.name, second.name) - textSimilarity(localSeries.name, first.name)
    )
    .slice(0, 1);
}

/**
 * Purpose: Add provider candidates to a target list without duplicating series
 * ASINs.
 *
 * @param target - Candidate list being built for the current local series.
 * @param candidates - New provider candidates to append.
 * @returns Nothing. The target list is updated in place.
 */
export function appendUniqueCandidates(
  target: ProviderSeriesCandidate[],
  candidates: ProviderSeriesCandidate[]
): void {
  const existingSeriesAsins = new Set(
    target.map((candidate) => getProviderCandidateKey(candidate))
  );

  for (const candidate of candidates) {
    const seriesKey = getProviderCandidateKey(candidate);
    if (existingSeriesAsins.has(seriesKey)) continue;

    target.push(candidate);
    existingSeriesAsins.add(seriesKey);
  }
}

/**
 * Purpose: Attach provider identity to a candidate without requiring every
 * provider implementation to remember the same bookkeeping fields.
 *
 * @param candidate - Provider series candidate returned by one provider.
 * @param metadataProvider - Provider that returned the candidate.
 * @param manualSeriesAsins - Manual-match provider series ASINs for this scan.
 * @returns The candidate tagged with provider id and display name.
 */
export function tagProviderCandidate(
  candidate: ProviderSeriesCandidate,
  metadataProvider: MetadataProvider,
  manualSeriesKeys = new Set<string>()
): ProviderSeriesCandidate {
  return {
    ...candidate,
    manualMatch:
      candidate.manualMatch ||
      manualSeriesKeys.has(candidate.seriesAsin.trim()) ||
      manualSeriesKeys.has(normaliseIdentifier(candidate.seriesAsin)),
    providerId: candidate.providerId ?? metadataProvider.id,
    providerName: candidate.providerName ?? metadataProvider.displayName,
    evidenceLevel: candidate.evidenceLevel ?? metadataProvider.evidenceLevel,
  };
}

/**
 * Purpose: Extract unique known author names from local Audiobookshelf books.
 *
 * @param books - Local books from a single Audiobookshelf series.
 * @returns Unique author names for metadata-provider search fallback.
 */
export function getKnownAuthorNames(books: LocalBookEvidence[]): string[] {
  return [...new Set(books.flatMap((book) => book.authors).filter(Boolean))];
}

/**
 * Purpose: Extract unique local ISBN values from Audiobookshelf books.
 *
 * @param books - Local books from a single Audiobookshelf series.
 * @returns Unique ISBN values for metadata-provider search fallback.
 */
export function getKnownIsbns(books: LocalBookEvidence[]): string[] {
  return [
    ...new Set(books.map((book) => normaliseIsbn(book.isbn)).filter(Boolean)),
  ];
}

/**
 * Purpose: Build a de-duplication key that keeps future providers separate
 * even when they use the same external series identifier.
 *
 * @param candidate - Candidate being compared against existing results.
 * @returns Provider-aware candidate key.
 */
function getProviderCandidateKey(candidate: ProviderSeriesCandidate): string {
  return `${candidate.providerId ?? "unknown"}:${normaliseIdentifier(candidate.seriesAsin)}`;
}
