import type { LocalBookEvidence, SeriesMatch } from "../../domain/audiobook";
import { findMissingBooksForSeries, type MissingBookGroup } from "../../domain/missingBooks";
import type { ScanOptions } from "./runLibraryScan";

const LOW_CONFIDENCE_RESULT_MIN_SCORE = 35;

/**
 * Purpose: Build an optional review-only missing-book group from the strongest
 * unresolved provider candidate. This gives users a deliberate way to inspect
 * less confident matches without changing the scan's trusted matched count.
 *
 * @param candidateMatches - Ranked provider candidates for one unresolved
 * local series.
 * @param allLocalBooks - Local ownership evidence used to filter owned books
 * out of the tentative result.
 * @param options - Current scan filters.
 * @returns A tentative missing-book group with confidence metadata, or `null`
 * when no candidate is strong enough or no missing books survive the filters.
 */
export function buildLowConfidenceMissingGroup(
  candidateMatches: SeriesMatch[],
  allLocalBooks: LocalBookEvidence[],
  options: ScanOptions
): MissingBookGroup | null {
  for (const candidateMatch of candidateMatches) {
    if (!candidateMatch.providerSeries) continue;
    if (!shouldSurfaceLowConfidenceCandidate(candidateMatch)) continue;

    const missingGroup = buildMissingGroup(candidateMatch, allLocalBooks, options);
    if (missingGroup.books.length === 0) continue;

    return {
      ...missingGroup,
      confidence: {
        score: candidateMatch.score,
        label: buildLowConfidenceLabel(candidateMatch),
        reason: candidateMatch.reason,
      },
    };
  }

  return null;
}

/**
 * Purpose: Convert a confident provider match into the missing-book group shown
 * in the scan results.
 *
 * @param match - The matched local/provider series pair and its confidence
 * signals.
 * @param allLocalBooks - Every local Audiobookshelf book from the scanned
 * libraries, used to avoid reporting books already owned in another series.
 * @param options - Scan filters that decide which provider books should count
 * as missing.
 * @returns A missing-book group for one provider series. If no provider series
 * is attached to the match, an empty placeholder group is returned.
 */
export function buildMissingGroup(
  match: SeriesMatch,
  allLocalBooks: LocalBookEvidence[],
  options: ScanOptions
): MissingBookGroup {
  if (!match.providerSeries) {
    return {
      seriesName: match.localSeries.name,
      seriesAsin: "unknown",
      books: [],
      diagnosticsByAsin: {},
      debugDecisions: [],
    };
  }

  return findMissingBooksForSeries(match.localSeries, match.providerSeries, allLocalBooks, {
    region: options.region,
    onlyUnabridged: options.onlyUnabridged,
    ignoreMultiBooks: options.ignoreMultiBooks,
    ignoreNoPositionBooks: options.ignoreNoPositionBooks,
    ignoreSubPositionBooks: options.ignoreSubPositionBooks,
    ignoreFutureDateBooks: options.ignoreFutureDateBooks,
    ignoreFuturePlaceholders: options.ignoreFuturePlaceholders,
    ignorePastDateBooks: options.ignorePastDateBooks,
    ignoreTitleSubtitle: options.ignoreTitleSubtitle,
    ignoreSameSeriesPosition: options.ignoreSameSeriesPosition,
    ignoreTitleSubtitleInMissingArray: options.ignoreTitleSubtitleInMissingArray,
    ignoreSameSeriesPositionInMissingArray: options.ignoreSameSeriesPositionInMissingArray,
    matchNarratorEditions: options.matchNarratorEditions,
    manualBookMatches: options.manualBookMatches,
  });
}

/**
 * Purpose: Decide whether an unresolved provider candidate is useful enough to
 * surface behind the explicit low-confidence results toggle.
 *
 * @param candidateMatch - Scored candidate from the matching engine.
 * @returns `true` when the candidate has meaningful evidence but was not
 * accepted as a normal match.
 */
function shouldSurfaceLowConfidenceCandidate(candidateMatch: SeriesMatch): boolean {
  return candidateMatch.score >= LOW_CONFIDENCE_RESULT_MIN_SCORE;
}

/**
 * Purpose: Create a compact confidence label for tentative result cards.
 *
 * @param candidateMatch - Scored candidate being exposed as a tentative group.
 * @returns User-facing confidence label.
 */
function buildLowConfidenceLabel(candidateMatch: SeriesMatch): string {
  return candidateMatch.score >= 55 ? "Review-only confidence" : "Low confidence";
}
