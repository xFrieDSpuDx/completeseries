import type { ManualBookMatch } from "../../domain/manualBookMatches";
import { DebugPanel } from "../../features/debug/DebugPanel";
import { downloadDebugCsv, downloadDebugJson } from "../../features/debug/debugExport";
import type { DebugHistoryEntry } from "../../features/debug/debugHistory";
import { buildDebugRows } from "../../features/debug/debugPanelRows";
import type {
  ManualSeriesMatch,
  ScanOptions,
  ScanResult,
} from "../../features/scan/runLibraryScan";
import { EmptyState } from "../../shared/EmptyState";
import { HiddenItemsPanel } from "../storage/HiddenItemsPanel";
import type { HiddenItem } from "../storage/hiddenItemsStore";
import { downloadLocalDataExport } from "../storage/localDataFile";
import { LocalDataTools } from "../storage/LocalDataTools";
import { ResultsDownloadPanel } from "./ResultsDownloadPanel";
import { ResultsFilterPanel } from "./ResultsFilterPanel";
import { ResultsLibraryPanel } from "./ResultsLibraryPanel";
import { ResultsServerPanel } from "./ResultsServerPanel";
import type { ResultsToolId } from "./ResultsActionsMenu";
import { ReviewPanel } from "../review/ReviewPanel";
import { exportMissingBooksCsv, exportMissingBooksJson } from "./resultsExport";
import type { ResultsPreferences } from "./resultsPreferencesStore";
import type { ConnectionFormValues } from "../setup/scanFormTypes";
import { loadScanPreferences } from "../setup/scanPreferencesStore";
import type { ResultsSortOrder } from "./visibleResults";

type ResultsDrawerContentProps = {
  activeTool: ResultsToolId;
  debugHistory: DebugHistoryEntry[];
  hiddenItems: HiddenItem[];
  lastScanOptions: ScanOptions | null;
  manualBookMatches: ManualBookMatch[];
  manualSeriesMatches: ManualSeriesMatch[];
  onClearHiddenItems: () => void;
  onClearManualBookMatches: () => void;
  onClearManualSeriesMatches: () => void;
  onClearResultsPreferences: () => void;
  onClose: () => void;
  onConnectServer: (values: ConnectionFormValues) => Promise<void>;
  onImportHiddenItems: (items: HiddenItem[]) => void;
  onImportManualBookMatches: (matches: ManualBookMatch[]) => void;
  onImportManualSeriesMatches: (matches: ManualSeriesMatch[]) => void;
  onImportResultsPreferences: (preferences: ResultsPreferences) => void;
  onRescanWithOptions: (options: ScanOptions) => Promise<void>;
  onSaveManualSeriesMatch: (match: ManualSeriesMatch) => void;
  onShowHiddenChange: (shouldShowHiddenItems: boolean) => void;
  onUnhideItem: (item: HiddenItem) => void;
  result: ScanResult;
  showHiddenItems: boolean;
  sortOrder: ResultsSortOrder;
};

/**
 * Purpose: Render the active results drawer content while keeping the main
 * results view focused on layout and result selection.
 *
 * @param props - Drawer rendering inputs and callbacks.
 * @param props.activeTool - Currently selected results tool.
 * @param props.debugHistory - Recent debug history entries.
 * @param props.hiddenItems - Hidden series and books saved locally.
 * @param props.lastScanOptions - Options used by the completed scan.
 * @param props.manualBookMatches - Manually marked owned books.
 * @param props.manualSeriesMatches - Manually selected provider-series
 * matches.
 * @param props.onClearHiddenItems - Callback that clears hidden items.
 * @param props.onClearManualBookMatches - Callback that clears owned-book
 * manual matches.
 * @param props.onClearManualSeriesMatches - Callback that clears manual series
 * matches.
 * @param props.onClearResultsPreferences - Callback that clears results display
 * preferences.
 * @param props.onClose - Callback that closes the drawer.
 * @param props.onConnectServer - Callback that connects to an Audiobookshelf
 * server.
 * @param props.onImportHiddenItems - Callback that imports hidden items.
 * @param props.onImportManualBookMatches - Callback that imports owned-book
 * manual matches.
 * @param props.onImportManualSeriesMatches - Callback that imports manual
 * series matches.
 * @param props.onImportResultsPreferences - Callback that imports display
 * preferences.
 * @param props.onRescanWithOptions - Callback that starts a scan with updated
 * options.
 * @param props.onSaveManualSeriesMatch - Callback that saves one manual series
 * match.
 * @param props.onShowHiddenChange - Callback that toggles hidden item
 * visibility.
 * @param props.onUnhideItem - Callback that restores a hidden item.
 * @param props.result - Completed scan result.
 * @param props.showHiddenItems - Whether hidden items are shown.
 * @param props.sortOrder - Current visible results sort order.
 * @returns Content for the active results tool drawer.
 */
