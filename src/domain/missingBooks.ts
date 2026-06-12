import type { LocalBookEvidence, LocalSeriesEvidence, ProviderSeriesCandidate } from "./audiobook";
import { applyMissingArrayFilters, deduplicateProviderBooks } from "./missingBookCleanup";
import { buildDecisionContext, evaluateProviderBookForMissingResult } from "./missingBookDecisions";
import type {
  MissingBookDiagnostic,
  MissingBookDebugDecision,
  MissingBookGroup,
  MissingBookOptions,
} from "./missingBookTypes";

export type {
  MissingBookDiagnostic,
  MissingBookGroup,
  MissingBookOptions,
} from "./missingBookTypes";

/**
 * Purpose: Compare a matched provider series with the user's local library and
 * return the provider books that appear to be missing.
 *
 * @param localSeries - The local Audiobookshelf series that matched the
 * provider series.
 * @param providerSeries - Provider series metadata containing the complete
 * provider-side book list.
 * @param allLocalBooks - Every local book found during the scan, used to avoid
 * reporting books that already exist elsewhere in the library.
 * @param options - Filters that decide whether ownership, metadata, release
 * dates, and duplicate missing-list entries should exclude a provider book.
 * @returns A missing-book group with books and per-book diagnostics explaining
 * why each visible result survived the filter gates.
 */
export function findMissingBooksForSeries(
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate,
  allLocalBooks: LocalBookEvidence[],
  options: MissingBookOptions
): MissingBookGroup {
  const decisionContext = buildDecisionContext(allLocalBooks);
  const diagnosticsByAsin: Record<string, MissingBookDiagnostic> = {};
  const debugDecisions: MissingBookDebugDecision[] = [];
  const candidateMissingBooks = providerSeries.books.filter((providerBook) => {
    const decision = evaluateProviderBookForMissingResult(
      providerBook,
      localSeries,
      providerSeries,
      allLocalBooks,
      options,
      decisionContext.localIdentifiers
    );

    debugDecisions.push(decision);
    if (decision.action === "show") diagnosticsByAsin[providerBook.asin] = decision.diagnostic;
    return decision.action === "show";
  });

  const deduplicatedProviderBooks = deduplicateProviderBooks(candidateMissingBooks, providerSeries);
  const missingBooks = applyMissingArrayFilters(deduplicatedProviderBooks, providerSeries, options);

  return {
    seriesName: providerSeries.name,
    seriesAsin: providerSeries.seriesAsin,
    providerId: providerSeries.providerId,
    providerName: providerSeries.providerName,
    books: missingBooks,
    diagnosticsByAsin: pickDiagnosticsForBooks(diagnosticsByAsin, missingBooks),
    debugDecisions,
  };
}

/**
 * Purpose: Keep diagnostics aligned to the final set of visible missing books
 * after edition de-duplication and missing-list cleanup filters run.
 *
 * @param diagnosticsByAsin - Diagnostics generated for candidate missing books.
 * @param books - Final visible missing books for a result group.
 * @returns Diagnostics keyed by final visible book ASIN.
 */
function pickDiagnosticsForBooks(
  diagnosticsByAsin: Record<string, MissingBookDiagnostic>,
  books: MissingBookGroup["books"]
): Record<string, MissingBookDiagnostic> {
  return Object.fromEntries(
    books
      .map((book) => [book.asin, diagnosticsByAsin[book.asin]] as const)
      .filter((entry): entry is readonly [string, MissingBookDiagnostic] => Boolean(entry[1]))
  );
}
