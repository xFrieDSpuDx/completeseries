import { useState } from "react";
import type { MetadataLookupMode } from "../../features/scan/runLibraryScan";
import {
  defaultMetadataProviderIds,
  defaultMetadataProviderSearchMode,
  getMetadataProviderSearchModeLabel,
  getMetadataProviderSelectionLabel,
} from "../../integrations/metadata/metadataProviderRegistry";
import { FilterControls } from "./FilterControls";
import { ResultsToolDrawer } from "../results/ResultsToolDrawer";
import { defaultScanFilters, type ScanFilters } from "./scanFormTypes";

type FilterOptionsProps = {
  filters: ScanFilters;
  onChange: (patch: Partial<ScanFilters>) => void;
};

/**
 * Purpose: Render a compact scan-filter summary on the setup page and move the
 * full V1-compatible filter controls into a focused drawer.
 *
 * @param props - Filter UI inputs.
 * @param props.filters - Current filter values.
 * @param props.onChange - Callback used to update one or more filter values.
 * @returns A compact filter summary with a full-screen edit drawer.
 */
export function FilterOptions({ filters, onChange }: FilterOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <section className="filter-summary-card">
      <div>
        <h2>Scan filters</h2>
        <p>
          {getLookupModeLabel(filters.metadataLookupMode)} ·{" "}
          {getMetadataProviderSelectionLabel(filters.metadataProviderIds)} ·{" "}
          {getMetadataProviderSearchModeLabel(filters.metadataProviderSearchMode)} ·{" "}
          {activeFilterCount} active
        </p>
      </div>
      <button className="button-secondary" type="button" onClick={() => setIsOpen(true)}>
        Edit filters
      </button>

      {isOpen ? (
        <ResultsToolDrawer
          title="Scan filters"
          variant="side"
          onClose={() => setIsOpen(false)}
        >
          <div className="filter-drawer-content">
            <FilterControls filters={filters} onChange={onChange} />
            <footer className="filter-drawer-actions">
              <button
                className="button-secondary filter-drawer-actions__secondary"
                type="button"
                onClick={() => onChange(defaultScanFilters)}
              >
                Reset filters
              </button>
              <button type="button" onClick={() => setIsOpen(false)}>
                Done
              </button>
            </footer>
          </div>
        </ResultsToolDrawer>
      ) : null}
    </section>
  );
}

/**
 * Purpose: Convert the selected lookup mode into a compact summary label.
 *
 * @param lookupMode - Current metadata lookup mode.
 * @returns Human-readable lookup mode label for the setup page.
 */
function getLookupModeLabel(lookupMode: MetadataLookupMode): string {
  const labels: Record<MetadataLookupMode, string> = {
    quick: "Quick scan",
    balanced: "Balanced scan",
    thorough: "Thorough scan",
  };

  return labels[lookupMode];
}

/**
 * Purpose: Count enabled scan filters so the collapsed filter summary gives a
 * small amount of context without taking over the setup page.
 *
 * @param filters - Current scan filter values.
 * @returns Number of enabled boolean filters plus one when search depth is not
 * balanced.
 */
function countActiveFilters(filters: ScanFilters): number {
  const booleanFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      key !== "metadataLookupMode" &&
      key !== "metadataProviderIds" &&
      key !== "metadataProviderSearchMode" &&
      value === true
  ).length;
  const lookupModeCount = filters.metadataLookupMode === "balanced" ? 0 : 1;
  const providerCount = areProviderIdsDefault(filters.metadataProviderIds) ? 0 : 1;
  const providerSearchCount =
    filters.metadataProviderSearchMode === defaultMetadataProviderSearchMode ? 0 : 1;

  return booleanFilterCount + lookupModeCount + providerCount + providerSearchCount;
}

/**
 * Purpose: Compare selected metadata providers with the default provider set.
 *
 * @param providerIds - Provider ids selected in the filter state.
 * @returns `true` when the selected providers match the default set.
 */
function areProviderIdsDefault(providerIds: readonly string[]): boolean {
  if (providerIds.length !== defaultMetadataProviderIds.length) return false;

  return defaultMetadataProviderIds.every((providerId) => providerIds.includes(providerId));
}
