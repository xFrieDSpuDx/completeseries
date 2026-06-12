import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../../shared/EmptyState";
import type { ScanResult } from "../scan/runLibraryScan";
import { DebugControls } from "./DebugControls";
import { downloadDebugCsv, downloadDebugJson } from "./debugExport";
import { DebugHistoryList } from "./DebugHistoryList";
import type { DebugHistoryEntry } from "./debugHistory";
import { DebugPagination } from "./DebugPagination";
import {
  buildDebugRows,
  filterDebugRows,
  filterRowsByScan,
  getDistinctCheckLabels,
  getDistinctScans,
  type DebugOutcomeFilter,
} from "./debugPanelRows";
import { buildDebugSummaryText } from "./debugSummaryText";
import { DebugTable } from "./DebugTable";
import { DebugUnresolvedList } from "./DebugUnresolvedList";

type DebugPanelProps = {
  history?: DebugHistoryEntry[];
  openByDefault?: boolean;
  result: ScanResult;
  rowLimit?: number | null;
};

const DEBUG_PAGE_SIZE = 150;

/**
 * Purpose: Render scan debug decisions so users can inspect why provider books
 * were shown or skipped.
 *
 * @param props - Debug panel inputs.
 * @param props.history - Recent scan summaries and debug rows from this app
 * session.
 * @param props.openByDefault - Deprecated legacy prop retained for call-site
 * compatibility. The debug panel is no longer collapsible.
 * @param props.result - Completed scan result containing fallback debug rows
 * when history is empty.
 * @param props.rowLimit - Optional page size for filtered debug rows.
 * @returns A debug explorer with filters, lazy row details, and exports.
 */
export function DebugPanel({
  history = [],
  result,
  rowLimit = 80,
}: DebugPanelProps) {
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<DebugOutcomeFilter>("any");
  const [checkFilter, setCheckFilter] = useState("any");
  const [scanFilter, setScanFilter] = useState("latest");
  const [pageIndex, setPageIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const debugRows = useMemo(() => buildDebugRows(history, result), [history, result]);
  const latestScanId = debugRows[0]?.scanId ?? "current";
  const scanOptions = useMemo(() => getDistinctScans(debugRows), [debugRows]);
  const scanScopedRows = useMemo(
    () => filterRowsByScan(debugRows, scanFilter, latestScanId),
    [debugRows, latestScanId, scanFilter]
  );
  const checkOptions = useMemo(() => getDistinctCheckLabels(scanScopedRows), [scanScopedRows]);
  const filteredRows = useMemo(
    () => filterDebugRows(scanScopedRows, { checkFilter, outcomeFilter, query }),
    [checkFilter, outcomeFilter, query, scanScopedRows]
  );
  const shownCount = debugRows.filter((row) => row.action === "show").length;
  const skippedCount = debugRows.filter((row) => row.action === "skip").length;
  const pageSize = rowLimit ?? DEBUG_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const isLimited = filteredRows.length > visibleRows.length;

  useEffect(() => {
    setPageIndex(0);
  }, [checkFilter, outcomeFilter, query, scanFilter]);

  useLayoutEffect(() => {
    scrollDebugPanelToTop();
    const animationFrame = window.requestAnimationFrame(scrollDebugPanelToTop);
    const timeout = window.setTimeout(scrollDebugPanelToTop, 0);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [safePageIndex]);

  /**
   * Purpose: Move every relevant debug scroll container back to the top after
   * pagination changes, including the fullscreen drawer wrapper.
   *
   * @returns Nothing. Scroll positions are reset when elements are present.
   */
  function scrollDebugPanelToTop(): void {
    const content = contentRef.current;
    const tableWrap = tableWrapRef.current;
    const drawerContent = content?.closest(".tool-drawer-content");
    const drawerPanel = content?.closest(".tool-drawer-panel");

    content?.scrollTo({ left: 0, top: 0 });
    tableWrap?.scrollTo({ left: 0, top: 0 });
    if (drawerContent instanceof HTMLElement) drawerContent.scrollTo({ left: 0, top: 0 });
    if (drawerPanel instanceof HTMLElement) drawerPanel.scrollTo({ left: 0, top: 0 });
  }

  /**
   * Purpose: Download the currently filtered debug rows as JSON.
   *
   * @returns Nothing. A browser download is triggered.
   */
  function exportDebugJson(): void {
    downloadDebugJson(filteredRows, history, result);
  }

  /**
   * Purpose: Download the currently filtered debug rows as CSV.
   *
   * @returns Nothing. A browser download is triggered.
   */
  function exportDebugCsv(): void {
    downloadDebugCsv(filteredRows);
  }

  /**
   * Purpose: Copy a compact text summary of the current debug filters and
   * counts to the clipboard.
   *
   * @returns A promise that resolves after the clipboard attempt finishes.
   */
  async function copyDebugSummary(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyMessage("Copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildDebugSummaryText({
          checkFilter,
          debugRows,
          filteredRows,
          outcomeFilter,
          query,
          result,
          scanFilter,
        })
      );
      setCopyMessage("Summary copied.");
    } catch {
      setCopyMessage("Copy failed.");
    }
  }

  return (
    <section className="debug-panel">
      <header className="debug-panel__header">
        Debug checks: {shownCount} shown, {skippedCount} skipped,{" "}
        {result.unresolvedSeries.length} unresolved
      </header>
      <div className="debug-panel__content" ref={contentRef}>
        <DebugControls
          checkFilter={checkFilter}
          checkOptions={checkOptions}
          filteredRowCount={filteredRows.length}
          onCheckFilterChange={setCheckFilter}
          onCopySummary={() => void copyDebugSummary()}
          onExportCsv={exportDebugCsv}
          onExportJson={exportDebugJson}
          onOutcomeFilterChange={setOutcomeFilter}
          onQueryChange={setQuery}
          onScanFilterChange={setScanFilter}
          outcomeFilter={outcomeFilter}
          query={query}
          scanFilter={scanFilter}
          scanOptions={scanOptions}
          totalRowCount={debugRows.length}
        />

        {copyMessage ? <p className="debug-panel__note">{copyMessage}</p> : null}

        {isLimited ? (
          <p className="debug-panel__note">
            Showing {pageStart + 1}-{pageStart + visibleRows.length} of {filteredRows.length}{" "}
            filtered checks.
          </p>
        ) : null}

        {history.length > 0 ? <DebugHistoryList history={history} /> : null}

        <div className="debug-pagination-slot debug-pagination-slot--top">
          <DebugPagination
            onPageChange={setPageIndex}
            pageCount={pageCount}
            safePageIndex={safePageIndex}
          />
        </div>

        {filteredRows.length > 0 ? (
          <DebugTable rows={visibleRows} tableWrapRef={tableWrapRef} />
        ) : (
          <EmptyState compact title="No debug checks match these filters">
            Try All scans, Any outcome, Any check, or clear the search text.
          </EmptyState>
        )}

        <div className="debug-pagination-slot debug-pagination-slot--bottom">
          <DebugPagination
            onPageChange={setPageIndex}
            pageCount={pageCount}
            safePageIndex={safePageIndex}
          />
        </div>

        <DebugUnresolvedList unresolvedSeries={result.unresolvedSeries} />
      </div>
      <div className="debug-mobile-pagination-footer">
        <DebugPagination
          onPageChange={setPageIndex}
          pageCount={pageCount}
          safePageIndex={safePageIndex}
        />
      </div>
    </section>
  );
}
