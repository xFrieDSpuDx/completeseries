import { useState } from "react";
import {
  createScanSession,
  runLibraryScan,
  type AuthenticatedScanSession,
  type ManualSeriesMatch,
  type ScanOptions,
  type ScanResult,
} from "../features/scan/runLibraryScan";
import type { ManualBookMatch } from "../domain/manualBookMatches";
import {
  buildDebugHistoryEntry,
  type DebugHistoryEntry,
} from "../features/debug/debugHistory";
import { buildConnectionOptions, type ConnectionFormValues } from "./setup/scanFormTypes";
import { LoginView } from "./setup/LoginView";
import {
  clearManualBookMatches,
  loadManualBookMatches,
  saveManualBookMatches,
  upsertManualBookMatch,
} from "./storage/manualBookMatchStore";
import {
  clearManualSeriesMatches,
  loadManualSeriesMatches,
  saveManualSeriesMatches,
  upsertManualSeriesMatch,
} from "./storage/manualSeriesMatchStore";
import { ResultsView } from "./results/ResultsView";
import { ScanProgressView } from "./setup/ScanProgressView";
import { ScanSetupView } from "./setup/ScanSetupView";
import { useHiddenItems } from "./storage/useHiddenItems";

type AppStage = "login" | "setup" | "scanning" | "results";

/**
 * Purpose: Orchestrate the Complete Series app shell while delegating form and
 * results rendering to focused components.
 *
 * @returns The application shell, including setup form or completed scan
 * results.
 */
