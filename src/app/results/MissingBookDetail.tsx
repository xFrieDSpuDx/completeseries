import type { ProviderSeriesBook } from "../../domain/audiobook";
import {
  buildManualBookMatch,
  type ManualBookMatch,
} from "../../domain/manualBookMatches";
import type { MissingBookDiagnostic, MissingBookGroup } from "../../domain/missingBooks";
import {
  createHiddenBookItem,
  type HiddenItem,
} from "../storage/hiddenItemsStore";
import { CoverImage } from "../components/CoverImage";
import { InfoPopover } from "../components/InfoPopover";
import {
  buildProviderSeriesReference,
  getBookOverview,
  getBookPositionBadge,
  getBookSeriesPositions,
  getDiagnosticFlags,
  getProviderPageLink,
  type MissingBooksManualBookSource,
} from "./missingBookDetailHelpers";
import { ReadMoreText } from "../components/ReadMoreText";

const eyeOpenUrl = new URL("../../assets/eye-open.svg", import.meta.url).href;
const eyeClosedUrl = new URL("../../assets/eye-closed.svg", import.meta.url).href;

type MissingBookDetailProps = {
  book: ProviderSeriesBook;
  diagnostic?: MissingBookDiagnostic;
  group: MissingBookGroup;
  isHidden: boolean;
  manualBookMatchSource?: MissingBooksManualBookSource;
  onHideItem: (item: HiddenItem) => void;
  onManualMatchSaved: (message: string) => void;
  onSaveManualBookMatch?: (match: ManualBookMatch) => void;
  onUnhideItem: (item: HiddenItem) => void;
};

/**
 * Purpose: Render one detailed missing-book card inside the selected series
 * drawer.
 *
 * @param props - Book detail inputs.
 * @param props.book - Provider book shown as missing.
 * @param props.diagnostic - Explanation data for why the book was shown.
 * @param props.group - Missing-book group that contains the book.
 * @param props.isHidden - Whether this book is currently hidden locally.
 * @param props.manualBookMatchSource - Optional provider series details for
 * saving this book as manually owned.
 * @param props.onHideItem - Callback that hides the book.
 * @param props.onManualMatchSaved - Callback receiving the saved-match notice.
 * @param props.onSaveManualBookMatch - Optional callback that persists a manual
 * owned-book match.
 * @param props.onUnhideItem - Callback that restores the book.
 * @returns A detailed missing-book card.
 */
export function MissingBookDetail({
  book,
  diagnostic,
  group,
  isHidden,
  manualBookMatchSource,
  onHideItem,
  onManualMatchSaved,
  onSaveManualBookMatch,
  onUnhideItem,
}: MissingBookDetailProps) {
  const hiddenBookItem = createHiddenBookItem(group, book);
  const positionBadge = getBookPositionBadge(book, group);
  const canSaveManualBookMatch = Boolean(manualBookMatchSource && onSaveManualBookMatch);
  const providerPageLink = getProviderPageLink(book, manualBookMatchSource?.region);

  /**
   * Purpose: Save this provider book as already owned so future scans skip it
   * even when provider metadata does not match local Audiobookshelf evidence.
   *
   * @returns Nothing. The parent persists the manual owned-book match.
   */
  function saveManualBookMatch(): void {
    if (!manualBookMatchSource || !onSaveManualBookMatch) return;

    onSaveManualBookMatch(
      buildManualBookMatch(
        book,
        buildProviderSeriesReference(manualBookMatchSource),
        manualBookMatchSource.region
      )
    );
    onManualMatchSaved(
      `${book.title} marked as owned. Saved to this browser's local storage and removed from this result.`
    );
  }

  return (
    <article className="book-detail-card">
      <div className="book-detail-cover">
        <CoverImage className="book-detail-image" src={book.imageUrl} />
        {positionBadge ? <span className="book-position-badge">{positionBadge}</span> : null}
        <button
          className="eye-badge book-detail-eye"
          type="button"
          aria-label={isHidden ? "Restore book" : "Hide book"}
          title={isHidden ? "Restore book" : "Hide book"}
          onClick={() => (isHidden ? onUnhideItem(hiddenBookItem) : onHideItem(hiddenBookItem))}
        >
          <img src={isHidden ? eyeClosedUrl : eyeOpenUrl} alt="" />
        </button>
      </div>
      <div className="book-detail-body">
        <h3>{book.title}</h3>
        {book.subtitle ? <p>{book.subtitle}</p> : null}
        {diagnostic ? <ReasonFlags diagnostic={diagnostic} /> : null}
        <dl className="book-detail-facts">
          <Fact label="Position" value={getBookSeriesPositions(book)} />
          <Fact label="Format" value={book.bookFormat ?? "Unknown"} />
          <Fact label="Release" value={book.releaseDate ?? "Unknown"} />
          <Fact label="Authors" value={book.authors.join(", ") || "Unknown"} />
          <Fact label="Narrators" value={book.narrators.join(", ") || "Unknown"} />
        </dl>
        <div className="book-detail-actions">
          {providerPageLink ? (
            <a className="book-detail-link" href={providerPageLink} target="_blank" rel="noreferrer">
              Open provider page
            </a>
          ) : null}
          {canSaveManualBookMatch ? (
            <span className="book-detail-action-with-help">
              <button
                className="book-detail-action-button"
                type="button"
                title={`Mark ${book.title} as already owned in local storage`}
                onClick={saveManualBookMatch}
              >
                Mark book owned
              </button>
              <InfoPopover ariaLabel="Manual owned-book match information">
                Saves this Audible book as owned in this browser, so future scans skip it even when
                Audiobookshelf metadata does not match cleanly.
              </InfoPopover>
            </span>
          ) : null}
        </div>
        {getBookOverview(book) ? (
          <section className="book-overview">
            <h4>Overview</h4>
            <ReadMoreText text={getBookOverview(book)} />
          </section>
        ) : null}
        {diagnostic ? <BookDiagnosticPanel diagnostic={diagnostic} /> : null}
      </div>
    </article>
  );
}

/**
 * Purpose: Render compact reason flags so visible missing books are easier to
 * scan before opening the detailed diagnostics.
 *
 * @param props - Reason flag inputs.
 * @param props.diagnostic - Diagnostic data for the visible missing book.
 * @returns A compact list of short reason badges.
 */
function ReasonFlags({ diagnostic }: { diagnostic: MissingBookDiagnostic }) {
  const flags = getDiagnosticFlags(diagnostic);
  if (flags.length === 0) return null;

  return (
    <ul className="reason-flags" aria-label="Missing reason flags">
      {flags.map((flag) => (
        <li key={flag}>{flag}</li>
      ))}
    </ul>
  );
}

/**
 * Purpose: Render one label/value fact in a book detail card.
 *
 * @param props - Fact inputs.
 * @param props.label - Fact label.
 * @param props.value - Fact value.
 * @returns A definition-list row.
 */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Purpose: Render detailed diagnostics for one visible missing book.
 *
 * @param props - Diagnostic inputs.
 * @param props.diagnostic - Explanation data for the visible book.
 * @returns A collapsible diagnostics panel.
 */
function BookDiagnosticPanel({ diagnostic }: { diagnostic: MissingBookDiagnostic }) {
  return (
    <details className="book-diagnostics book-diagnostics--modal">
      <summary>Why listed?</summary>
      <ul>
        {diagnostic.shownBecause.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <ul>
        {diagnostic.providerEvidence.map((evidence) => (
          <li key={evidence}>{evidence}</li>
        ))}
      </ul>
    </details>
  );
}
