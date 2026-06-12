import type { LocalBookEvidence, RegionCode } from "../../domain/audiobook";
import type { ManualSeriesMatch } from "../../features/scan/manualSeriesMatches";
import {
  formatLookupAnchor,
  type MetadataLookupAnchor,
} from "../../features/scan/lookupAnchors";
import type {
  SeriesCandidateReview,
  SeriesScanReport,
} from "../../features/scan/seriesScanReport";
import type { ProviderDiscoveryTrace } from "../../features/scan/providerDiscoveryTrace";
import { EmptyState } from "../../shared/EmptyState";
import { buildManualSeriesMatch, canSaveManualMatch } from "./manualSeriesMatchBuilder";
import {
  formatBookIdentifiers,
  formatBookPosition,
  formatBookTitle,
  formatEvidenceLevel,
  formatProviderName,
  formatProviderStep,
} from "./reviewEvidenceFormatters";
import { ScoreBadge, SignalList } from "./ReviewSignals";

/**
 * Purpose: Render scored provider candidates for one local series.
 *
 * @param props - Candidate list inputs.
 * @param props.candidates - Provider series candidates scored by the matching
 * engine.
 * @param props.onManualMatchSaved - Callback receiving a short confirmation
 * and local series id after a provider-series override is saved.
 * @param props.onSaveManualSeriesMatch - Optional callback that saves a
 * provider-series override.
 * @param props.region - Region used by the completed scan.
 * @param props.report - Series report that owns these candidates.
 * @returns Candidate cards, or an empty state when no provider candidates were
 * found.
 */
export function CandidateList({
  candidates,
  onManualMatchSaved,
  onSaveManualSeriesMatch,
  region,
  report,
}: {
  candidates: SeriesCandidateReview[];
  onManualMatchSaved?: (message: string, localSeriesId?: string) => void;
  onSaveManualSeriesMatch?: (match: ManualSeriesMatch) => void;
  region?: RegionCode;
  report: SeriesScanReport;
}) {
  if (candidates.length === 0) {
    return (
      <section className="review-evidence-block">
        <h4>Provider series candidates</h4>
        <EmptyState compact title="No provider series candidates">
          The provider search did not return a usable series for this local series.
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="review-evidence-block">
      <h4>Provider series candidates</h4>
      <ul className="review-candidate-list">
        {candidates.map((candidate) => (
          <li key={`${candidate.providerId ?? "provider"}-${candidate.seriesAsin}`}>
            <div className="review-candidate-list__title">
              <strong>{candidate.name}</strong>
              <ScoreBadge
                score={candidate.score}
                status={candidate.accepted ? "matched" : "unresolved"}
              />
            </div>
            <span>
              {formatProviderName(candidate)} · {formatEvidenceLevel(candidate.evidenceLevel)} ·{" "}
              {candidate.bookCount} provider books · {candidate.seriesAsin}
            </span>
            <SignalList signals={candidate.signals} compact />
            {canSaveManualMatch(report, candidate, region, onSaveManualSeriesMatch) ? (
              <button
                className="button-secondary review-candidate-list__action"
                type="button"
                onClick={() => {
                  onSaveManualSeriesMatch(buildManualSeriesMatch(report, candidate, region));
                  onManualMatchSaved?.(
                    `Provider series saved for ${report.localSeries.name}. It has been removed from review and will be applied on the next scan.`,
                    report.localSeries.id
                  );
                }}
              >
                Use this provider series
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Purpose: Render local books that contributed matching evidence.
 *
 * @param props - Local book list inputs.
 * @param props.books - Local books from the Audiobookshelf series.
 * @returns A compact list of local title, position, and identifier evidence.
 */
export function LocalBookList({ books }: { books: LocalBookEvidence[] }) {
  return (
    <section className="review-evidence-block">
      <h4>Local books</h4>
      <ul className="review-local-books">
        {books.map((book) => (
          <li key={book.id}>
            <strong>{formatBookTitle(book)}</strong>
            <span>
              {formatBookPosition(book)} · {formatBookIdentifiers(book)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Purpose: Render the lookup anchors used during provider discovery.
 *
 * @param props - Lookup-anchor inputs.
 * @param props.lookupAnchors - Provider-neutral anchors tried for this series.
 * @returns A chip list of lookup anchors, or an empty state.
 */
export function LookupAnchors({ lookupAnchors }: { lookupAnchors: MetadataLookupAnchor[] }) {
  return (
    <section className="review-evidence-block">
      <h4>Lookup anchors</h4>
      {lookupAnchors.length > 0 ? (
        <ul className="review-chip-list">
          {lookupAnchors.map((anchor) => (
            <li key={`${anchor.kind}-${anchor.value}`}>{formatLookupAnchor(anchor)}</li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="No lookup anchors">
          This local series did not have provider lookup anchors available.
        </EmptyState>
      )}
    </section>
  );
}

/**
 * Purpose: Render provider discovery steps so Review can explain which
 * metadata providers were queried and what each provider returned.
 *
 * @param props - Provider trace inputs.
 * @param props.providerTraces - Per-provider discovery traces from the scan.
 * @returns Compact provider trace cards, or an empty state when none were
 * captured.
 */
export function ProviderTraceList({
  providerTraces,
}: {
  providerTraces: ProviderDiscoveryTrace[];
}) {
  return (
    <section className="review-evidence-block">
      <h4>Provider checks</h4>
      {providerTraces.length > 0 ? (
        <ul className="review-provider-trace-list">
          {providerTraces.map((trace) => (
            <li key={trace.providerId}>
              <strong>
                {trace.providerName} · {formatEvidenceLevel(trace.evidenceLevel)}
              </strong>
              <ul className="review-chip-list review-chip-list--compact">
                {trace.steps.map((step) => (
                  <li key={`${trace.providerId}-${step.label}-${step.status}`}>
                    {step.label}: {formatProviderStep(step)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="No provider checks">
          This scan did not capture provider discovery details.
        </EmptyState>
      )}
    </section>
  );
}

export { formatLookupAnchors } from "./reviewEvidenceFormatters";
