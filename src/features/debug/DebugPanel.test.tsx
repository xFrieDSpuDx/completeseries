import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MissingBookDiagnostic } from "../../domain/missingBooks";
import type { ScanResult } from "../scan/runLibraryScan";
import type { DebugHistoryEntry } from "./debugHistory";
import { DebugPanel } from "./DebugPanel";
import { DebugPagination } from "./DebugPagination";

describe("DebugPanel", () => {
  it("renders filtered debug rows, scan history, pagination, and unresolved series", () => {
    const html = renderToStaticMarkup(
      <DebugPanel history={history()} result={scanResult()} rowLimit={1} />
    );

    expect(html).toContain("Debug checks: 1 shown, 1 skipped, 1 unresolved");
    expect(html).toContain("Latest scan");
    expect(html).toContain("Recent scan history (2)");
    expect(html).toContain("Shown Book");
    expect(html).toContain("Unresolved Series");
  });

  it("renders an empty state when no debug rows match", () => {
    const html = renderToStaticMarkup(
      <DebugPanel
        result={{
          ...scanResult(),
          seriesReports: [],
          unresolvedSeries: [],
        }}
        rowLimit={1}
      />
    );

    expect(html).toContain("No debug checks match these filters");
  });

  it("renders pagination controls when more than one debug page exists", () => {
    const html = renderToStaticMarkup(
      <DebugPagination onPageChange={() => undefined} pageCount={3} safePageIndex={1} />
    );

    expect(html).toContain("Previous");
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain("Next");
  });
});

/**
 * Purpose: Build scan history with one shown and one skipped debug row.
 *
 * @returns Debug history fixtures.
 */
function history(): DebugHistoryEntry[] {
  return [
    {
      id: "scan-20260612100000000-deadbeef",
      finishedAt: "2026-06-12T10:00:00.000Z",
      region: "uk",
      metadataLookupMode: "balanced",
      activeFilters: ["Only unabridged"],
      localSeriesCount: 2,
      matchedSeriesCount: 2,
      unresolvedSeriesCount: 0,
      missingBookCount: 1,
      debugRows: [
        {
          action: "show",
          diagnostic: shownDiagnostic(),
          seriesName: "History Series",
        },
      ],
    },
    {
      id: "scan-20260612093000000-feedface",
      finishedAt: "2026-06-12T09:30:00.000Z",
      region: "uk",
      metadataLookupMode: "quick",
      activeFilters: [],
      localSeriesCount: 2,
      matchedSeriesCount: 1,
      unresolvedSeriesCount: 1,
      missingBookCount: 0,
      debugRows: [
        {
          action: "skip",
          diagnostic: skippedDiagnostic(),
          seriesName: "Earlier Series",
        },
      ],
    },
  ];
}

/**
 * Purpose: Build a scan result with one fallback debug row and one unresolved
 * series.
 *
 * @returns Scan result fixture.
 */
function scanResult(): ScanResult {
  return {
    librariesScanned: 1,
    localSeriesCount: 1,
    matchedSeriesCount: 1,
    missingBookCount: 1,
    missingGroups: [],
    unresolvedSeries: [
      {
        localSeries: {
          id: "unresolved",
          name: "Unresolved Series",
          books: [],
        },
        attemptedAsins: [],
        lookupAnchors: [],
        reason: "No provider series met the confidence threshold.",
      },
    ],
    seriesReports: [
      {
        localSeries: {
          id: "series",
          name: "Fallback Series",
          books: [],
        },
        attemptedAsins: [],
        lookupAnchors: [],
        providerTraces: [],
        status: "matched",
        reason: "Matched.",
        score: 100,
        signals: {
          asinMatches: 1,
          authorMatches: 1,
          isbnMatches: 0,
          positionMatches: 1,
          seriesNameSimilarity: 1,
          skuMatches: 0,
          subtitleMatches: 0,
          titleMatches: 1,
        },
        providerSeries: {
          seriesAsin: "SERIES1",
          name: "Fallback Provider Series",
          bookCount: 1,
        },
        candidateMatches: [],
        missingBookCount: 1,
        debugDecisions: [{ action: "show", diagnostic: shownDiagnostic() }],
      },
    ],
  };
}

/**
 * Purpose: Build a diagnostic for a shown provider book.
 *
 * @returns Missing-book diagnostic fixture.
 */
function shownDiagnostic(): MissingBookDiagnostic {
  return {
    asin: "B000SHOW",
    title: "Shown Book",
    checks: ["Book is available in the selected region.", "Unabridged format."],
    shownBecause: ["Title/subtitle not owned."],
    providerEvidence: ["Provider: Audible catalogue."],
  };
}

/**
 * Purpose: Build a diagnostic for a skipped provider book.
 *
 * @returns Missing-book diagnostic fixture.
 */
function skippedDiagnostic(): MissingBookDiagnostic {
  return {
    asin: "B000SKIP",
    title: "Skipped Book",
    checks: ["Release date is in the future."],
    shownBecause: [],
    providerEvidence: ["Provider ASIN matched an owned identifier."],
  };
}
