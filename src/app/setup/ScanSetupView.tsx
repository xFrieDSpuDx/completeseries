import { FormEvent, useEffect, useState } from "react";
import type { RegionCode } from "../../domain/audiobook";
import type { AuthenticatedScanSession, ScanOptions } from "../../features/scan/runLibraryScan";
import { BrandMark } from "../components/BrandMark";
import { FilterOptions } from "./FilterOptions";
import { LibrarySelector } from "./LibrarySelector";
import { MetadataProviderSelect } from "./MetadataProviderSelect";
import { NativeSelectField } from "../components/NativeSelectField";
import { regions, type ScanFilters } from "./scanFormTypes";
import { loadScanPreferences, saveScanPreferences } from "./scanPreferencesStore";

type ScanSetupViewProps = {
  error: string;
  isScanning: boolean;
  onStartScan: (options: ScanOptions) => Promise<void>;
  session: AuthenticatedScanSession;
};

/**
 * Purpose: Render the post-login scan setup screen where users select
 * libraries, catalogue region, lookup depth, and V1-compatible filters.
 *
 * @param props - Scan setup inputs and callbacks.
 * @param props.error - Error message from the most recent scan attempt.
 * @param props.isScanning - Whether a scan is already running.
 * @param props.onStartScan - Callback that starts the missing-book scan.
 * @param props.session - Reusable authenticated session and loaded libraries.
 * @returns The library and filter setup stage.
 */
export function ScanSetupView({
  error,
  isScanning,
  onStartScan,
  session,
}: ScanSetupViewProps) {
  const [initialPreferences] = useState(loadScanPreferences);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(
    initialPreferences.selectedLibraryIds
  );
  const [region, setRegion] = useState<RegionCode>(initialPreferences.region);
  const [filters, setFilters] = useState<ScanFilters>(initialPreferences.filters);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setSelectedLibraryIds((savedLibraryIds) => {
      const availableLibraryIds = new Set(session.libraries.map((library) => library.id));
      const validSavedIds = savedLibraryIds.filter((libraryId) =>
        availableLibraryIds.has(libraryId)
      );

      return validSavedIds.length > 0
        ? validSavedIds
        : session.libraries.map((library) => library.id);
    });
  }, [session]);

  useEffect(() => {
    const nextPreferences = { filters, region, selectedLibraryIds };
    saveScanPreferences(nextPreferences);
  }, [filters, region, selectedLibraryIds]);

  /**
   * Purpose: Validate the setup stage and start scanning selected libraries.
   *
   * @param event - Browser form submit event.
   * @returns A promise that resolves after the scan-start callback finishes.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (selectedLibraryIds.length === 0) {
      setFormError("Select at least one library to scan.");
      return;
    }

    setFormError("");
    await onStartScan(buildScanOptions());
  }

  /**
   * Purpose: Build complete scan options from the active session and setup
   * selections.
   *
   * @returns Scan options with reusable auth token, selected libraries, region,
   * and filters.
   */
  function buildScanOptions(): ScanOptions {
    return {
      serverUrl: session.serverUrl,
      mode: "apiKey",
      apiKey: session.apiKey,
      availableLibraries: session.libraries,
      selectedLibraryIds,
      region,
      ...filters,
    };
  }

  const selectedCount = selectedLibraryIds.length;

  return (
    <section className="stage-shell stage-shell--centred">
      <form className="login-panel setup-card" onSubmit={handleSubmit}>
        <BrandMark />
        <div className="headingContainer">
          <h1>Select libraries</h1>
          <p>
            {selectedCount} of {session.libraries.length} audiobook libraries selected
          </p>
        </div>

        <div className="settings-panel settings-panel--compact">
          <LibrarySelector
            libraries={session.libraries}
            selectedLibraryIds={selectedLibraryIds}
            onChange={setSelectedLibraryIds}
          />
        </div>

        <div className="setup-settings-stack">
          <div className="setup-settings-grid">
            <div className="settings-panel settings-panel--compact">
              <NativeSelectField
                id="audibleRegion"
                label="Catalogue Region"
                value={region}
                onChange={setRegion}
              >
                {regions.map((availableRegion) => (
                  <option value={availableRegion.value} key={availableRegion.value}>
                    {availableRegion.label}
                  </option>
                ))}
              </NativeSelectField>
            </div>

            <div className="settings-panel settings-panel--compact">
              <MetadataProviderSelect
                id="setupMetadataProviders"
                label="Metadata Providers"
                googleBooksApiKey={filters.googleBooksApiKey}
                providerIds={filters.metadataProviderIds}
                onGoogleBooksApiKeyChange={(googleBooksApiKey) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    googleBooksApiKey,
                  }))
                }
                onChange={(metadataProviderIds) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    metadataProviderIds,
                  }))
                }
              />
            </div>
          </div>

          <FilterOptions
            filters={filters}
            onChange={(patch) => setFilters({ ...filters, ...patch })}
          />
        </div>

        <footer className="setup-actions setup-actions--card">
          <button type="submit" disabled={isScanning}>
            {isScanning ? "Scanning..." : "Scan selected libraries"}
          </button>
          {formError || error ? <div className="error-message">{formError || error}</div> : null}
        </footer>
      </form>
    </section>
  );
}
