type DebugPaginationProps = {
  onPageChange: (pageIndex: number | ((currentPage: number) => number)) => void;
  pageCount: number;
  safePageIndex: number;
};

/**
 * Purpose: Render debug pagination controls separately from the debug table.
 *
 * @param props - Pagination inputs.
 * @param props.onPageChange - Callback that updates the active page index.
 * @param props.pageCount - Total number of pages.
 * @param props.safePageIndex - Current page index, already clamped to the valid
 * page range.
 * @returns Pagination navigation, or nothing when only one page exists.
 */
export function DebugPagination({
  onPageChange,
  pageCount,
  safePageIndex,
}: DebugPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="debug-pagination" aria-label="Debug pages">
      <button
        className="button-secondary"
        type="button"
        disabled={safePageIndex === 0}
        onClick={(event) => {
          event.currentTarget.blur();
          onPageChange((currentPage) => Math.max(0, currentPage - 1));
        }}
      >
        Previous
      </button>
      <span>
        Page {safePageIndex + 1} of {pageCount}
      </span>
      <button
        className="button-secondary"
        type="button"
        disabled={safePageIndex >= pageCount - 1}
        onClick={(event) => {
          event.currentTarget.blur();
          onPageChange((currentPage) => Math.min(pageCount - 1, currentPage + 1));
        }}
      >
        Next
      </button>
    </nav>
  );
}