export function App() {
  const [stage, setStage] = useState<AppStage>("login");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [session, setSession] = useState<AuthenticatedScanSession | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastScanOptions, setLastScanOptions] = useState<ScanOptions | null>(null);
  const [debugHistory, setDebugHistory] = useState<DebugHistoryEntry[]>([]);
  const [manualBookMatches, setManualBookMatches] = useState(loadManualBookMatches);
  const [manualSeriesMatches, setManualSeriesMatches] = useState(loadManualSeriesMatches);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const hiddenItemsState = useHiddenItems();

  /**
   * Purpose: Authenticate with Audiobookshelf, load libraries, and create a
   * reusable session for later scans.
   *
   * @param values - Login form values from the first app stage.
   * @returns A promise that resolves after the setup stage is ready or login
   * fails.
   */
  async function handleLogin(values: ConnectionFormValues): Promise<void> {
    setError("");
    setStatus("Authenticating with Audiobookshelf...");
    setIsLoggingIn(true);

    try {
      const nextSession = await createScanSession(buildConnectionOptions(values), setStatus);
      setSession(nextSession);
      setStatus("");
      setStage("setup");
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Login failed.";
      setError(message);
      setStatus("");
    } finally {
      setIsLoggingIn(false);
    }
  }

  /**
   * Purpose: Connect to a different Audiobookshelf server from the results page
   * while preserving debug history from the current app session.
   *
   * @param values - Connection form values for the new server.
   * @returns A promise that resolves after the setup stage is ready.
   */
  async function handleResultsServerConnect(values: ConnectionFormValues): Promise<void> {
    const nextSession = await createScanSession(buildConnectionOptions(values));

    setSession(nextSession);
    setResult(null);
    setLastScanOptions(null);
    setStatus("");
    setError("");
    setProgressLog([]);
    setStage("setup");
  }

  /**
   * Purpose: Start a library scan and move the app into either results or error
   * state.
   *
   * @param options - Complete scan options from the setup form.
   * @returns A promise that resolves after the scan completes or fails.
   */
  async function handleScanSubmit(options: ScanOptions): Promise<void> {
    const scanOptions = { ...options, manualBookMatches, manualSeriesMatches };

    setError("");
    setResult(null);
    setProgressLog([]);
    setLastScanOptions(scanOptions);
    setIsScanning(true);
    setStage("scanning");
    setStatus("Starting scan...");

    try {
      const scanResult = await runLibraryScan(scanOptions, updateScanProgress);
      setResult(scanResult);
      setDebugHistory((entries) =>
        [buildDebugHistoryEntry(scanResult, scanOptions), ...entries].slice(0, 8)
      );
      setStatus("Scan complete.");
      setStage("results");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
      setStatus("");
      setStage("setup");
    } finally {
      setIsScanning(false);
    }
  }

  /**
   * Purpose: Store the newest scan status while keeping a short recent-activity
   * log for the progress page.
   *
   * @param message - Progress message emitted by the scan pipeline.
   * @returns Nothing. React state is updated for the visible progress screen.
   */
  function updateScanProgress(message: string): void {
    setStatus(message);
    setProgressLog((messages) => [message, ...messages].slice(0, 6));
  }

  /**
   * Purpose: Save a user-selected provider series override for future scans.
   *
   * @param match - Manual provider-series match selected from Review.
   * @returns Nothing. State and local storage are updated together.
   */
  function handleSaveManualSeriesMatch(match: ManualSeriesMatch): void {
    setManualSeriesMatches((currentMatches) => {
      const nextMatches = upsertManualSeriesMatch(currentMatches, match);
      saveManualSeriesMatches(nextMatches);

      return nextMatches;
    });
  }

  /**
   * Purpose: Save a user-confirmed owned-book override for future scans.
   *
   * @param match - Manual owned-book match selected from the results drawer.
   * @returns Nothing. State and local storage are updated together.
   */
  function handleSaveManualBookMatch(match: ManualBookMatch): void {
    setManualBookMatches((currentMatches) => {
      const nextMatches = upsertManualBookMatch(currentMatches, match);
      saveManualBookMatches(nextMatches);

      return nextMatches;
    });
  }

  /**
   * Purpose: Merge manual owned-book matches imported from a local data file.
   *
   * @param matches - Imported manual owned-book matches.
   * @returns Nothing. State and local storage are updated together.
   */
  function handleImportManualBookMatches(matches: ManualBookMatch[]): void {
    setManualBookMatches((currentMatches) => {
      const nextMatches = matches.reduce(upsertManualBookMatch, currentMatches);
      saveManualBookMatches(nextMatches);

      return nextMatches;
    });
  }

  /**
   * Purpose: Clear all saved manual owned-book overrides.
   *
   * @returns Nothing. State and local storage are cleared together.
   */
  function handleClearManualBookMatches(): void {
    setManualBookMatches([]);
    clearManualBookMatches();
  }

  /**
   * Purpose: Merge provider-series overrides imported from a local data file.
   *
   * @param matches - Imported provider-series overrides.
   * @returns Nothing. State and local storage are updated together.
   */
  function handleImportManualSeriesMatches(matches: ManualSeriesMatch[]): void {
    setManualSeriesMatches((currentMatches) => {
      const nextMatches = matches.reduce(upsertManualSeriesMatch, currentMatches);
      saveManualSeriesMatches(nextMatches);

      return nextMatches;
    });
  }

  /**
   * Purpose: Clear all saved provider-series overrides.
   *
   * @returns Nothing. State and local storage are cleared together.
   */
  function handleClearManualSeriesMatches(): void {
    setManualSeriesMatches([]);
    clearManualSeriesMatches();
  }

  return (
    <main className="app-shell">
      {stage === "login" ? (
        <LoginView
          error={error}
          isLoggingIn={isLoggingIn}
          onImportHiddenItems={hiddenItemsState.importHiddenItems}
          onImportManualBookMatches={handleImportManualBookMatches}
          onImportManualSeriesMatches={handleImportManualSeriesMatches}
          onLogin={handleLogin}
          status={status}
        />
      ) : null}

      {stage === "setup" && session ? (
        <ScanSetupView
          error={error}
          isScanning={isScanning}
          onStartScan={handleScanSubmit}
          session={session}
        />
      ) : null}

      {stage === "scanning" ? (
        <ScanProgressView progressLog={progressLog} status={status} />
      ) : null}

      {stage === "results" && result ? (
        <ResultsView
          hiddenItems={hiddenItemsState.hiddenItems}
          debugHistory={debugHistory}
          lastScanOptions={lastScanOptions}
          manualBookMatches={manualBookMatches}
          manualSeriesMatches={manualSeriesMatches}
          onClearManualBookMatches={handleClearManualBookMatches}
          onClearHiddenItems={hiddenItemsState.clearHiddenItems}
          onClearManualSeriesMatches={handleClearManualSeriesMatches}
          onHideItem={hiddenItemsState.hideItem}
          onImportHiddenItems={hiddenItemsState.importHiddenItems}
          onImportManualBookMatches={handleImportManualBookMatches}
          onImportManualSeriesMatches={handleImportManualSeriesMatches}
          onSaveManualBookMatch={handleSaveManualBookMatch}
          onSaveManualSeriesMatch={handleSaveManualSeriesMatch}
          onConnectServer={handleResultsServerConnect}
          onRescanWithOptions={handleScanSubmit}
          onUnhideItem={hiddenItemsState.unhideItem}
          result={result}
        />
      ) : null}
    </main>
  );
}
