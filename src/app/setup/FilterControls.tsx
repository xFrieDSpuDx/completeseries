import { useId, type ReactNode } from "react";
import { InfoPopover } from "../components/InfoPopover";
import { MetadataProviderSelect } from "./MetadataProviderSelect";
import { NativeSelectField } from "../components/NativeSelectField";
import type { ScanFilters } from "./scanFormTypes";

type FilterControlsProps = {
  filters: ScanFilters;
  onChange: (patch: Partial<ScanFilters>) => void;
};

/**
 * Purpose: Render the full scan-filter control set so setup and results can
 * share one source of truth for filter editing.
 *
 * @param props - Filter control inputs.
 * @param props.filters - Current filter values.
 * @param props.onChange - Callback used to update one or more filter values.
 * @returns V1-compatible filter controls grouped by scan concern.
 */
export function FilterControls({ filters, onChange }: FilterControlsProps) {
  return (
    <>
      <div className="filter-group filter-group--search">
        <h3>Catalogue Search</h3>
        <NativeSelectField
          help={
            <InfoPopover ariaLabel="Search depth information">
              Quick uses the strongest ASIN anchor. Balanced checks a small spread of books.
              Thorough checks every usable ASIN and takes longer.
            </InfoPopover>
          }
          id="metadataLookupMode"
          label="Search depth"
          value={filters.metadataLookupMode}
          onChange={(metadataLookupMode) => onChange({ metadataLookupMode })}
        >
          <option value="quick">Quick scan</option>
          <option value="balanced">Balanced scan</option>
          <option value="thorough">Thorough scan</option>
        </NativeSelectField>
      </div>

      <FilterGroup title="Book Types">
        <CheckboxRow
          checked={filters.onlyUnabridged}
          helpText="Keeps abridged editions out of missing results when Audible clearly marks the format."
          label="Only show unabridged editions"
          onChange={(onlyUnabridged) => onChange({ onlyUnabridged })}
        />
        <CheckboxRow
          checked={filters.ignoreMultiBooks}
          helpText="Hides omnibus or combined editions that cover a range of series positions, such as #1-3."
          label="Hide omnibus and multi-book editions"
          onChange={(ignoreMultiBooks) => onChange({ ignoreMultiBooks })}
        />
      </FilterGroup>

      <FilterGroup title="Series">
        <CheckboxRow
          checked={filters.includeSubSeries}
          helpText="Uses every series listed on each Audible book instead of only the first matched series."
          label="Include subseries results"
          onChange={(includeSubSeries) => onChange({ includeSubSeries })}
        />
      </FilterGroup>

      <FilterGroup title="Series Position">
        <CheckboxRow
          checked={filters.ignoreNoPositionBooks}
          helpText="Hides provider books that do not have a usable number in the matched series."
          label="Hide books without a series position"
          onChange={(ignoreNoPositionBooks) => onChange({ ignoreNoPositionBooks })}
        />
        <CheckboxRow
          checked={filters.ignoreSubPositionBooks}
          helpText="Hides decimal entries that are often novellas, short stories, or side releases."
          label="Hide decimal positions, e.g. #3.5"
          onChange={(ignoreSubPositionBooks) => onChange({ ignoreSubPositionBooks })}
        />
        <CheckboxRow
          checked={filters.ignoreSameSeriesPosition}
          helpText="Hides a provider book when your library already has a book at that same series position."
          label="Hide positions already owned"
          onChange={(ignoreSameSeriesPosition) => onChange({ ignoreSameSeriesPosition })}
        />
        <CheckboxRow
          checked={filters.ignoreSameSeriesPositionInMissingArray}
          helpText="When Audible returns several editions for the same missing position, keeps only the first one."
          label="Collapse duplicate missing positions"
          onChange={(ignoreSameSeriesPositionInMissingArray) =>
            onChange({ ignoreSameSeriesPositionInMissingArray })
          }
        />
      </FilterGroup>

      <FilterGroup title="Name">
        <CheckboxRow
          checked={filters.ignoreTitleSubtitle}
          helpText="Hides a provider book when title and subtitle match a book already in your library."
          label="Hide title/subtitle matches already owned"
          onChange={(ignoreTitleSubtitle) => onChange({ ignoreTitleSubtitle })}
        />
        <CheckboxRow
          checked={filters.matchNarratorEditions}
          helpText="Makes title matching stricter, so a different narrator can still be shown as a missing edition."
          label="Treat narrator changes as separate editions"
          onChange={(matchNarratorEditions) => onChange({ matchNarratorEditions })}
        />
        <CheckboxRow
          checked={filters.ignoreTitleSubtitleInMissingArray}
          helpText="When Audible returns several editions with the same title and subtitle, keeps only the first one."
          label="Collapse duplicate missing titles"
          onChange={(ignoreTitleSubtitleInMissingArray) =>
            onChange({ ignoreTitleSubtitleInMissingArray })
          }
        />
      </FilterGroup>

      <FilterGroup title="Date">
        <CheckboxRow
          checked={filters.ignoreFutureDateBooks}
          helpText="Hides books with a future Audible release date."
          label="Hide unreleased books"
          onChange={(ignoreFutureDateBooks) => onChange({ ignoreFutureDateBooks })}
        />
        <CheckboxRow
          checked={filters.ignoreFuturePlaceholders}
          helpText="Hides empty Audible placeholder records with far-future release dates, such as 2200-01-01."
          label="Hide empty future placeholders"
          onChange={(ignoreFuturePlaceholders) => onChange({ ignoreFuturePlaceholders })}
        />
        <CheckboxRow
          checked={filters.ignorePastDateBooks}
          helpText="Only useful for release-watch workflows; hides books released today or earlier."
          label="Hide already released books"
          onChange={(ignorePastDateBooks) => onChange({ ignorePastDateBooks })}
        />
      </FilterGroup>

      <FilterGroup title="Provider">
        <div className="filter-label-with-help">
          <h4>Metadata source</h4>
          <InfoPopover ariaLabel="Metadata provider information">
            Audible is the default provider. Select extra providers for broader matching, then use
            deep provider search when you want every selected provider checked. Apple Books,
            Google Books, and Open Library are limited because they do not expose Audible-style
            audiobook series metadata.
          </InfoPopover>
        </div>
        <MetadataProviderSelect
          id="filterMetadataProviders"
          label="Metadata Providers"
          googleBooksApiKey={filters.googleBooksApiKey}
          providerIds={filters.metadataProviderIds}
          onGoogleBooksApiKeyChange={(googleBooksApiKey) => onChange({ googleBooksApiKey })}
          onChange={(metadataProviderIds) => onChange({ metadataProviderIds })}
        />
        <NativeSelectField
          help={
            <InfoPopover ariaLabel="Provider search information">
              First provider match is quicker and stops once selected metadata providers find
              candidates. Deep provider search checks every selected provider and merges the
              evidence.
            </InfoPopover>
          }
          id="metadataProviderSearchMode"
          label="Provider search"
          value={filters.metadataProviderSearchMode}
          onChange={(metadataProviderSearchMode) => onChange({ metadataProviderSearchMode })}
        >
          <option value="firstMatch">First provider match</option>
          <option value="deep">Deep provider search</option>
        </NativeSelectField>
        <CheckboxRow
          checked={filters.cacheMetadata}
          helpText="Keeps supported provider catalogue responses in this browser so repeat scans make fewer requests."
          label="Reuse catalogue cache"
          onChange={(cacheMetadata) => onChange({ cacheMetadata })}
        />
      </FilterGroup>
    </>
  );
}

/**
 * Purpose: Render a named group inside the filters panel.
 *
 * @param props - Group content.
 * @param props.title - Group heading.
 * @param props.children - Filter controls in this group.
 * @returns A grouped filter section.
 */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="filter-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/**
 * Purpose: Render one checkbox filter row.
 *
 * @param props - Checkbox inputs.
 * @param props.checked - Whether the checkbox is currently selected.
 * @param props.helpText - Optional explanation shown in the info popover.
 * @param props.label - Visible filter label.
 * @param props.onChange - Callback receiving the next checked state.
 * @returns A labelled checkbox row.
 */
function CheckboxRow({
  checked,
  helpText,
  label,
  onChange,
}: {
  checked: boolean;
  helpText?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const checkboxId = useId();

  return (
    <div className="checkbox-row checkbox-row--toggle">
      <span className="checkbox-row__label">
        <label htmlFor={checkboxId}>{label}</label>
        {helpText ? (
          <InfoPopover ariaLabel={`${label} information`}>{helpText}</InfoPopover>
        ) : null}
      </span>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
