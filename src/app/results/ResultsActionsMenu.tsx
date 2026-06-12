import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { NativeSelectField } from "../components/NativeSelectField";
import type { ResultsSortOrder } from "./visibleResults";

export type ResultsToolId =
  | "filters"
  | "libraries"
  | "server"
  | "hidden"
  | "data"
  | "download"
  | "review"
  | "debug";

type ResultsActionsMenuProps = {
  lowConfidenceCount: number;
  onOpenTool: (tool: ResultsToolId) => void;
  onScanAgain?: () => void;
  onShowLowConfidenceChange: (showLowConfidenceResults: boolean) => void;
  onSortOrderChange: (sortOrder: ResultsSortOrder) => void;
  showLowConfidenceResults: boolean;
  sortOrder: ResultsSortOrder;
};

type CommandBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

/**
 * Purpose: Render result actions in a compact sticky ribbon so common tools
 * stay reachable without extra menu clicks.
 *
 * @param props - Result action callbacks.
 * @param props.lowConfidenceCount - Number of tentative result groups
 * available behind the explicit low-confidence toggle.
 * @param props.onOpenTool - Callback that opens a result tool drawer.
 * @param props.onScanAgain - Optional callback that repeats the last scan.
 * @param props.onShowLowConfidenceChange - Callback that toggles tentative
 * lower-confidence result groups.
 * @param props.onSortOrderChange - Callback that changes visible result order.
 * @param props.showLowConfidenceResults - Whether tentative lower-confidence
 * result groups are currently included.
 * @param props.sortOrder - Current visible result sort order.
 * @returns Responsive result action navigation.
 */