export function ResultsDrawerContent({
  activeTool,
  debugHistory,
  hiddenItems,
  lastScanOptions,
  manualBookMatches,
  manualSeriesMatches,
  onClearHiddenItems,
  onClearManualBookMatches,
  onClearManualSeriesMatches,
  onClearResultsPreferences,
  onClose,
  onConnectServer,
  onImportHiddenItems,
  onImportManualBookMatches,
  onImportManualSeriesMatches,
  onImportResultsPreferences,
  onRescanWithOptions,
  onSaveManualSeriesMatch,
  onShowHiddenChange,
  onUnhideItem,
  result,
  showHiddenItems,
  sortOrder,
}: ResultsDrawerContentProps) {
  /**
   * Purpose: Download a complete local-data backup from the Download drawer
   * using the same payload as the Local data drawer.
   *
   * @returns Nothing. The async browser download is started in the background.
   */
  function exportLocalDataBackup(): void {
    void downloadLocalDataExport(
      hiddenItems,
      manualBookMatches,
      manualSeriesMatches,
      loadScanPreferences(),
      { showHiddenItems, sortOrder }
    );
  }

  if (activeTool === "hidden") {
    return (
      <HiddenItemsPanel
        hiddenItems={hiddenItems}
        onClear={onClearHiddenItems}
        onShowHiddenChange={onShowHiddenChange}
        onUnhide={onUnhideItem}
        showHidden={showHiddenItems}
      />
    );
  }

  if (activeTool === "data") {
    return (
      <LocalDataTools
        hiddenItems={hiddenItems}
        manualBookMatches={manualBookMatches}
        manualSeriesMatches={manualSeriesMatches}
        onClearManualBookMatches={onClearManualBookMatches}
        onClearHiddenItems={onClearHiddenItems}
        onClearManualSeriesMatches={onClearManualSeriesMatches}
        onClearResultsPreferences={onClearResultsPreferences}
        onImportHiddenItems={onImportHiddenItems}
        onImportManualBookMatches={onImportManualBookMatches}
        onImportManualSeriesMatches={onImportManualSeriesMatches}
        onImportResultsPreferences={onImportResultsPreferences}
        preferences={loadScanPreferences()}
        resultsPreferences={{ showHiddenItems, sortOrder }}
      />
    );
  }

  if (activeTool === "download") {
    return (
      <ResultsDownloadPanel
        onExportCsv={() => exportMissingBooksCsv(result)}
        onExportDebugCsv={() => downloadDebugCsv(buildDebugRows(debugHistory, result))}
        onExportDebugJson={() =>
          downloadDebugJson(buildDebugRows(debugHistory, result), debugHistory, result)
        }
        onExportJson={() => exportMissingBooksJson(result)}
        onExportLocalData={exportLocalDataBackup}
      />
    );
  }

  if (activeTool === "filters") {
    return lastScanOptions ? (
      <ResultsFilterPanel
        scanOptions={lastScanOptions}
        onApply={onRescanWithOptions}
        onClose={onClose}
      />
    ) : (
      <EmptyState compact title="No previous scan settings">
        Run a scan first, then filters can be adjusted from this drawer.
      </EmptyState>
    );
  }

  if (activeTool === "libraries") {
    return lastScanOptions ? (
      <ResultsLibraryPanel
        scanOptions={lastScanOptions}
        onApply={onRescanWithOptions}
        onClose={onClose}
      />
    ) : (
      <EmptyState compact title="No library list available">
        Connect to an Audiobookshelf server and run a scan before changing libraries here.
      </EmptyState>
    );
  }

  if (activeTool === "server") return <ResultsServerPanel onConnect={onConnectServer} />;

  if (activeTool === "review") {
    return (
      <ReviewPanel
        onRescan={lastScanOptions ? () => void onRescanWithOptions(lastScanOptions) : undefined}
        onSaveManualSeriesMatch={onSaveManualSeriesMatch}
        region={lastScanOptions?.region}
        result={result}
      />
    );
  }

  return <DebugPanel history={debugHistory} openByDefault result={result} rowLimit={null} />;
}

/**
 * Purpose: Convert the active results tool id into a drawer title.
 *
 * @param tool - Active tool drawer id.
 * @returns Human-readable drawer title.
 */
export function getResultsToolTitle(tool: ResultsToolId): string {
  const titles = {
    filters: "Filters",
    libraries: "Libraries",
    server: "Server",
    hidden: "Hidden items",
    data: "Local data",
    download: "Download",
    review: "Review",
    debug: "Debug checks",
  };

  return titles[tool];
}
