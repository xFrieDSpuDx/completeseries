import type { MissingBookDiagnostic } from "../../domain/missingBooks";

/**
 * Purpose: Render the "Why is this book shown?" diagnostics for a missing book.
 *
 * @param props - Diagnostics panel inputs.
 * @param props.diagnostic - Diagnostic reasons and provider evidence for a book.
 * @returns A collapsible explanation panel.
 */
export function BookDiagnosticDetails({ diagnostic }: { diagnostic: MissingBookDiagnostic }) {
  return (
    <details className="book-diagnostics">
      <summary>Why listed?</summary>
      <ul>
        {diagnostic.shownBecause.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <dl>
        {diagnostic.providerEvidence.map((evidence) => (
          <div key={evidence}>
            <dt>Evidence</dt>
            <dd>{evidence}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