export function ResultsActionsMenu({
  lowConfidenceCount,
  onOpenTool,
  onScanAgain,
  onShowLowConfidenceChange,
  onSortOrderChange,
  showLowConfidenceResults,
  sortOrder,
}: ResultsActionsMenuProps) {
  const commandBarRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<CommandBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  /**
   * Purpose: Refresh whether the command ribbon can scroll in each direction,
   * so arrow affordances only appear when useful.
   *
   * @returns Nothing. Component state is updated when the scroll state changes.
   */
  const updateScrollState = useCallback((): void => {
    const commandBar = commandBarRef.current;
    if (!commandBar) return;

    const maximumScrollLeft = commandBar.scrollWidth - commandBar.clientWidth;
    const nextState = {
      canScrollLeft: commandBar.scrollLeft > 1,
      canScrollRight: commandBar.scrollLeft < maximumScrollLeft - 1,
    };

    setScrollState((currentState) =>
      currentState.canScrollLeft === nextState.canScrollLeft &&
      currentState.canScrollRight === nextState.canScrollRight
        ? currentState
        : nextState
    );
  }, []);

  useEffect(() => {
    const commandBar = commandBarRef.current;
    if (!commandBar) return undefined;

    updateScrollState();
    commandBar.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollState);
    resizeObserver?.observe(commandBar);

    return () => {
      commandBar.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [updateScrollState]);

  /**
   * Purpose: Move the command ribbon by a visible page when a scroll arrow is
   * clicked.
   *
   * @param direction - Direction to move the horizontal command ribbon.
   * @returns Nothing. The command bar scroll position changes in the browser.
   */
  function scrollCommandBar(direction: "left" | "right"): void {
    const commandBar = commandBarRef.current;
    if (!commandBar) return;

    const scrollDistance = Math.max(180, commandBar.clientWidth * 0.72);
    commandBar.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  }

  return (
    <div className="results-command-bar-shell">
      {scrollState.canScrollLeft ? (
        <button
          className="results-command-scroll-button results-command-scroll-button--left"
          type="button"
          aria-label="Scroll result actions left"
          title="Scroll result actions left"
          onClick={() => scrollCommandBar("left")}
        >
          ‹
        </button>
      ) : null}
      <nav className="results-command-bar" aria-label="Result actions" ref={commandBarRef}>
        <CommandGroup label="View">
          <SortSelect onChange={onSortOrderChange} value={sortOrder} />
          {lowConfidenceCount > 0 ? (
            <button
              aria-pressed={showLowConfidenceResults}
              className={`results-command-toggle${
                showLowConfidenceResults ? " results-command-toggle--active" : ""
              }`}
              type="button"
              title="Show tentative matches that did not pass the normal confidence checks"
              onClick={() => onShowLowConfidenceChange(!showLowConfidenceResults)}
            >
              Less confident ({lowConfidenceCount})
            </button>
          ) : null}
        </CommandGroup>
        <CommandGroup label="Scan">
          <button type="button" onClick={() => onOpenTool("filters")} title="Edit filters">
            Filters
          </button>
          <button type="button" onClick={() => onOpenTool("libraries")} title="Select libraries">
            Libraries
          </button>
          <button
            className="results-command-bar__primary"
            type="button"
            disabled={!onScanAgain}
            onClick={onScanAgain}
            title="Scan again with the current settings"
          >
            Scan again
          </button>
        </CommandGroup>
        <CommandGroup label="Inspect">
          <button type="button" onClick={() => onOpenTool("hidden")} title="Hidden items">
            Hidden
          </button>
          <button type="button" onClick={() => onOpenTool("review")} title="Series review">
            Review
          </button>
          <button type="button" onClick={() => onOpenTool("debug")} title="Debug checks">
            Debug
          </button>
        </CommandGroup>
        <CommandGroup label="Manage">
          <button type="button" onClick={() => onOpenTool("data")} title="Local data">
            Data
          </button>
          <button type="button" onClick={() => onOpenTool("server")} title="Connect to a server">
            Server
          </button>
          <button type="button" onClick={() => onOpenTool("download")} title="Download exports">
            Download
          </button>
        </CommandGroup>
      </nav>
      {scrollState.canScrollRight ? (
        <button
          className="results-command-scroll-button results-command-scroll-button--right"
          type="button"
          aria-label="Scroll result actions right"
          title="Scroll result actions right"
          onClick={() => scrollCommandBar("right")}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}

/**
 * Purpose: Render one labelled group of result commands inside the sticky
 * command ribbon.
 *
 * @param props - Command group inputs.
 * @param props.children - Controls belonging to the group.
 * @param props.label - Short visible group label.
 * @returns A compact labelled group.
 */
function CommandGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="results-command-group">
      <span className="results-command-group__label">{label}</span>
      <div className="results-command-group__controls">{children}</div>
    </section>
  );
}

/**
 * Purpose: Render the result sort selector for desktop toolbar and mobile menu
 * contexts.
 *
 * @param props - Sort selector inputs.
 * @param props.onChange - Callback receiving the selected sort order.
 * @param props.value - Current selected sort order.
 * @param props.variant - Optional layout variant for mobile menu rendering.
 * @returns A native select control with an accessible label.
 */
function SortSelect({
  onChange,
  value,
  variant = "desktop",
}: {
  onChange: (sortOrder: ResultsSortOrder) => void;
  value: ResultsSortOrder;
  variant?: "desktop" | "mobile";
}) {
  return (
    <NativeSelectField
      aria-label="Sort results"
      className={`results-sort-control results-sort-control--${variant}`}
      id={`resultsSortOrder-${variant}`}
      label="Sort results"
      labelMode="hidden"
      value={value}
      variant="compact"
      onChange={onChange}
    >
      <optgroup label="Series">
        <option value="seriesAsc">Series A-Z</option>
        <option value="seriesDesc">Series Z-A</option>
      </optgroup>
      <optgroup label="Author">
        <option value="authorAsc">Author A-Z</option>
        <option value="authorDesc">Author Z-A</option>
      </optgroup>
      <optgroup label="Missing count">
        <option value="missingDesc">Most missing</option>
        <option value="missingAsc">Fewest missing</option>
      </optgroup>
      <optgroup label="Original">
        <option value="scanOrder">Scan order</option>
      </optgroup>
    </NativeSelectField>
  );
}
