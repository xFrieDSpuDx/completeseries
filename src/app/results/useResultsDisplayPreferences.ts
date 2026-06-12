import { useState } from "react";
import {
  clearResultsPreferences,
  defaultResultsPreferences,
  loadResultsPreferences,
  saveResultsPreferences,
  type ResultsPreferences,
} from "./resultsPreferencesStore";
import type { ResultsSortOrder } from "./visibleResults";

export type ResultsDisplayPreferencesState = {
  changeShowHiddenItems: (shouldShowHiddenItems: boolean) => void;
  changeSortOrder: (nextSortOrder: ResultsSortOrder) => void;
  clearResultsDisplayPreferences: () => void;
  importResultsPreferences: (preferences: ResultsPreferences) => void;
  showHiddenItems: boolean;
  sortOrder: ResultsSortOrder;
};

/**
 * Purpose: Keep result-display preferences in React state and browser storage
 * without making the results view own storage details directly.
 *
 * @returns Current result-display preferences and mutators that persist each
 * change.
 */
export function useResultsDisplayPreferences(): ResultsDisplayPreferencesState {
  const [showHiddenItems, setShowHiddenItems] = useState(
    () => loadResultsPreferences().showHiddenItems
  );
  const [sortOrder, setSortOrder] = useState<ResultsSortOrder>(
    () => loadResultsPreferences().sortOrder
  );

  /**
   * Purpose: Persist the selected result sort order as soon as it changes.
   *
   * @param nextSortOrder - Sort order selected by the user.
   * @returns Nothing. State and browser storage are updated together.
   */
  function changeSortOrder(nextSortOrder: ResultsSortOrder): void {
    setSortOrder(nextSortOrder);
    saveResultsPreferences({ showHiddenItems, sortOrder: nextSortOrder });
  }

  /**
   * Purpose: Persist whether hidden result items should be visible.
   *
   * @param shouldShowHiddenItems - Whether hidden items should be shown.
   * @returns Nothing. State and browser storage are updated together.
   */
  function changeShowHiddenItems(shouldShowHiddenItems: boolean): void {
    setShowHiddenItems(shouldShowHiddenItems);
    saveResultsPreferences({ showHiddenItems: shouldShowHiddenItems, sortOrder });
  }

  /**
   * Purpose: Apply imported results-page display preferences immediately.
   *
   * @param preferences - Imported display preferences.
   * @returns Nothing. State and browser storage are updated together.
   */
  function importResultsPreferences(preferences: ResultsPreferences): void {
    setShowHiddenItems(preferences.showHiddenItems);
    setSortOrder(preferences.sortOrder);
    saveResultsPreferences(preferences);
  }

  /**
   * Purpose: Clear result-display preferences from storage and reset this view
   * to the defaults.
   *
   * @returns Nothing. State and browser storage are reset.
   */
  function clearResultsDisplayPreferences(): void {
    clearResultsPreferences();
    setShowHiddenItems(defaultResultsPreferences.showHiddenItems);
    setSortOrder(defaultResultsPreferences.sortOrder);
  }

  return {
    changeShowHiddenItems,
    changeSortOrder,
    clearResultsDisplayPreferences,
    importResultsPreferences,
    showHiddenItems,
    sortOrder,
  };
}
