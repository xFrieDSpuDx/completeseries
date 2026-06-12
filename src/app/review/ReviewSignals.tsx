import type { SeriesScanReport } from "../../features/scan/seriesScanReport";

/**
 * Purpose: Display the confidence score for a match report.
 *
 * @param props - Score badge inputs.
 * @param props.score - Numeric confidence score.
 * @param props.status - Match status for visual emphasis.
 * @returns A compact score badge.
 */
export function ScoreBadge({
  score,
  status,
}: {
  score: number;
  status: SeriesScanReport["status"];
}) {
  return (
    <span className={`review-score review-score--${status}`}>
      <small>Score</small>
      {score}
    </span>
  );
}

/**
 * Purpose: Render match signal counts as compact chips.
 *
 * @param props - Signal list inputs.
 * @param props.compact - Whether to use shorter chip labels.
 * @param props.signals - Match signals from the scoring engine.
 * @returns A chip list describing the evidence used for scoring.
 */
export function SignalList({
  compact = false,
  signals,
}: {
  compact?: boolean;
  signals: SeriesScanReport["signals"];
}) {
  return (
    <ul className={`review-signal-list${compact ? " review-signal-list--compact" : ""}`}>
      {formatSignals(signals, compact).map((signal) => (
        <li key={signal}>{signal}</li>
      ))}
    </ul>
  );
}

/**
 * Purpose: Convert score signals into human-readable evidence labels.
 *
 * @param signals - Match signals from the scoring engine.
 * @param compact - Whether to use compact labels for dense candidate rows.
 * @returns Signal labels for review chips.
 */
function formatSignals(signals: SeriesScanReport["signals"], compact: boolean): string[] {
  const labels = [
    formatCountSignal(signals.asinMatches, "ASIN"),
    formatCountSignal(signals.isbnMatches, "ISBN"),
    formatCountSignal(signals.skuMatches, "SKU"),
    formatCountSignal(signals.titleMatches, compact ? "title" : "title match"),
    formatCountSignal(signals.subtitleMatches, compact ? "subtitle" : "subtitle match"),
    formatCountSignal(signals.positionMatches, compact ? "position" : "position match"),
    formatCountSignal(signals.authorMatches, compact ? "author" : "author match"),
    `${Math.round(signals.seriesNameSimilarity * 100)}% series name`,
  ].filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels : ["No scoring evidence"];
}

/**
 * Purpose: Format a count-based signal when evidence exists.
 *
 * @param count - Number of matched evidence values.
 * @param label - Signal label.
 * @returns A formatted count label, or null when the count is zero.
 */
function formatCountSignal(count: number, label: string): string | null {
  return count > 0 ? `${count} ${label}` : null;
}
