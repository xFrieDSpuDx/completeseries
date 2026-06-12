import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Purpose: Render one compact help popover beside a form label.
 *
 * @param props - Popover inputs.
 * @param props.ariaLabel - Accessible label for the info button.
 * @param props.children - Short explanatory text shown when opened.
 * @returns A native details popover that stays inside the viewport.
 */
export function InfoPopover({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    /**
     * Purpose: Place the help popover inside the current viewport, including on
     * narrow mobile screens and inside scrolling drawers.
     *
     * @returns Nothing. The calculated CSS position is stored in component
     * state.
     */
    function updatePosition(): void {
      const summary = detailsRef.current?.querySelector("summary");
      const content = contentRef.current;
      if (!summary || !content) return;

      const margin = 12;
      const gap = 8;
      const maxWidth = Math.min(304, window.innerWidth - margin * 2);
      const summaryRect = summary.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const contentHeight = contentRect.height;
      let left = summaryRect.left;
      let top = summaryRect.bottom + gap;

      if (left + maxWidth > window.innerWidth - margin) {
        left = window.innerWidth - margin - maxWidth;
      }
      if (left < margin) left = margin;

      if (top + contentHeight > window.innerHeight - margin) {
        top = Math.max(margin, summaryRect.top - contentHeight - gap);
      }

      setPosition({
        left,
        maxWidth,
        top,
        width: maxWidth,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    /**
     * Purpose: Close an open help popover when the user clicks outside it,
     * matching common transient help behaviour.
     *
     * @param event - Pointer event from the current document.
     * @returns Nothing. The native details element is closed when appropriate.
     */
    function closeWhenClickingOutside(event: PointerEvent): void {
      const details = detailsRef.current;
      if (!details || details.contains(event.target as Node)) return;

      details.open = false;
      setIsOpen(false);
    }

    /**
     * Purpose: Let keyboard users close help popovers without returning to the
     * info button.
     *
     * @param event - Keyboard event from the current document.
     * @returns Nothing. The native details element is closed on Escape.
     */
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;

      const details = detailsRef.current;
      if (details) details.open = false;
      setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <details
      className="info-popover"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      ref={detailsRef}
    >
      <summary aria-label={ariaLabel}>i</summary>
      <div className="info-popover__content" ref={contentRef} style={position}>
        <p>{children}</p>
      </div>
    </details>
  );
}
