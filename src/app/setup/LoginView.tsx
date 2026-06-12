import { useState } from "react";
import { BrandMark } from "../components/BrandMark";
import { ChangeLogPanel } from "../changelog/ChangeLogPanel";
import { ConnectionForm } from "./ConnectionForm";
import type { HiddenItem } from "../storage/hiddenItemsStore";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import { ResultsToolDrawer } from "../results/ResultsToolDrawer";
import { SavedStateImport } from "./SavedStateImport";
import type { ConnectionFormValues } from "./scanFormTypes";

type LoginViewProps = {
  error: string;
  isLoggingIn: boolean;
  onImportHiddenItems: (items: HiddenItem[]) => void;
  onImportManualBookMatches: (matches: ManualBookMatch[]) => void;
  onImportManualSeriesMatches: (matches: ManualSeriesMatch[]) => void;
  onLogin: (values: ConnectionFormValues) => Promise<void>;
  status: string;
};

/**
 * Purpose: Render the first-stage Audiobookshelf login screen.
 *
 * @param props - Login screen inputs and callbacks.
 * @param props.error - Error message from the most recent login attempt.
 * @param props.isLoggingIn - Whether an authentication request is in progress.
 * @param props.onImportHiddenItems - Callback that imports hidden item records
 * from a saved-state file.
 * @param props.onImportManualBookMatches - Callback that imports saved manual
 * owned-book matches from a saved-state file.
 * @param props.onImportManualSeriesMatches - Callback that imports saved manual
 * provider-series matches from a saved-state file.
 * @param props.onLogin - Callback that authenticates and creates a scan
 * session.
 * @param props.status - Short status message for the active login attempt.
 * @returns The login form stage.
 */
export function LoginView({
  error,
  isLoggingIn,
  onImportHiddenItems,
  onImportManualBookMatches,
  onImportManualSeriesMatches,
  onLogin,
  status,
}: LoginViewProps) {
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

  return (
    <section className="stage-shell stage-shell--centred">
      <div className="login-panel">
        <BrandMark />
        <div className="headingContainer">
          <h1>Complete your collection</h1>
          <p>Every series brought together</p>
        </div>

        <ConnectionForm
          error={error}
          isSubmitting={isLoggingIn}
          onSubmit={onLogin}
          status={status}
          submitLabel="Login"
          submittingLabel="Logging in..."
          actions={
            <SavedStateImport
              onImportHiddenItems={onImportHiddenItems}
              onImportManualBookMatches={onImportManualBookMatches}
              onImportManualSeriesMatches={onImportManualSeriesMatches}
            />
          }
        />

        <footer className="login-panel__footer">
          <button
            className="login-panel__text-action"
            type="button"
            onClick={() => setIsChangeLogOpen(true)}
          >
            Change log
          </button>
        </footer>
      </div>

      {isChangeLogOpen ? (
        <ResultsToolDrawer title="Change log" onClose={() => setIsChangeLogOpen(false)}>
          <ChangeLogPanel />
        </ResultsToolDrawer>
      ) : null}
    </section>
  );
}
