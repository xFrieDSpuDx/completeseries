import type { ReactNode } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const closeIconUrl = new URL("../../assets/close.svg", import.meta.url).href;

type ResultsToolDrawerProps = {
  children: ReactNode;
  contentClassName?: string;
  onClose: () => void;
  title: string;
  variant?: "fullscreen" | "side";
};

/**
 * Purpose: Render secondary result tools in a side drawer so the result grid
 * stays compact.
 *
 * @param props - Drawer inputs.
 * @param props.children - Drawer content.
 * @param props.contentClassName - Optional class applied to the scrollable
 * drawer content area.
 * @param props.onClose - Callback that closes the drawer.
 * @param props.title - Drawer heading.
 * @param props.variant - Whether the tool should open as a side drawer or a
 * wider full-screen inspector.
 * @returns A side drawer with an overlay and icon close control.
 */
export function ResultsToolDrawer({
  children,
  contentClassName,
  onClose,
  title,
  variant = "side",
}: ResultsToolDrawerProps) {
  useBodyScrollLock();

  return (
    <div
      className={`tool-drawer-shell tool-drawer-shell--${variant}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="toolDrawerTitle"
    >
      <button className="tool-drawer-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <aside className="tool-drawer-panel">
        <header className="tool-drawer-header">
          <h2 id="toolDrawerTitle">{title}</h2>
          <button
            className="modal-close icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <img src={closeIconUrl} alt="" />
          </button>
        </header>
        <div className={`tool-drawer-content ${contentClassName ?? ""}`.trim()}>{children}</div>
      </aside>
    </div>
  );
}
