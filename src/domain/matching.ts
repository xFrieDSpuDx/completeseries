import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  MatchSignals,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  SeriesMatch,
} from "./audiobook";
import {
  normaliseIdentifier,
  normaliseIsbn,
  normaliseText,
  parseSeriesPosition,
  textSimilarity,
  valuesOverlap,
} from "./normalise";

const MATCH_THRESHOLD = 55;
const STRONG_SERIES_NAME_SIMILARITY = 0.9;

/**
 * Purpose: Choose the best provider series for a local Audiobookshelf series.
 *
 * @param localSeries - The local Audiobookshelf series and book evidence to
 * match.
 * @param candidates - Provider series candidates discovered from one or more
 * local book identifiers.
 * @returns A matched series when the best candidate clears the confidence
 * threshold; otherwise an unresolved result with the best available signals.
 */
export function matchLocalSeriesToProviderSeries(
  localSeries: LocalSeriesEvidence,
  candidates: ProviderSeriesCandidate[]
): SeriesMatch {
  const rankedMatches = rankProviderSeriesCandidates(localSeries, candidates);
  const bestMatch = rankedMatches[0];

  if (!bestMatch || !isConfidentSeriesMatch(bestMatch)) {
    return bestMatch
      ? {
          ...bestMatch,
          status: "unresolved",
          reason: "No provider series met the confidence threshold.",
        }
      : {
          status: "unresolved",
          localSeries,
          score: 0,
          reason: "No provider series met the confidence threshold.",
          signals: emptySignals(),
        };
  }

  return {
    ...bestMatch,
    status: "matched",
    reason: bestMatch.providerSeries?.manualMatch
      ? "Manual provider series override."
      : buildMatchReason(bestMatch.signals),
  };
}

/**
 * Purpose: Score every provider candidate for a local series and return the
 * candidates in strongest-first order for matching and review screens.
 *
 * @param localSeries - The local Audiobookshelf series being matched.
 * @param candidates - Provider series candidates discovered for that series.
 * @returns Scored provider matches ordered by confidence, highest first.
 */
export function rankProviderSeriesCandidates(
  localSeries: LocalSeriesEvidence,
  candidates: ProviderSeriesCandidate[]
): SeriesMatch[] {
  return candidates
    .map((candidate) => scoreCandidate(localSeries, candidate))
    .sort((first, second) => second.score - first.score);
}

/**
 * Purpose: Decide whether a scored provider candidate has enough evidence to
 * accept as the local series match.
 *
 * @param match - Best-scoring provider candidate for a local series.
 * @returns `true` when the candidate was manually selected, clears the general
 * score threshold, or has a strong identifier match pointing at a very similar
 * series name. Providers can opt out of automatic matching when their search
 * evidence is useful for review but not strong enough to prove ownership.
 */
function isConfidentSeriesMatch(match: SeriesMatch): boolean {
  if (match.providerSeries?.manualMatch) return true;
  if (match.providerSeries?.automaticMatch === false) return false;
  if (match.score >= MATCH_THRESHOLD) return true;

  return (
    hasIdentifierMatch(match.signals) &&
    match.signals.seriesNameSimilarity >= STRONG_SERIES_NAME_SIMILARITY
  );
}

/**
 * Purpose: Check whether local/provider series evidence shares at least one
 * strong catalogue identifier.
 *
 * @param signals - Match signals collected for a provider candidate.
 * @returns `true` when ASIN or SKU evidence matched.
 */
function hasIdentifierMatch(signals: MatchSignals): boolean {
  return signals.asinMatches > 0 || signals.isbnMatches > 0 || signals.skuMatches > 0;
}

/**
 * Purpose: Score one provider series candidate against one local series.
 *
 * @param localSeries - The local Audiobookshelf series being matched.
 * @param providerSeries - A single provider series candidate to evaluate.
 * @returns A series match object containing the weighted score and the signals
 * that produced it.
 */
function scoreCandidate(
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate
): SeriesMatch {
  const signals = collectSignals(localSeries, providerSeries);
  const score = Math.min(
    100,
    signals.asinMatches * 28 +
      signals.isbnMatches * 26 +
      signals.skuMatches * 24 +
      signals.titleMatches * 8 +
      signals.subtitleMatches * 4 +
      signals.positionMatches * 5 +
      signals.authorMatches * 5 +
      Math.round(signals.seriesNameSimilarity * 24)
  );

  return {
    status: "unresolved",
    localSeries,
    providerSeries,
    score,
    reason: "Candidate scored below the confidence threshold.",
    signals,
  };
}

/**
 * Purpose: Count the evidence signals shared by a local series and a provider
 * series.
 *
 * @param localSeries - The local Audiobookshelf series being matched.
 * @param providerSeries - The provider series candidate being inspected.
 * @returns Counts for ASIN, SKU, title, subtitle, position, author, and series
 * name similarity signals.
 */
