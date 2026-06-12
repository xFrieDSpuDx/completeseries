import type { RegionCode } from "../../domain/audiobook";
import { FilterControls } from "./FilterControls";
import { InfoPopover } from "../components/InfoPopover";
import { NativeSelectField } from "../components/NativeSelectField";
import { regions, type ScanFilters } from "./scanFormTypes";

type ScanPreferenceControlsProps = {
  filters: ScanFilters;
  onFiltersChange: (patch: Partial<ScanFilters>) => void;
  onRegionChange: (region: RegionCode) => void;
  region: RegionCode;
};

/**
 * Purpose: Render region and filter controls used before scans and when
 * editing scan settings from the results page.
 *
 * @param props - Scan preference inputs.
 * @param props.filters - Current scan filter values.
 * @param props.onFiltersChange - Callback receiving filter patches.
 * @param props.onRegionChange - Callback receiving the selected catalogue
 * region.
 * @param props.region - Current catalogue region.
 * @returns Shared scan preference controls.
 */
export function ScanPreferenceControls({
  filters,
  onFiltersChange,
  onRegionChange,
  region,
}: ScanPreferenceControlsProps) {
  return (
    <>
      <div className="filter-group filter-group--search">
        <div className="filter-label-with-help">
          <h3>Catalogue Region</h3>
          <InfoPopover ariaLabel="Catalogue region information">
            Use the shop region that matches where you can buy or listen to the books. Region
            mismatches can make owned books look missing.
          </InfoPopover>
        </div>
        <NativeSelectField
          id="audibleRegionPreference"
          label="Region"
          value={region}
          onChange={onRegionChange}
        >
          {regions.map((availableRegion) => (
            <option value={availableRegion.value} key={availableRegion.value}>
              {availableRegion.label}
            </option>
          ))}
        </NativeSelectField>
      </div>

      <div className="filter-drawer-content filter-drawer-content--results">
        <FilterControls filters={filters} onChange={onFiltersChange} />
      </div>
    </>
  );
}
