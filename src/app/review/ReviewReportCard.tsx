import type { RegionCode } from "../../domain/audiobook";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import type { SeriesScanReport } from "../../features/scan/seriesScanReport";
import {
  CandidateList,
  formatLookupAnchors,
  LocalBookList,
  LookupAnchors,
  ProviderTraceList,
} from "./ReviewEvidenceBlocks";
import { ScoreBadge, SignalList } from "./ReviewSignals";

type ReviewReportCardProps = {
  compact?: boolean;
  onManualMatchSaved?: (message: string, localSeriesId?: string) => void;
  onSaveManualSeriesMatch?: (match: ManualSeriesMatch) => void;
  region?: RegionCode;
  report: SeriesScanReport;
};

/**
 * Purpose: Render one series review record with local evidence, match signals,
 * and provider candidates.
 *
 * @param props - Review card inputs.
 * @param props.compact - Whether to hide local book details until the card is
 * opened.
 * @param props.onManualMatchSaved - Callback receiving a short confirmation
 * and local series id after a provider-series override is saved.
 * @param props.onSaveManualSeriesMatch - Optional callback that saves a
 * provider-series override.
 * @param props.region - Region used by the completed scan.
 * @param props.report - Series scan report to render.
 * @returns A review card for one local series.
 */
export function ReviewReportCard({
  compact = false,
  onManualMatchSaved,
  onSaveManualSeriesMatch,
  region,
  report,
}: ReviewReportCardProps) {
  const bestCandidate = report.candidateMatches[0];

  return (
    <article className="review-card">
      <header className="review-card__header">
        <div>
          <h3>{report.localSeries.name}</h3>
          <p>{report.reason}</p>
        </div>
        <ScoreBadge score={report.score} status={report.status} />
      </header>

      <div className="review-meta">
        <span>{formatLocalBookCount(report.localSeries.books.length)}</span>
        <span>{formatLookupAnchors(report.lookupAnchors)}</span>
        {report.status === "matched" && report.providerSeries ? (
          <span>
            Matched provider: {report.providerSeries.name} ({report.providerSeries.bookCount})
          </span>
        ) : bestCandidate ? (
          <span>
            Best candidate: {bestCandidate.name} ({bestCandidate.bookCount})
          </span>
        ) : (
          <span>No provider series candidates</span>
        )}
      </div>

      <SignalList signals={report.signals} />

      <details className="review-details" open={!compact && report.status === "unresolved"}>
        <summary
          aria-label={`Match evidence for ${report.localSeries.name}`}
          className="review-details__summary"
        >
          <span>
            <strong>Match evidence</strong>
            <small>{report.localSeries.name}</small>
          </span>
          <span className="review-details__state" aria-hidden="true" />
        </summary>
        <div className="review-details__grid">
          <LookupAnchors lookupAnchors={report.lookupAnchors} />
          <ProviderTraceList providerTraces={report.providerTraces} />
          <LocalBookList books={report.localSeries.books} />
          <CandidateList
            candidates={report.candidateMatches}
            onManualMatchSaved={onManualMatchSaved}
            onSaveManualSeriesMatch={onSaveManualSeriesMatch}
            region={region}
            report={report}
          />
        </div>
      </details>
    </article>
  );
}

/**
 * Purpose: Format local book counts with correct singular/plural wording.
 *
 * @param count - Number of local books in the Audiobookshelf series.
 * @returns Human-readable local book count.
 */
function formatLocalBookCount(count: number): string {
  return `${count} local book${count === 1 ? "" : "s"}`;
}
