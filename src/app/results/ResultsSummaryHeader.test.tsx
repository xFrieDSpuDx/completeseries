import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ScanOptions } from "../../features/scan/runLibraryScan";
import type { DebugHistoryEntry } from "../../features/debug/debugHistory";
import { ResultsSummaryHeader } from "./ResultsSummaryHeader";

const scanOptions: ScanOptions = {
  serverUrl: "https://abs.example.test",
  mode: "apiKey",
  apiKey: "test-key",
  availableLibraries: [{ id: "library-1", name: "Audiobooks" }],
  selectedLibraryIds: ["library-1"],
  region: "uk",
  includeSubSeries: false,
  metadataLookupMode: "balanced",
  metadataProviderIds: ["audible"],
  metadataProviderSearchMode: "firstMatch",
  googleBooksApiKey: "",
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

const latestHistoryEntry: DebugHistoryEntry = {
  id: "scan-1",
  finishedAt: "2026-06-12T09:30:00.000Z",
  region: "uk",
  metadataLookupMode: "balanced",
  activeFilters: ["Only unabridged"],
  localSeriesCount: 12,
  matchedSeriesCount: 11,
  unresolvedSeriesCount: 1,
  missingBookCount: 8,
  debugRows: [],
};

describe("ResultsSummaryHeader", () => {
  it("uses personal series wording and renders scan summary counts", () => {
    const html = renderToStaticMarkup(
      <ResultsSummaryHeader
        completeAfterFiltersCount={7}
        hiddenSeriesCount={2}
        lastScanOptions={scanOptions}
        latestHistoryEntry={latestHistoryEntry}
        librariesScanned={1}
        localSeriesCount={12}
        matchedMissingSeriesCount={4}
        matchedSeriesCount={11}
        mergedResultGroupCount={3}
        unresolvedSeriesCount={1}
        visibleSeriesCount={4}
      />
    );

    expect(html).toContain("4 of your series have missing books");
    expect(html).toContain("Scanned");
    expect(html).toContain("<dd>12</dd>");
    expect(html).toContain("Missing");
    expect(html).toContain("<dd>4</dd>");
    expect(html).toContain("Merged");
    expect(html).toContain("<dd>3</dd>");
    expect(html).toContain("Scan details");
    expect(html).toContain("United Kingdom");
    expect(html).toContain("1 library");
    expect(html).toContain("Balanced scan");
    expect(html).toContain("Audible catalogue");
    expect(html).toContain("Only unabridged");
  });

  it("keeps the headline grammatical for one visible missing series", () => {
    const html = renderToStaticMarkup(
      <ResultsSummaryHeader
        completeAfterFiltersCount={1}
        hiddenSeriesCount={0}
        lastScanOptions={null}
        librariesScanned={0}
        localSeriesCount={1}
        matchedMissingSeriesCount={1}
        matchedSeriesCount={1}
        mergedResultGroupCount={0}
        unresolvedSeriesCount={0}
        visibleSeriesCount={1}
      />
    );

    expect(html).toContain("1 of your series has missing books");
    expect(html).not.toContain("Scan details");
    expect(html).not.toContain("Merged");
  });
});
