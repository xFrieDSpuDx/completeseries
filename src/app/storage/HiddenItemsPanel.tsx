import { useState } from "react";
import { EmptyState } from "../../shared/EmptyState";
import { normaliseText } from "../../domain/normalise";
import {
  countHiddenItems,
  type HiddenItem,
} from "./hiddenItemsStore";

type HiddenItemsPanelProps = {
  hiddenItems: HiddenItem[];
  onClear: () => void;
  onUnhide: (item: HiddenItem) => void;
  onShowHiddenChange?: (showHidden: boolean) => void;
  showHidden?: boolean;
};

const MAX_VISIBLE_HIDDEN_ITEMS = 150;

/**
 * Purpose: Render the hidden series and books manager restored from V1.
 *
 * @param props - Hidden item manager inputs and callbacks.
 * @param props.hiddenItems - Currently hidden books and series.
 * @param props.onClear - Callback that clears every hidden item.
 * @param props.onUnhide - Callback that restores one hidden item.
 * @param props.onShowHiddenChange - Optional callback for toggling hidden items
 * in result views.
 * @param props.showHidden - Whether hidden result items are currently visible.
 * @returns A hidden item management panel.
 */
export function HiddenItemsPanel({
  hiddenItems,
  onClear,
  onUnhide,
  onShowHiddenChange,
  showHidden = false,
}: HiddenItemsPanelProps) {
  const [searchText, setSearchText] = useState("");
  const counts = countHiddenItems(hiddenItems);
  const searchKey = normaliseText(searchText);
  const filteredItems = searchKey
    ? hiddenItems.filter((item) => hiddenItemMatchesSearch(item, searchKey))
    : hiddenItems;
  const hiddenSeries = filteredItems.filter((item) => item.type === "series");
  const hiddenBooks = filteredItems.filter((item) => item.type === "book");

  return (
    <section className="utility-panel">
      <header className="utility-panel__header">
        <div>
          <h2>Hidden items</h2>
          <p>
            {counts.series} series, {counts.books} books
          </p>
        </div>
        <button
          className="button-secondary utility-panel__button"
          type="button"
          onClick={onClear}
          disabled={hiddenItems.length === 0}
        >
          Clear
        </button>
      </header>

      {onShowHiddenChange ? (
        <label className="checkbox-row checkbox-row--compact">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(event) => onShowHiddenChange(event.target.checked)}
          />
          Show hidden items
        </label>
      ) : null}

      {hiddenItems.length > 12 ? (
        <label className="hidden-items-search" htmlFor="hiddenItemsSearch">
          <span>Search hidden items</span>
          <input
            id="hiddenItemsSearch"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Series or title"
          />
        </label>
      ) : null}

      <HiddenItemList
        isSearching={Boolean(searchKey)}
        title="Series"
        items={hiddenSeries}
        onUnhide={onUnhide}
      />
      <HiddenItemList
        isSearching={Boolean(searchKey)}
        title="Books"
        items={hiddenBooks}
        onUnhide={onUnhide}
      />
    </section>
  );
}

/**
 * Purpose: Check whether a hidden item should remain visible for a search term.
 *
 * @param item - Hidden item record.
 * @param searchKey - Normalised user search text.
 * @returns `true` when the hidden item series, title, or ASIN matches.
 */
function hiddenItemMatchesSearch(item: HiddenItem, searchKey: string): boolean {
  return [item.seriesName, item.title, item.asin, item.seriesAsin]
    .map(normaliseText)
    .some((value) => value.includes(searchKey));
}

/**
 * Purpose: Render one typed hidden item list.
 *
 * @param props - List inputs.
 * @param props.isSearching - Whether the list has been filtered by search.
 * @param props.title - List heading.
 * @param props.items - Hidden items to render.
 * @param props.onUnhide - Callback that restores one hidden item.
 * @returns A compact hidden item list.
 */
function HiddenItemList({
  isSearching,
  title,
  items,
  onUnhide,
}: {
  isSearching: boolean;
  title: string;
  items: HiddenItem[];
  onUnhide: (item: HiddenItem) => void;
}) {
  const visibleItems = items.slice(0, MAX_VISIBLE_HIDDEN_ITEMS);
  const hiddenOverflowCount = items.length - visibleItems.length;

  return (
    <div className="hidden-list-block">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <>
          {hiddenOverflowCount > 0 ? (
            <p className="hidden-list-note">
              Showing first {visibleItems.length} of {items.length}. Use search to narrow the list.
            </p>
          ) : null}
          <ul className="hidden-items-list">
            {visibleItems.map((item) => (
              <li
                key={`${item.type}-${item.seriesAsin ?? item.seriesName}-${item.asin ?? item.title}`}
              >
                <span>{item.title ? `${item.seriesName}: ${item.title}` : item.seriesName}</span>
                <button type="button" onClick={() => onUnhide(item)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          compact
          title={
            isSearching
              ? `No hidden ${title.toLowerCase()} match`
              : `No hidden ${title.toLowerCase()}`
          }
        >
          {isSearching
            ? "Try a different search term."
            : `Hidden ${title.toLowerCase()} will appear here when you hide them from results.`}
        </EmptyState>
      )}
    </div>
  );
}
