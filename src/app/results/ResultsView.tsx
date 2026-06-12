import { useState } from "react";
import type { MissingBookGroup } from "../../domain/missingBooks";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type {
  ManualSeriesMatch,
  ScanOptions,
  ScanResult,
} from "../../features/scan/runLibraryScan";
import type { DebugHistoryEntry } from "../../features/debug/debugHistory";
import { EmptyState } from "../../shared/EmptyState";
import type { HiddenItem } from "../storage/hiddenItemsStore";
import { MissingBooksModal } from "./MissingBooksModal";
import { ResultsToolDrawer } from "./ResultsToolDrawer";
import { ResultsActionsMenu, type ResultsToolId } from "./ResultsActionsMenu";
import { ResultsDrawerContent, getResultsToolTitle } from "./ResultsDrawerContent";
import {
  buildResultsViewSummary,
  getManualBookMatchSourceForGroup,
} from "./resultsViewModel";
import { ResultsSeriesGrid } from "./ResultsSeriesGrid";
import { ResultsSummaryHeader } from "./ResultsSummaryHeader";
import type { ConnectionFormValues } from "../setup/scanFormTypes";
import { useResultsDisplayPreferences } from "./useResultsDisplayPreferences";
import {
  buildVisibleMissingGroups,
  countHiddenResultItems,
} from "./visibleResults";

type ResultsViewProps = {
  debugHistory: DebugHistoryEntry[];
  hiddenItems: HiddenItem[];
  lastScanOptions: ScanOptions | null;
  manualBookMatches: ManualBookMatch[];
  manualSeriesMatches: ManualSeriesMatch[];
  onClearManualBookMatches: () => void;
  onClearHiddenItems: () => void;
  onClearManualSeriesMatches: () => void;
  onConnectServer: (values: ConnectionFormValues) => Promise<void>;
  onHideItem: (item: HiddenItem) => void;
  onImportHiddenItems: (items: HiddenItem[]) => void;
  onImportManualBookMatches: (matches: ManualBookMatch[]) => void;
  onImportManualSeriesMatches: (matches: ManualSeriesMatch[]) => void;
  onRescanWithOptions: (options: ScanOptions) => Promise<void>;
  onSaveManualBookMatch: (match: ManualBookMatch) => void;
  onSaveManualSeriesMatch: (match: ManualSeriesMatch) => void;
  onUnhideItem: (item: HiddenItem) => void;
  result: ScanResult;
};

type ResultsTool = ResultsToolId | null;

/**
 * Purpose: Render grouped missing-book results and unresolved series after a
 * scan completes.
 *
 * @param props - Result view inputs.
 * @param props.hiddenItems - Hidden books and series saved locally.
 * @param props.lastScanOptions - Options used by the completed scan.
 * @param props.manualBookMatches - Books manually marked as already owned.
 * @param props.manualSeriesMatches - Saved manual provider-series matches.
 * @param props.onClearManualBookMatches - Callback that clears manual
 * owned-book matches.
 * @param props.onClearHiddenItems - Callback that clears all hidden items.
 * @param props.onClearManualSeriesMatches - Callback that clears manual
 * provider-series matches.
 * @param props.onConnectServer - Callback that connects to a new
 * Audiobookshelf server from the results page.
 * @param props.onHideItem - Callback that hides one book or series.
 * @param props.onImportHiddenItems - Callback that imports hidden item records.
 * @param props.onImportManualBookMatches - Callback that imports manual
 * owned-book matches.
 * @param props.onImportManualSeriesMatches - Callback that imports manual
 * provider-series matches.
 * @param props.onRescanWithOptions - Callback that starts a scan with edited
 * options from the results page.
 * @param props.onSaveManualBookMatch - Callback that saves one manual
 * owned-book match from the missing-book drawer.
 * @param props.onSaveManualSeriesMatch - Callback that saves a manual provider
 * series match from Review.
 * @param props.result - Scan result summary and grouped missing books.
 * @param props.onUnhideItem - Callback that restores one hidden item.
 * @returns A results section for the completed scan.
 */
