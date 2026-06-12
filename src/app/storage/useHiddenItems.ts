import { useState } from "react";
import {
  loadHiddenItems,
  mergeHiddenItems,
  removeHiddenItem,
  saveHiddenItems,
  upsertHiddenItem,
  type HiddenItem,
} from "./hiddenItemsStore";

export type HiddenItemsActions = {
  hideItem: (item: HiddenItem) => void;
  unhideItem: (item: HiddenItem) => void;
  clearHiddenItems: () => void;
  importHiddenItems: (items: HiddenItem[]) => void;
};

/**
 * Purpose: Keep hidden books and series in React state while persisting each
 * change to browser local storage.
 *
 * @returns The current hidden item list and mutation helpers.
 */
export function useHiddenItems(): { hiddenItems: HiddenItem[] } & HiddenItemsActions {
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>(loadHiddenItems);

  /**
   * Purpose: Persist a new hidden item list and update React state.
   *
   * @param nextHiddenItems - Hidden item list to store.
   * @returns Nothing. State and local storage are updated together.
   */
  function persistHiddenItems(nextHiddenItems: HiddenItem[]): void {
    setHiddenItems(nextHiddenItems);
    saveHiddenItems(nextHiddenItems);
  }

  return {
    hiddenItems,
    hideItem: (item) => persistHiddenItems(upsertHiddenItem(hiddenItems, item)),
    unhideItem: (item) => persistHiddenItems(removeHiddenItem(hiddenItems, item)),
    clearHiddenItems: () => persistHiddenItems([]),
    importHiddenItems: (items) => persistHiddenItems(mergeHiddenItems(hiddenItems, items)),
  };
}
