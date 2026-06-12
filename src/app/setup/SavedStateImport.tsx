import { ChangeEvent, useRef, useState } from "react";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import { parseHiddenItemsPayload, type HiddenItem } from "../storage/hiddenItemsStore";
import {
  parseManualBookMatchesPayload,
  saveManualBookMatches,
} from "../storage/manualBookMatchStore";
import {
  parseManualSeriesMatchesPayload,
  saveManualSeriesMatches,
} from "../storage/manualSeriesMatchStore";
import {
  parseScanPreferencesPayload,
  type ScanPreferences,
  saveScanPreferences,
} from "./scanPreferencesStore";

type SavedStateImportProps = {
  onImportHiddenItems: (items: HiddenItem[]) => void;
  onImportManualBookMatches?: (matches: ManualBookMatch[]) => void;
  onImportManualSeriesMatches?: (matches: ManualSeriesMatch[]) => void;
  onImportPreferences?: (preferences: ScanPreferences) => void;
};

/**
 * Purpose: Let users restore exported V2 state before logging in, including
 * hidden items, owned-book matches, saved scan filters, selected region, and
 * remembered library selections.
 *
 * @param props - Saved-state import inputs.
 * @param props.onImportHiddenItems - Callback receiving parsed hidden item
 * records from the selected file.
 * @param props.onImportManualBookMatches - Optional callback receiving parsed
 * manual owned-book matches.
 * @param props.onImportManualSeriesMatches - Optional callback receiving parsed
 * provider-series overrides.
 * @param props.onImportPreferences - Optional callback receiving parsed scan
 * preferences from the selected file.
 * @returns A compact JSON import control for the login page.
 */
export function SavedStateImport({
  onImportHiddenItems,
  onImportManualBookMatches,
  onImportManualSeriesMatches,
  onImportPreferences,
}: SavedStateImportProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Purpose: Parse the selected saved-state file and apply supported local
   * values before the user logs in.
   *
   * @param event - File input change event from the import control.
   * @returns A promise that resolves after local state has been imported.
   */
  async function importSavedState(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importText = await file.text();
      const hiddenItems = parseHiddenItemsPayload(importText);
      const manualBookMatches = parseManualBookMatchesPayload(importText);
      const manualSeriesMatches = parseManualSeriesMatchesPayload(importText);
      const preferences = parseScanPreferencesPayload(importText);

      onImportHiddenItems(hiddenItems);
      if (manualBookMatches.length > 0) {
        saveManualBookMatches(manualBookMatches);
        onImportManualBookMatches?.(manualBookMatches);
      }
      if (manualSeriesMatches.length > 0) {
        saveManualSeriesMatches(manualSeriesMatches);
        onImportManualSeriesMatches?.(manualSeriesMatches);
      }
      if (preferences) saveScanPreferences(preferences);
      if (preferences) onImportPreferences?.(preferences);

      setError("");
      setMessage(
        buildImportMessage(
          hiddenItems.length,
          manualBookMatches.length,
          manualSeriesMatches.length,
          Boolean(preferences)
        )
      );
    } catch {
      setMessage("");
      setError("Saved state could not be imported.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="login-state-panel">
      <div>
        <h2>Saved state</h2>
        <p>Restore hidden items and scan filters from an export.</p>
      </div>
      <label className="file-control login-state-panel__control">
        <span>Load exported state</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={importSavedState}
        />
      </label>
      {message ? <p className="success-message success-message--visible">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}

/**
 * Purpose: Build a short user-facing import result message.
 *
 * @param hiddenItemCount - Number of hidden item records imported.
 * @param manualBookMatchCount - Number of manual owned-book matches imported.
 * @param manualSeriesMatchCount - Number of manual series matches imported.
 * @param hasPreferences - Whether scan preferences were present in the file.
 * @returns A concise import summary for the login page.
 */
function buildImportMessage(
  hiddenItemCount: number,
  manualBookMatchCount: number,
  manualSeriesMatchCount: number,
  hasPreferences: boolean
): string {
  const parts = [`${hiddenItemCount} hidden items`];
  if (manualBookMatchCount > 0) parts.push(`${manualBookMatchCount} owned-book matches`);
  if (manualSeriesMatchCount > 0) parts.push(`${manualSeriesMatchCount} series overrides`);
  if (hasPreferences) parts.push("saved filters");

  return `${parts.join(", ")} loaded.`;
}