export function ResultsView({
  debugHistory,
  hiddenItems,
  lastScanOptions,
  manualBookMatches,
  manualSeriesMatches,
  onClearManualBookMatches,
  onClearHiddenItems,
  onClearManualSeriesMatches,
  onConnectServer,
  onHideItem,
  onImportHiddenItems,
  onImportManualBookMatches,
  onImportManualSeriesMatches,
  onRescanWithOptions,
  onSaveManualBookMatch,
  onSaveManualSeriesMatch,
  onUnhideItem,
  result,
}: ResultsViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<MissingBookGroup | null>(null);
  const [showLowConfidenceResults, setShowLowConfidenceResults] = useState(false);
  const [activeTool, setActiveTool] = useState<ResultsTool>(null);
  const {
    changeShowHiddenItems,
    changeSortOrder,
    clearResultsDisplayPreferences,
    importResultsPreferences,
    showHiddenItems,
    sortOrder,
  } = useResultsDisplayPreferences();
  const lowConfidenceMissingGroups = result.lowConfidenceMissingGroups ?? [];
  const displayedMissingGroups = showLowConfidenceResults
    ? [...result.missingGroups, ...lowConfidenceMissingGroups]
    : result.missingGroups;
  const visibleGroups = buildVisibleMissingGroups(
    displayedMissingGroups,
    hiddenItems,
    manualBookMatches,
    lastScanOptions?.region ?? "uk",
    showHiddenItems,
    sortOrder
  );
  const hiddenResultCounts = countHiddenResultItems(displayedMissingGroups, hiddenItems);
  const resultsSummary = buildResultsViewSummary(result);
  const selectedManualBookMatchSource = selectedGroup
    ? getManualBookMatchSourceForGroup(selectedGroup, result, lastScanOptions?.region)
    : undefined;
  const latestHistoryEntry = debugHistory[0];

  return (
    <section id="seriesOutput">
      <ResultsSummaryHeader
        completeAfterFiltersCount={resultsSummary.completeAfterFiltersCount}
        hiddenSeriesCount={hiddenResultCounts.series}
        lastScanOptions={lastScanOptions}
        latestHistoryEntry={latestHistoryEntry}
        librariesScanned={result.librariesScanned}
        localSeriesCount={result.localSeriesCount}
        matchedMissingSeriesCount={resultsSummary.matchedMissingSeriesCount}
        matchedSeriesCount={result.matchedSeriesCount}
        mergedResultGroupCount={resultsSummary.mergedResultGroupCount}
        unresolvedSeriesCount={result.unresolvedSeries.length}
        visibleSeriesCount={visibleGroups.length}
      />

      <ResultsActionsMenu
        lowConfidenceCount={lowConfidenceMissingGroups.length}
        onOpenTool={setActiveTool}
        onScanAgain={
          lastScanOptions ? () => void onRescanWithOptions(lastScanOptions) : undefined
        }
        onShowLowConfidenceChange={setShowLowConfidenceResults}
        onSortOrderChange={changeSortOrder}
        showLowConfidenceResults={showLowConfidenceResults}
        sortOrder={sortOrder}
      />

      {visibleGroups.length > 0 ? (
        <ResultsSeriesGrid
          groups={visibleGroups}
          hiddenItems={hiddenItems}
          onHideItem={onHideItem}
          onSelectGroup={setSelectedGroup}
          onUnhideItem={onUnhideItem}
        />
      ) : (
        <EmptyState title="No missing books shown">
          Your current filters did not find any visible gaps. If that feels wrong, open Review
          matching to inspect how the series matched.
        </EmptyState>
      )}

      {activeTool ? (
        <ResultsToolDrawer
          contentClassName={`tool-drawer-content--${activeTool}`}
          title={getResultsToolTitle(activeTool)}
          variant={activeTool === "debug" ? "fullscreen" : "side"}
          onClose={() => setActiveTool(null)}
        >
          <ResultsDrawerContent
            activeTool={activeTool}
            debugHistory={debugHistory}
            hiddenItems={hiddenItems}
            lastScanOptions={lastScanOptions}
            manualBookMatches={manualBookMatches}
            manualSeriesMatches={manualSeriesMatches}
            onClearHiddenItems={onClearHiddenItems}
            onClearManualBookMatches={onClearManualBookMatches}
            onClearManualSeriesMatches={onClearManualSeriesMatches}
            onClearResultsPreferences={clearResultsDisplayPreferences}
            onClose={() => setActiveTool(null)}
            onConnectServer={onConnectServer}
            onImportHiddenItems={onImportHiddenItems}
            onImportManualBookMatches={onImportManualBookMatches}
            onImportManualSeriesMatches={onImportManualSeriesMatches}
            onImportResultsPreferences={importResultsPreferences}
            onRescanWithOptions={onRescanWithOptions}
            onSaveManualSeriesMatch={onSaveManualSeriesMatch}
            onShowHiddenChange={changeShowHiddenItems}
            onUnhideItem={onUnhideItem}
            result={result}
            showHiddenItems={showHiddenItems}
            sortOrder={sortOrder}
          />
        </ResultsToolDrawer>
      ) : null}

      {selectedGroup ? (
        <MissingBooksModal
          group={selectedGroup}
          hiddenItems={hiddenItems}
          manualBookMatches={manualBookMatches}
          manualBookMatchSource={selectedManualBookMatchSource}
          onClose={() => setSelectedGroup(null)}
          onHideItem={onHideItem}
          onSaveManualBookMatch={onSaveManualBookMatch}
          onUnhideItem={onUnhideItem}
        />
      ) : null}
    </section>
  );
}
