import type { MissingBookGroup } from "../../domain/missingBooks";
import { CoverImage } from "../components/CoverImage";
import {
  createHiddenSeriesItem,
  isHiddenSeries,
  type HiddenItem,
} from "../storage/hiddenItemsStore";
import type { VisibleMissingBookGroup } from "./visibleResults";

const eyeOpenUrl = new URL("../../assets/eye-open.svg", import.meta.url).href;
const eyeClosedUrl = new URL("../../assets/eye-closed.svg", import.meta.url).href;

type ResultsSeriesGridProps = {
  groups: VisibleMissingBookGroup[];
  hiddenItems: HiddenItem[];
  onHideItem: (item: HiddenItem) => void;
  onSelectGroup: (group: MissingBookGroup) => void;
  onUnhideItem: (item: HiddenItem) => void;
};

type SeriesTileActionsProps = Omit<ResultsSeriesGridProps, "groups"> & {
  group: VisibleMissingBookGroup;
};

/**
 * Purpose: Render compact result series tiles that open the book detail drawer.
 *
 * @param props - Result grid inputs and callbacks.
 * @param props.groups - Visible missing-book groups.
 * @param props.hiddenItems - Hidden books and series saved locally.
 * @param props.onHideItem - Callback that hides a book or series.
 * @param props.onSelectGroup - Callback that opens the series detail modal.
 * @param props.onUnhideItem - Callback that restores a book or series.
 * @returns A grid of result series tiles.
 */
export function ResultsSeriesGrid({
  groups,
  hiddenItems,
  onHideItem,
  onSelectGroup,
  onUnhideItem,
}: ResultsSeriesGridProps) {
  return (
    <div className="series-grid">
      {groups.map((group) => (
        <article
          className={`series-tile${group.isHidden ? " series-tile--hidden" : ""}${
            group.confidence ? " series-tile--low-confidence" : ""
          }`}
          key={buildSeriesTileKey(group)}
        >
          <SeriesHideButton
            group={group}
            hiddenItems={hiddenItems}
            onHideItem={onHideItem}
            onUnhideItem={onUnhideItem}
          />
          <button
            className="series-tile-main"
            type="button"
            onClick={() => onSelectGroup(group)}
          >
            <div className="series-badge">{group.books.length}</div>
            <div className="series-image-wrap">
              <CoverImage src={group.books[0]?.imageUrl} />
              {isMergedGroup(group) ? (
                <span
                  className="series-merged-note"
                  title={`Merged from ${getMergedSeriesNames(group).join(", ")}`}
                >
                  Merged {group.mergedFrom.length} series
                </span>
              ) : null}
              {group.confidence ? (
                <span
                  className="series-confidence-badge"
                  title={`${group.confidence.label}: ${group.confidence.reason}`}
                >
                  Confidence {group.confidence.score}%
                </span>
              ) : null}
            </div>
            <h3 className="series-title">{group.seriesName}</h3>
          </button>
        </article>
      ))}
    </div>
  );
}

/**
 * Purpose: Build a React key that keeps trusted and tentative cards distinct
 * even when providers reuse the same series identifier.
 *
 * @param group - Visible result group represented by the card.
 * @returns Stable card key for rendering.
 */
function buildSeriesTileKey(group: VisibleMissingBookGroup): string {
  return [
    group.providerId ?? "provider",
    group.seriesAsin,
    group.confidence ? "tentative" : "trusted",
  ].join(":");
}

/**
 * Purpose: Decide whether a result card represents multiple merged provider
 * series.
 *
 * @param group - Visible result group.
 * @returns `true` when the group carries multiple source-series entries.
 */
function isMergedGroup(group: VisibleMissingBookGroup): group is VisibleMissingBookGroup & {
  mergedFrom: NonNullable<VisibleMissingBookGroup["mergedFrom"]>;
} {
  return (group.mergedFrom?.length ?? 0) > 1;
}

/**
 * Purpose: Build a compact list of source series names for the merged-card
 * tooltip.
 *
 * @param group - Merged visible result group.
 * @returns Source series names.
 */
function getMergedSeriesNames(
  group: VisibleMissingBookGroup & {
    mergedFrom: NonNullable<VisibleMissingBookGroup["mergedFrom"]>;
  }
): string[] {
  return group.mergedFrom.map((source) => source.seriesName);
}

/**
 * Purpose: Render the compact eye control for hiding or restoring one series.
 *
 * @param props - Hide button inputs.
 * @param props.group - Missing-book group represented by the tile.
 * @param props.hiddenItems - Hidden books and series saved locally.
 * @param props.onHideItem - Callback that hides the series.
 * @param props.onUnhideItem - Callback that restores the series.
 * @returns An icon button for series visibility.
 */
function SeriesHideButton({
  group,
  hiddenItems,
  onHideItem,
  onUnhideItem,
}: Omit<SeriesTileActionsProps, "onSelectGroup">) {
  const seriesIsHidden = isHiddenSeries(hiddenItems, group);
  const hiddenSeriesItem = createHiddenSeriesItem(group);

  return (
    <button
      aria-label={seriesIsHidden ? "Restore series" : "Hide series"}
      className="eye-badge"
      title={seriesIsHidden ? "Restore series" : "Hide series"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (seriesIsHidden) onUnhideItem(hiddenSeriesItem);
        else onHideItem(hiddenSeriesItem);
      }}
    >
      <img src={seriesIsHidden ? eyeClosedUrl : eyeOpenUrl} alt="" />
    </button>
  );
}
