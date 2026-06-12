import { useEffect } from "react";

/**
 * Purpose: Prevent the page behind an open drawer or modal from scrolling.
 *
 * @returns Nothing. The document body styles and scroll position are restored
 * when the overlay unmounts.
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
