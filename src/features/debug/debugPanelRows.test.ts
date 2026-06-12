import { describe, expect, it } from "vitest";
import type { MissingBookDiagnostic } from "../../domain/missingBooks";
import type { ScanResult } from "../scan/runLibraryScan";
import type { DebugHistoryEntry } from "./debugHistory";
import {
  buildDebugRows,
  escapeCsvValue,
  filterDebugRows,
  filterRowsByScan,
  getDistinctCheckLabels,
  getDistinctScans,
} from "./debugPanelRows";
import { buildDebugSummaryText } from "./debugSummaryText";

const shownDiagnostic: MissingBookDiagnostic = {
  asin: "B000SHOW",
  title: "Shown Book",
  checks: [
    "Book is available in the selected region.",
    "Unabridged format.",
    "Series position #2.",
  ],
  shownBecause: ["Title/subtitle not owned."],
  providerEvidence: ["Narrator: Jane Reader.", "Container: Main series."],
};

const skippedDiagnostic: MissingBookDiagnostic = {
  asin: "B000SKIP",
  title: "Skipped Book",
  checks: ["Release date is in the future."],
  shownBecause: [],
  providerEvidence: ["Provider ASIN matched an owned identifier."],
};

const baseResult: ScanResult = {
  librariesScanned: 1,
  localSeriesCount: 1,
  matchedSeriesCount: 1,
  missingBookCount: 1,
  missingGroups: [],
  unresolvedSeries: [],
  seriesReports: [
    {
      localSeries: {
        id: "series-1",
        name: "Fallback Local Series",
        books: [],
      },
      attemptedAsins: ["B000SHOW"],
      lookupAnchors: [],
      providerTraces: [],
      status: "matched",
      reason: "Matched for test.",
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
        seriesAsin: "SERIES-1",
        name: "Fallback Provider Series",
        bookCount: 1,
      },
      candidateMatches: [],
      missingBookCount: 1,
      debugDecisions: [{ action: "show", diagnostic: shownDiagnostic }],
    },
  ],
};

const history: DebugHistoryEntry[] = [
  {
    id: "scan-20260612093000000-deadbeef",
    finishedAt: "2026-06-12T09:30:00.000Z",
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
        diagnostic: shownDiagnostic,
        seriesName: "History Series",
      },
    ],
  },
  {
    id: "scan-20260612091500000-feedface",
    finishedAt: "2026-06-12T09:15:00.000Z",
    region: "uk",
    metadataLookupMode: "quick",
    activeFilters: ["Catalogue cache on"],
    localSeriesCount: 2,
    matchedSeriesCount: 1,
    unresolvedSeriesCount: 1,
    missingBookCount: 0,
    debugRows: [
      {
        action: "skip",
        diagnostic: skippedDiagnostic,
        seriesName: "Earlier Series",
      },
    ],
  },
];

describe("debug panel rows", () => {
  it("builds labelled rows from history before falling back to the current result", () => {
    const historyRows = buildDebugRows(history, baseResult);

    expect(historyRows).toHaveLength(2);
    expect(historyRows[0]).toMatchObject({
      action: "show",
      scanId: "scan-20260612093000000-deadbeef",
      seriesName: "History Series",
    });
    expect(historyRows[0].scanLabel).toContain("run 1");
    expect(historyRows[0].scanLabel).toContain("ID ADBEEF");
    expect(historyRows[0].checkLabels).toEqual(
      expect.arrayContaining([
        "Availability",
        "Format",
        "Series position",
        "Title/subtitle",
        "Narrator",
        "Container",
        "Shown result",
      ])
    );

    const fallbackRows = buildDebugRows([], baseResult);

    expect(fallbackRows).toHaveLength(1);
    expect(fallbackRows[0]).toMatchObject({
      action: "show",
      scanId: "current",
      scanLabel: "Current",
      seriesName: "Fallback Provider Series",
    });
  });

  it("filters rows by scan, outcome, check label, and search text", () => {
    const rows = buildDebugRows(history, baseResult);

    expect(filterRowsByScan(rows, "latest", rows[0].scanId)).toHaveLength(1);
    expect(filterRowsByScan(rows, "all", rows[0].scanId)).toHaveLength(2);
    expect(filterRowsByScan(rows, history[1].id, rows[0].scanId)).toHaveLength(1);

    expect(
      filterDebugRows(rows, {
        checkFilter: "Shown result",
        outcomeFilter: "show",
        query: "history",
      })
    ).toHaveLength(1);

    expect(
      filterDebugRows(rows, {
        checkFilter: "Release date",
        outcomeFilter: "skip",
        query: "future",
      })
    ).toHaveLength(1);

    expect(
      filterDebugRows(rows, {
        checkFilter: "Narrator",
        outcomeFilter: "skip",
        query: "",
      })
    ).toHaveLength(0);
  });

  it("returns distinct scan and check options for the debug filters", () => {
    const rows = buildDebugRows(history, baseResult);

    expect(getDistinctScans(rows).map((scan) => scan.id)).toEqual([
      history[0].id,
      history[1].id,
    ]);
    expect(getDistinctCheckLabels(rows)).toEqual(
      expect.arrayContaining(["Release date", "Shown result", "Skipped result"])
    );
  });

  it("builds summary text and escapes CSV cells", () => {
    const rows = buildDebugRows(history, baseResult);
    const filteredRows = filterDebugRows(rows, {
      checkFilter: "any",
      outcomeFilter: "any",
      query: "",
    });

    expect(
      buildDebugSummaryText({
        checkFilter: "any",
        debugRows: rows,
        filteredRows,
        outcomeFilter: "any",
        query: "",
        result: baseResult,
        scanFilter: "all",
      })
    ).toContain("Rows: 2 filtered of 2 total");
    expect(escapeCsvValue('Title with "quotes"')).toBe('"Title with ""quotes"""');
  });
});
