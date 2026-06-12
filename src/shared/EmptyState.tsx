import type { ReactNode } from "react";

type EmptyStateProps = {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  title: string;
};

/**
 * Purpose: Render consistent empty-state copy across results, drawers, and
 * review panels.
 *
 * @param props - Empty-state display inputs.
 * @param props.children - Optional supporting explanation.
 * @param props.className - Optional extra class for local layout tweaks.
 * @param props.compact - Whether to use the smaller inline panel treatment.
 * @param props.title - Short empty-state headline.
 * @returns A reusable empty-state block.
 */
export function EmptyState({ children, className = "", compact = false, title }: EmptyStateProps) {
  const classes = [
    "empty-state",
    compact ? "empty-state--compact" : "",
    className,
  ].filter(Boolean);

  return (
    <section className={classes.join(" ")}>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
    </section>
  );
}
