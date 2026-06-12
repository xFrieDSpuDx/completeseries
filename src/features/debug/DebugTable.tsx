import { useState, type ReactNode, type RefObject } from "react";
import type { MissingBookDiagnostic } from "../../domain/missingBooks";
import type { DebugTableRow } from "./debugPanelRows";

type DebugTableProps = {
  rows: DebugTableRow[];
  tableWrapRef: RefObject<HTMLDivElement | null>;
};

/**
 * Purpose: Render filtered debug rows in a table with lazy evidence details.
 *
 * @param props - Debug table inputs.
 * @param props.rows - Rows visible on the current debug page.
 * @param props.tableWrapRef - Ref for resetting table scroll during
 * pagination.
 * @returns Debug table for the current page of rows.
 */
export function DebugTable({ rows, tableWrapRef }: DebugTableProps) {
  return (
    <div className="debug-table-wrap" ref={tableWrapRef}>
      <table className="debug-table">
        <colgroup>
          <col className="debug-table__outcome" />
          <col className="debug-table__scan" />
          <col className="debug-table__series" />
          <col className="debug-table__title" />
          <col className="debug-table__checks" />
          <col className="debug-table__details" />
        </colgroup>
        <thead>
          <tr>
            <th>Outcome</th>
            <th>Scan</th>
            <th>Series</th>
            <th>Title</th>
            <th>Checks</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.scanId}-${row.seriesName}-${row.diagnostic.asin}-${rowIndex}`}>
              <td data-label="Outcome">{row.action}</td>
              <td data-label="Scan">{row.scanLabel}</td>
              <td data-label="Series">{row.seriesName}</td>
              <td data-label="Title">{row.diagnostic.title}</td>
              <td data-label="Checks">{row.checkLabels.join(", ")}</td>
              <td data-label="Details">
                <DebugRowDetails diagnostic={row.diagnostic} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="debug-card-list" aria-label="Debug checks">
        {rows.map((row, rowIndex) => (
          <DebugCard
            key={`${row.scanId}-${row.seriesName}-${row.diagnostic.asin}-${rowIndex}`}
            row={row}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Purpose: Render one debug decision as a real mobile card instead of relying
 * on table rows pretending to be cards.
 *
 * @param props - Debug card inputs.
 * @param props.row - Debug row to show.
 * @returns A mobile-friendly debug decision card.
 */
function DebugCard({ row }: { row: DebugTableRow }) {
  return (
    <article className="debug-card">
      <DebugCardField label="Outcome">{row.action}</DebugCardField>
      <DebugCardField label="Scan">{row.scanLabel}</DebugCardField>
      <DebugCardField label="Series">{row.seriesName}</DebugCardField>
      <DebugCardField label="Title">{row.diagnostic.title}</DebugCardField>
      <DebugCardField label="Checks">{row.checkLabels.join(", ")}</DebugCardField>
      <DebugCardField label="Details">
        <DebugRowDetails diagnostic={row.diagnostic} />
      </DebugCardField>
    </article>
  );
}

/**
 * Purpose: Render one label/value pair in the mobile debug card.
 *
 * @param props - Field content.
 * @param props.children - Field value.
 * @param props.label - Field label.
 * @returns A compact description-list row.
 */
function DebugCardField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <dl className="debug-card__field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </dl>
  );
}

/**
 * Purpose: Render detailed evidence for one debug decision.
 *
 * @param props - Row details inputs.
 * @param props.diagnostic - Diagnostic evidence for the provider book.
 * @returns A compact expandable details control.
 */
function DebugRowDetails({ diagnostic }: { diagnostic: MissingBookDiagnostic }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="debug-row-details" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>View</summary>
      {isOpen ? (
        <>
          <DebugList title="Decision" items={diagnostic.shownBecause} />
          <DebugList title="Checks" items={diagnostic.checks} />
          <DebugList title="Provider" items={diagnostic.providerEvidence} />
        </>
      ) : null}
    </details>
  );
}

/**
 * Purpose: Render one named list inside a debug detail cell.
 *
 * @param props - List inputs.
 * @param props.items - Text rows to render.
 * @param props.title - Section heading.
 * @returns A titled list, or nothing when there are no rows.
 */
function DebugList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
