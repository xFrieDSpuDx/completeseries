import type { LocalSeriesEvidence, SeriesMatch } from "../../domain/audiobook";
import type { MissingBookGroup } from "../../domain/missingBooks";
import type { MissingBookDebugDecision } from "../../domain/missingBookTypes";
import {
  buildAsinLookupAnchors,
  type MetadataLookupAnchor,
} from "./lookupAnchors";
import type { ProviderDiscoveryTrace } from "./providerDiscoveryTrace";

export type SeriesScanReport = {
  localSeries: LocalSeriesEvidence;
  attemptedAsins: string[];
  lookupAnchors: MetadataLookupAnchor[];
  providerTraces: ProviderDiscoveryTrace[];
  status: "matched" | "unresolved";
  reason: string;
  score: number;
  signals: SeriesMatch["signals"];
  providerSeries?: {
    seriesAsin: string;
    name: string;
    providerId?: string;
    providerName?: string;
    bookCount: number;
  };
  candidateMatches: SeriesCandidateReview[];
  missingBookCount: number;
  debugDecisions: MissingBookDebugDecision[];
};

export type SeriesCandidateReview = {
  seriesAsin: string;
  name: string;
  providerId?: string;
  providerName?: string;
  bookCount: number;
  score: number;
  reason: string;
  signals: SeriesMatch["signals"];
  accepted: boolean;
  evidenceLevel?: string;
};

/**
 * Purpose: Build the scan report for a matched series, including diagnostic
 * decisions even when no missing books remain after filters.
 *
 * @param match - Accepted provider/local series match.
 * @param attemptedAsins - Local ASIN anchors tried during legacy Audible-style
 * discovery.
 * @param missingGroup - Missing-book result produced for the matched series.
 * @param candidateMatches - Scored provider candidates for review.
 * @param lookupAnchors - Provider-neutral lookup anchors used during
 * discovery.
 * @returns A report row for debug and review views.
 */
export function buildMatchedSeriesReport(
  match: SeriesMatch,
  attemptedAsins: string[],
  missingGroup: MissingBookGroup,
  candidateMatches: SeriesMatch[] = [],
  lookupAnchors: MetadataLookupAnchor[] = buildAsinLookupAnchors(attemptedAsins),
  providerTraces: ProviderDiscoveryTrace[] = []
): SeriesScanReport {
  return {
    localSeries: match.localSeries,
    attemptedAsins,
    lookupAnchors,
    providerTraces,
    status: "matched",
    reason: match.reason,
    score: match.score,
    signals: match.signals,
    providerSeries: match.providerSeries
      ? {
          seriesAsin: match.providerSeries.seriesAsin,
          name: match.providerSeries.name,
          providerId: match.providerSeries.providerId,
          providerName: match.providerSeries.providerName,
          bookCount: match.providerSeries.books.length,
        }
      : undefined,
    candidateMatches: summarizeCandidateMatches(candidateMatches, match),
    missingBookCount: missingGroup.books.length,
    debugDecisions: missingGroup.debugDecisions,
  };
}

/**
 * Purpose: Build the scan report for a series that did not confidently match a
 * provider series.
 *
 * @param match - Unresolved match result from the matching engine.
 * @param attemptedAsins - Local ASIN anchors tried during legacy Audible-style
 * discovery.
 * @param candidateMatches - Scored provider candidates for review.
 * @param lookupAnchors - Provider-neutral lookup anchors used during
 * discovery.
 * @returns A report row for debug and review views.
 */
export function buildUnresolvedSeriesReport(
  match: SeriesMatch,
  attemptedAsins: string[],
  candidateMatches: SeriesMatch[] = [],
  lookupAnchors: MetadataLookupAnchor[] = buildAsinLookupAnchors(attemptedAsins),
  providerTraces: ProviderDiscoveryTrace[] = []
): SeriesScanReport {
  return {
    localSeries: match.localSeries,
    attemptedAsins,
    lookupAnchors,
    providerTraces,
    status: "unresolved",
    reason: match.reason,
    score: match.score,
    signals: match.signals,
    providerSeries: match.providerSeries
      ? {
          seriesAsin: match.providerSeries.seriesAsin,
          name: match.providerSeries.name,
          providerId: match.providerSeries.providerId,
          providerName: match.providerSeries.providerName,
          bookCount: match.providerSeries.books.length,
        }
      : undefined,
    candidateMatches: summarizeCandidateMatches(candidateMatches, match),
    missingBookCount: 0,
    debugDecisions: [],
  };
}

/**
 * Purpose: Convert full scored matches into compact review rows suitable for
 * scan reports and exports.
 *
 * @param candidateMatches - Scored provider candidates from the matching
 * engine.
 * @param acceptedMatch - Final matching decision for the local series.
 * @returns Candidate summaries with the accepted match marked when one exists.
 */
function summarizeCandidateMatches(
  candidateMatches: SeriesMatch[],
  acceptedMatch: SeriesMatch
): SeriesCandidateReview[] {
  const acceptedKey =
    acceptedMatch.status === "matched" && acceptedMatch.providerSeries
      ? getProviderCandidateKey(acceptedMatch.providerSeries)
      : null;

  return candidateMatches
    .filter(
      (
        candidate
      ): candidate is SeriesMatch & {
        providerSeries: NonNullable<SeriesMatch["providerSeries"]>;
      } => Boolean(candidate.providerSeries)
    )
    .map((candidate) => ({
      seriesAsin: candidate.providerSeries.seriesAsin,
      name: candidate.providerSeries.name,
      providerId: candidate.providerSeries.providerId,
      providerName: candidate.providerSeries.providerName,
      bookCount: candidate.providerSeries.books.length,
      score: candidate.score,
      reason: candidate.reason,
      signals: candidate.signals,
      accepted: acceptedKey === getProviderCandidateKey(candidate.providerSeries),
      evidenceLevel: candidate.providerSeries.evidenceLevel,
    }));
}

/**
 * Purpose: Build a stable key for comparing provider candidates from the same
 * or future alternate metadata providers.
 *
 * @param candidate - Provider series candidate summary.
 * @returns Provider-aware candidate key.
 */
function getProviderCandidateKey(candidate: {
  providerId?: string;
  seriesAsin: string;
}): string {
  return `${candidate.providerId ?? "unknown"}:${candidate.seriesAsin}`;
}