function collectSignals(
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate
): MatchSignals {
  const includeSeriesPosition = providerSeries.matchingRules?.includeSeriesPosition ?? true;
  const includeSubtitle = providerSeries.matchingRules?.includeSubtitle ?? true;
  const providerBooksByAsin = new Set(
    providerSeries.books.map((book) => normaliseIdentifier(book.asin)).filter(Boolean)
  );
  const providerBooksByIsbn = new Set(
    providerSeries.books.map((book) => normaliseIsbn(book.isbn)).filter(Boolean)
  );
  const providerBooksBySku = new Set(
    providerSeries.books
      .flatMap((book) => [book.sku, book.skuGroup])
      .map(normaliseIdentifier)
      .filter(Boolean)
  );

  let asinMatches = 0;
  let isbnMatches = 0;
  let skuMatches = 0;
  let titleMatches = 0;
  let subtitleMatches = 0;
  let positionMatches = 0;
  let authorMatches = 0;

  for (const localBook of localSeries.books) {
    if (localBook.asin && providerBooksByAsin.has(normaliseIdentifier(localBook.asin))) {
      asinMatches += 1;
    }

    if (localBook.isbn && providerBooksByIsbn.has(normaliseIsbn(localBook.isbn))) {
      isbnMatches += 1;
    }

    if (localBookHasSkuMatch(localBook, providerBooksBySku)) {
      skuMatches += 1;
    }

    const providerBook = findLikelyProviderBook(localBook, providerSeries.books, {
      includeSubtitle,
    });
    if (!providerBook) continue;

    if (normaliseText(localBook.title) === normaliseText(providerBook.title)) titleMatches += 1;
    if (
      includeSubtitle &&
      localBook.subtitle &&
      providerBook.subtitle &&
      normaliseText(localBook.subtitle) === normaliseText(providerBook.subtitle)
    ) {
      subtitleMatches += 1;
    }

    if (includeSeriesPosition && hasPositionMatch(localBook, providerBook)) positionMatches += 1;
    if (valuesOverlap(localBook.authors, providerBook.authors)) authorMatches += 1;
  }

  return {
    asinMatches,
    isbnMatches,
    skuMatches,
    titleMatches,
    subtitleMatches,
    positionMatches,
    authorMatches,
    seriesNameSimilarity: textSimilarity(localSeries.name, providerSeries.name),
  };
}

/**
 * Purpose: Check whether a local book shares a SKU-style identifier with any
 * provider book in the candidate series.
 *
 * @param localBook - The local Audiobookshelf book being compared.
 * @param providerBooksBySku - Normalised provider `sku` and `skuGroup` values.
 * @returns `true` when the local book has at least one SKU value in the provider
 * index.
 */
function localBookHasSkuMatch(
  localBook: LocalBookEvidence,
  providerBooksBySku: Set<string>
): boolean {
  const localSkuValues = [localBook.sku, localBook.skuGroup]
    .map(normaliseIdentifier)
    .filter(Boolean);
  return localSkuValues.some((skuValue) => providerBooksBySku.has(skuValue));
}

/**
 * Purpose: Find the provider book that most likely represents the same title as
 * a local book.
 *
 * @param localBook - The local Audiobookshelf book to compare.
 * @param providerBooks - Provider books from a candidate series.
 * @param options - Matching controls supplied by the provider candidate.
 * @returns The first provider book with a matching title and compatible
 * subtitle, or `null` when no likely match exists.
 */
function findLikelyProviderBook(
  localBook: LocalBookEvidence,
  providerBooks: ProviderSeriesBook[],
  options: { includeSubtitle: boolean }
): ProviderSeriesBook | null {
  const localTitle = normaliseText(localBook.title);
  const localSubtitle = normaliseText(localBook.subtitle);

  return (
    providerBooks.find((providerBook) => {
      const titleMatches = normaliseText(providerBook.title) === localTitle;
      const subtitleMatches =
        !options.includeSubtitle ||
        !localSubtitle ||
        normaliseText(providerBook.subtitle) === localSubtitle;
      return titleMatches && subtitleMatches;
    }) ?? null
  );
}

/**
 * Purpose: Compare local and provider series-position metadata for one book.
 *
 * @param localBook - The local Audiobookshelf book with parsed position
 * evidence.
 * @param providerBook - The provider book whose series entries contain
 * position metadata.
 * @returns `true` when either numeric or raw text positions match.
 */
function hasPositionMatch(localBook: LocalBookEvidence, providerBook: ProviderSeriesBook): boolean {
  if (localBook.position.numeric === null && localBook.position.raw === null) return false;

  return providerBook.series.some((seriesEntry) => {
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
 * Purpose: Turn match signals into a short human-readable explanation.
 *
 * @param signals - The evidence counts collected for the winning candidate.
 * @returns A concise explanation of why the match was accepted.
 */
function buildMatchReason(signals: MatchSignals): string {
  const reasons = [];
  if (signals.asinMatches > 0) reasons.push(`${signals.asinMatches} ASIN match`);
  if (signals.isbnMatches > 0) reasons.push(`${signals.isbnMatches} ISBN match`);
  if (signals.skuMatches > 0) reasons.push(`${signals.skuMatches} SKU match`);
  if (signals.titleMatches > 0) reasons.push(`${signals.titleMatches} title match`);
  if (signals.positionMatches > 0) reasons.push(`${signals.positionMatches} position match`);
  if (signals.authorMatches > 0) reasons.push(`${signals.authorMatches} author match`);
  if (signals.seriesNameSimilarity >= 0.95) reasons.push("exact series name match");
  else if (signals.seriesNameSimilarity >= STRONG_SERIES_NAME_SIMILARITY) {
    reasons.push("close series name match");
  }

  return reasons.length > 0 ? reasons.join(", ") : "Matched by series name similarity.";
}

/**
 * Purpose: Provide a zero-value signal object when no provider candidate is
 * available.
 *
 * @returns A match signal record with every signal set to zero.
 */
function emptySignals(): MatchSignals {
  return {
    asinMatches: 0,
    isbnMatches: 0,
    skuMatches: 0,
    titleMatches: 0,
    subtitleMatches: 0,
    positionMatches: 0,
    authorMatches: 0,
    seriesNameSimilarity: 0,
  };
}
