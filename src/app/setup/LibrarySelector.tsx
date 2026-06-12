import type { AudiobookshelfLibrary } from "../../integrations/audiobookshelf/audiobookshelfClient";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";

type LibrarySelectorProps = {
  libraries: AudiobookshelfLibrary[];
  selectedLibraryIds: string[];
  onChange: (selectedLibraryIds: string[]) => void;
};

/**
 * Purpose: Render library selection after libraries have been loaded from
 * Audiobookshelf.
 *
 * @param props - Library selector inputs.
 * @param props.libraries - Audiobookshelf libraries available to the user.
 * @param props.selectedLibraryIds - Library ids selected for the next scan.
 * @param props.onChange - Callback receiving the next selected id list.
 * @returns A selectable library panel.
 */
export function LibrarySelector({ libraries, selectedLibraryIds, onChange }: LibrarySelectorProps) {
  return (
    <MultiSelectDropdown
      id="librarySelector"
      label="Libraries"
      options={libraries.map((library) => ({
        label: library.name,
        value: library.id,
      }))}
      selectedValues={selectedLibraryIds}
      summary={buildLibrarySelectionSummary(libraries.length, selectedLibraryIds.length)}
      onChange={onChange}
    />
  );
}

/**
 * Purpose: Build the collapsed library selector text from selected and
 * available library counts.
 *
 * @param libraryCount - Number of libraries loaded from Audiobookshelf.
 * @param selectedCount - Number of libraries selected for scanning.
 * @returns Compact library selection summary.
 */
function buildLibrarySelectionSummary(libraryCount: number, selectedCount: number): string {
  if (libraryCount === 0) return "No libraries available";
  if (selectedCount === libraryCount) return `All ${libraryCount} selected`;
  if (selectedCount === 0) return "No libraries selected";

  return `${selectedCount} of ${libraryCount} selected`;
}
