import { useEffect, useState, type ReactNode } from "react";
import type { RegionCode } from "../../domain/audiobook";
import type { ManualSeriesMatch, ScanResult } from "../../features/scan/runLibraryScan";
import type { SeriesScanReport } from "../../features/scan/seriesScanReport";
import { EmptyState } from "../../shared/EmptyState";
import { ReviewReportCard } from "./ReviewReportCard";

/**
 * Purpose: Render unresolved and suspiciously complete series so users can
 * review provider matching decisions after a scan.
 *
 * @param props - Review panel inputs.
 * @param props.onRescan - Optional callback for applying saved series overrides
 * immediately.
 * @param props.onSaveManualSeriesMatch - Optional callback that saves a
 * provider-series override.
 * @param props.region - Region used by the completed scan.
 * @param props.result - Completed scan result with per-series reports.
 * @returns A review panel with unresolved, missing, and complete-match details.
 */
export function ReviewPanel({
  onRescan,
  onSaveManualSeriesMatch,
  region,
  result,
}: {
  onRescan?: () => void;
  onSaveManualSeriesMatch?: (match: ManualSeriesMatch) => void;
  region?: RegionCode;
  result: ScanResult;
}) {
  const [manualMatchMessage, setManualMatchMessage] = useState("");
  const [handledManualMatchSeriesIds, setHandledManualMatchSeriesIds] = useState<Set<string>>(
    () => new Set()
  );
  const unresolvedReports = getVisibleUnresolvedReports(
    result.seriesReports,
    handledManualMatchSeriesIds
  );
  const missingReports = result.seriesReports.filter(
    (report) => report.status === "matched" && report.missingBookCount > 0
  );
  const completeReports = result.seriesReports.filter(
    (report) => report.status === "matched" && report.missingBookCount === 0
  );
  const mergedResultGroupCount = Math.max(0, missingReports.length - result.missingGroups.length);

  useEffect(() => {
    setHandledManualMatchSeriesIds(new Set());
    setManualMatchMessage("");
  }, [result]);

  /**
   * Purpose: Mark a manually selected provider candidate as handled in the
   * current review panel so the user's click has immediate visible effect.
   *
   * @param message - Confirmation text shown above the review sections.
   * @param localSeriesId - Local series id to remove from Needs review.
   * @returns Nothing. Component state is updated.
   */
  function handleManualMatchSaved(message: string, localSeriesId?: string): void {
    setManualMatchMessage(message);
    if (!localSeriesId) return;

    setHandledManualMatchSeriesIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(localSeriesId);

      return nextIds;
    });
  }

  return (
    <section className="utility-panel utility-panel--plain review-panel">
      <header className="utility-panel__header review-panel__header">
        <div>
          <h2>Review matching</h2>
          <p>
            {unresolvedReports.length} need review, {missingReports.length} with missing books,{" "}
            {completeReports.length} complete after filters
            {mergedResultGroupCount > 0 ? `, ${mergedResultGroupCount} merged` : ""}
          </p>
        </div>
      </header>

      {manualMatchMessage ? (
        <div className="review-manual-match-message">
          <span>{manualMatchMessage}</span>
          {onRescan ? (
            <button className="button-secondary" type="button" onClick={onRescan}>
              Rescan now
            </button>
          ) : null}
        </div>
      ) : null}

      {result.seriesReports.length > 0 ? (
        <ReviewSummary
          completeCount={completeReports.length}
          missingCount={missingReports.length}
          unresolvedCount={unresolvedReports.length}
        />
      ) : null}

      {unresolvedReports.length > 0 ? (
        <ReviewSection
          defaultOpen
          count={unresolvedReports.length}
          description="No provider series passed the confidence check."
          title="Needs review"
          variant="warning"
        >
          {unresolvedReports.map((report) => (
            <ReviewReportCard
              key={report.localSeries.id}
              onManualMatchSaved={handleManualMatchSaved}
              onSaveManualSeriesMatch={onSaveManualSeriesMatch}
              region={region}
              report={report}
            />
          ))}
        </ReviewSection>
      ) : null}

      {missingReports.length > 0 ? (
        <ReviewSection
          count={missingReports.length}
          description="Matched series that still have visible gaps."
          title="Missing books"
        >
          {missingReports.map((report) => (
            <ReviewReportCard key={report.localSeries.id} report={report} compact />
          ))}
        </ReviewSection>
      ) : null}

      {completeReports.length > 0 ? (
        <ReviewSection
          count={completeReports.length}
          description="Matched series with no visible gaps."
          title="Complete after filters"
        >
          {completeReports.map((report) => (
            <ReviewReportCard key={report.localSeries.id} report={report} compact />
          ))}
        </ReviewSection>
      ) : null}

      {result.seriesReports.length === 0 ? (
        <EmptyState compact title="No series available to review">
          Run a scan first, then matching decisions will appear here.
        </EmptyState>
      ) : null}
    </section>
  );
}

