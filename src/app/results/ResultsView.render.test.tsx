import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MissingBookGroup } from "../../domain/missingBooks";
import type { ScanOptions, ScanResult } from "../../features/scan/runLibraryScan";
import { ResultsView } from "./ResultsView";

describe("ResultsView", () => {
  it("renders the result summary, action menu, and visible missing series", () => {
    const html = renderToStaticMarkup(
      <ResultsView
        debugHistory={[]}
        hiddenItems={[]}
        lastScanOptions={scanOptions()}
        manualBookMatches={[]}
        manualSeriesMatches={[]}
        onClearHiddenItems={() => undefined}
        onClearManualBookMatches={() => undefined}
        onClearManualSeriesMatches={() => undefined}
        onConnectServer={async () => undefined}
        onHideItem={() => undefined}
        onImportHiddenItems={() => undefined}
        onImportManualBookMatches={() => undefined}
        onImportManualSeriesMatches={() => undefined}
        onRescanWithOptions={async () => undefined}
        onSaveManualBookMatch={() => undefined}
        onSaveManualSeriesMatch={() => undefined}
        onUnhideItem={() => undefined}
        result={scanResult()}
      />
    );

    expect(html).toContain("1 of your series has missing books");
    expect(html).toContain("Scan");
    expect(html).toContain("Download");
    expect(html).toContain("Discworld");
    expect(html).toContain("Audible catalogue");
  });

  it("renders the no-results state when filters leave no visible books", () => {
    const html = renderToStaticMarkup(
      <ResultsView
        debugHistory={[]}
        hiddenItems={[
          {
            type: "series",
            seriesName: "Discworld",
            seriesAsin: "SERIES1",
            hiddenAt: "2026-06-12T10:00:00.000Z",
          },
        ]}
        lastScanOptions={scanOptions()}
        manualBookMatches={[]}
        manualSeriesMatches={[]}
        onClearHiddenItems={() => undefined}
        onClearManualBookMatches={() => undefined}
        onClearManualSeriesMatches={() => undefined}
        onConnectServer={async () => undefined}
        onHideItem={() => undefined}
        onImportHiddenItems={() => undefined}
        onImportManualBookMatches={() => undefined}
        onImportManualSeriesMatches={() => undefined}
        onRescanWithOptions={async () => undefined}
        onSaveManualBookMatch={() => undefined}
        onSaveManualSeriesMatch={() => undefined}
        onUnhideItem={() => undefined}
        result={scanResult()}
      />
    );

    expect(html).toContain("No missing books shown");
    expect(html).toContain("Review matching");
  });
});

/**
 * Purpose: Build a scan result with one visible missing book.
 *
 * @returns Scan result fixture for ResultsView rendering tests.
 */
function scanResult(): ScanResult {
  return {
    librariesScanned: 1,
    localSeriesCount: 2,
    matchedSeriesCount: 2,
    missingBookCount: 1,
    missingGroups: [missingGroup()],
    unresolvedSeries: [],
    seriesReports: [],
  };
}

/**
 * Purpose: Build scan options for ResultsView rendering tests.
 *
 * @returns Scan options fixture.
 */
function scanOptions(): ScanOptions {
  return {
    serverUrl: "https://abs.example.com",
    mode: "apiKey",
    apiKey: "token",
    availableLibraries: [{ id: "library-1", name: "Audiobooks" }],
    selectedLibraryIds: ["library-1"],
    region: "uk",
    includeSubSeries: false,
    metadataLookupMode: "balanced",
    metadataProviderIds: ["audible"],
    metadataProviderSearchMode: "firstMatch",
    googleBooksApiKey: "google-key",
    onlyUnabridged: true,
    ignoreMultiBooks: true,
    ignoreNoPositionBooks: true,
    ignoreSubPositionBooks: false,
    ignoreFutureDateBooks: false,
    ignoreFuturePlaceholders: true,
    ignorePastDateBooks: false,
    ignoreTitleSubtitle: true,
    ignoreSameSeriesPosition: true,
    ignoreTitleSubtitleInMissingArray: false,
    ignoreSameSeriesPositionInMissingArray: false,
    matchNarratorEditions: false,
    cacheMetadata: true,
  };
}

/**
 * Purpose: Build a missing-book group for ResultsView rendering tests.
 *
 * @returns Missing-book group fixture.
 */
function missingGroup(): MissingBookGroup {
  return {
    seriesName: "Discworld",
    seriesAsin: "SERIES1",
    providerId: "audible",
    providerName: "Audible catalogue",
    diagnosticsByAsin: {},
    debugDecisions: [],
    books: [
      {
        asin: "B079X2CKLZ",
        title: "Monstrous Regiment",
        authors: ["Terry Pratchett"],
        narrators: ["Stephen Briggs"],
        bookFormat: "unabridged",
        releaseDate: "2008-01-01",
        series: [{ asin: "SERIES1", name: "Discworld", position: "31" }],
      },
    ],
  };
}
