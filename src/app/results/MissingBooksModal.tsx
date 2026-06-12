import { useState } from "react";
import {
  findManualBookMatch,
  type ManualBookMatch,
} from "../../domain/manualBookMatches";
import type { MissingBookGroup } from "../../domain/missingBooks";
import { EmptyState } from "../../shared/EmptyState";
import {
  isHiddenBook,
  type HiddenItem,
} from "../storage/hiddenItemsStore";
import {
  MissingBookDetail,
} from "./MissingBookDetail";
import {
  buildProviderSeriesReference,
  type MissingBooksManualBookSource,
} from "./missingBookDetailHelpers";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const closeIconUrl = new URL("../../assets/close.svg", import.meta.url).href;

type MissingBooksModalProps = {
  group: MissingBookGroup;
  hiddenItems: HiddenItem[];
  manualBookMatches: ManualBookMatch[];
  manualBookMatchSource?: MissingBooksManualBookSource;
  onClose: () => void;
  onHideItem: (item: HiddenItem) => void;
  onSaveManualBookMatch?: (match: ManualBookMatch) => void;
  onUnhideItem: (item: HiddenItem) => void;
};

/**
 * Purpose: Render a modal-style drill-down for every missing book in one
 * series.
 *
 * @param props - Modal inputs.
 * @param props.group - Missing-book group selected from the results grid.
 * @param props.hiddenItems - Hidden books and series saved locally.
 * @param props.manualBookMatches - Books manually marked as already owned.
 * @param props.manualBookMatchSource - Provider series details used to save a
 * manual owned-book match from this drawer.
 * @param props.onClose - Callback that closes the modal.
 * @param props.onHideItem - Callback that hides one book.
 * @param props.onSaveManualBookMatch - Optional callback that saves a manual
 * owned-book match.
 * @param props.onUnhideItem - Callback that restores one book.
 * @returns A modal overlay containing detailed missing-book cards.
 */
export function MissingBooksModal({
  group,
  hiddenItems,
  manualBookMatches,
  manualBookMatchSource,
  onClose,
  onHideItem,
  onSaveManualBookMatch,
  onUnhideItem,
}: MissingBooksModalProps) {
  const [manualMatchMessage, setManualMatchMessage] = useState("");
  const visibleBooks = manualBookMatchSource
    ? group.books.filter(
        (book) =>
          !findManualBookMatch(
            book,
            buildProviderSeriesReference(manualBookMatchSource),
            manualBookMatchSource.region,
            manualBookMatches
          )
      )
    : group.books;

  useBodyScrollLock();

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="bookModalTitle">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="books-modal-panel">
        <header className="books-modal-header">
          <div>
            <h2 id="bookModalTitle">{group.seriesName}</h2>
            <p>{formatMissingBookCount(visibleBooks.length)}</p>
          </div>
          <button
            className="modal-close icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <img src={closeIconUrl} alt="" />
          </button>
        </header>

        {manualMatchMessage ? (
          <div className="book-modal-notice">{manualMatchMessage}</div>
        ) : null}

        {isMergedGroup(group) ? <MergedSeriesSummary group={group} /> : null}

        <div className="books-modal-grid">
          {visibleBooks.map((book) => (
            <MissingBookDetail
              book={book}
              diagnostic={group.diagnosticsByAsin[book.asin]}
              group={group}
              isHidden={isHiddenBook(hiddenItems, group, book)}
              manualBookMatchSource={manualBookMatchSource}
              key={book.asin}
              onHideItem={onHideItem}
              onManualMatchSaved={setManualMatchMessage}
              onSaveManualBookMatch={onSaveManualBookMatch}
              onUnhideItem={onUnhideItem}
            />
          ))}
          {visibleBooks.length === 0 ? (
            <EmptyState compact title="No visible missing books remain">
              These books may be hidden or marked as already owned.
            </EmptyState>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * Purpose: Format the visible missing-book count without awkward plural text.
 *
 * @param count - Number of visible missing books in the opened result group.
 * @returns Human-readable count label for the drawer header.
 */
function formatMissingBookCount(count: number): string {
  return `${count} missing ${count === 1 ? "book" : "books"}`;
}

/**
 * Purpose: Decide whether a missing-books drawer should show merged-series
 * provenance.
 *
 * @param group - Missing-book group opened from the results grid.
 * @returns `true` when multiple provider series were merged into this result.
 */
function isMergedGroup(group: MissingBookGroup): group is MissingBookGroup & {
  mergedFrom: NonNullable<MissingBookGroup["mergedFrom"]>;
} {
  return (group.mergedFrom?.length ?? 0) > 1;
}

/**
 * Purpose: Render the provider series that were folded into one visible result
 * group.
 *
 * @param props - Merged result group.
 * @param props.group - Missing-book group with source-series metadata.
 * @returns A compact source-series summary.
 */
function MergedSeriesSummary({
  group,
}: {
  group: MissingBookGroup & { mergedFrom: NonNullable<MissingBookGroup["mergedFrom"]> };
}) {
  return (
    <section className="merged-series-summary" aria-label="Merged series details">
      <h3>Merged from {group.mergedFrom.length} series</h3>
      <ul>
        {group.mergedFrom.map((source) => (
          <li key={`${source.providerId ?? "provider"}:${source.seriesAsin}:${source.seriesName}`}>
            <span>{source.seriesName}</span>
            <small>
              {source.providerName ?? "Metadata provider"} ·{" "}
              {formatSourceMissingBookCount(source.missingBookCount)}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Purpose: Format the number of missing books a source group had before merge
 * de-duplication.
 *
 * @param count - Missing-book count from the source series.
 * @returns Human-readable source count.
 */
function formatSourceMissingBookCount(count: number): string {
  return `${count} source ${count === 1 ? "book" : "books"}`;
}