/**
 * Purpose: Filter unresolved reports down to those still needing visible action
 * in the current Review panel.
 *
 * @param reports - All series reports from the completed scan.
 * @param handledManualMatchSeriesIds - Local series ids already handled by
 * manual provider selection in this panel.
 * @returns Unresolved reports that have not been manually handled yet.
 */
export function getVisibleUnresolvedReports(
  reports: SeriesScanReport[],
  handledManualMatchSeriesIds: ReadonlySet<string>
): SeriesScanReport[] {
  return reports.filter(
    (report) =>
      report.status === "unresolved" && !handledManualMatchSeriesIds.has(report.localSeries.id)
  );
}

/**
 * Purpose: Render compact counts for the main review categories.
 *
 * @param props - Summary count inputs.
 * @param props.completeCount - Matched series with no visible missing books.
 * @param props.missingCount - Matched series with visible missing books.
 * @param props.unresolvedCount - Series that did not confidently match.
 * @returns A three-column review count strip.
 */
function ReviewSummary({
  completeCount,
  missingCount,
  unresolvedCount,
}: {
  completeCount: number;
  missingCount: number;
  unresolvedCount: number;
}) {
  return (
    <dl className="review-summary">
      <ReviewSummaryItem
        description="No confident match"
        label="Needs review"
        value={unresolvedCount}
      />
      <ReviewSummaryItem
        description="Visible after filters"
        label="Missing books"
        value={missingCount}
      />
      <ReviewSummaryItem
        description="No visible gaps"
        label="Complete"
        value={completeCount}
      />
    </dl>
  );
}

/**
 * Purpose: Render one compact review category count with a short status hint.
 *
 * @param props - Review summary item inputs.
 * @param props.description - Short explanation of the category.
 * @param props.label - Category label.
 * @param props.value - Category count.
 * @returns A labelled summary count.
 */
function ReviewSummaryItem({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: number;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{description}</small>
    </div>
  );
}

/**
 * Purpose: Group related review cards behind a compact expandable heading.
 *
 * @param props - Section inputs.
 * @param props.children - Review cards to display.
 * @param props.count - Number of reports in the section.
 * @param props.defaultOpen - Whether the section should open by default.
 * @param props.description - Short explanation of what the section contains.
 * @param props.title - Section heading.
 * @param props.variant - Optional visual emphasis for unresolved reports.
 * @returns An expandable review section.
 */
function ReviewSection({
  children,
  count,
  defaultOpen = false,
  description,
  title,
  variant,
}: {
  children: ReactNode;
  count: number;
  defaultOpen?: boolean;
  description: string;
  title: string;
  variant?: "warning";
}) {
  return (
    <details
      className={`review-section${variant ? ` review-section--${variant}` : ""}`}
      open={defaultOpen}
    >
      <summary className="review-section__summary">
        <span className="review-section__label">
          <span>{title}</span>
          <small>{description}</small>
        </span>
        <span className="review-section__meta">
          <strong>{count}</strong>
          <span className="review-section__state" aria-hidden="true" />
        </span>
      </summary>
      <div className="review-list">{children}</div>
    </details>
  );
}
