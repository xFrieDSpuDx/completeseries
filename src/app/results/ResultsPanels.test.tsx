import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ScanOptions } from "../../features/scan/runLibraryScan";
import { ResultsFilterPanel } from "./ResultsFilterPanel";
import { ResultsLibraryPanel } from "./ResultsLibraryPanel";
import { ResultsServerPanel } from "./ResultsServerPanel";

function buildScanOptions(overrides: Partial<ScanOptions> = {}): ScanOptions {
  const options: ScanOptions = {
    serverUrl: "https://abs.example.test",
    mode: "apiKey",
    apiKey: "test-key",
    availableLibraries: [
      { id: "fiction", name: "Fiction" },
      { id: "non-fiction", name: "Non-fiction" },
    ],
    selectedLibraryIds: ["fiction"],
    region: "uk",
    includeSubSeries: false,
    metadataLookupMode: "balanced",
    metadataProviderIds: ["audible", "googleBooks"],
    metadataProviderSearchMode: "deep",
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

  return { ...options, ...overrides } as ScanOptions;
}

describe("results panels", () => {
  it("renders the results filter controls with provider warnings and rescan actions", () => {
    const html = renderToStaticMarkup(
      <ResultsFilterPanel
        scanOptions={buildScanOptions()}
        onApply={async () => undefined}
        onClose={() => undefined}
      />
    );

    expect(html).toContain("Catalogue Region");
    expect(html).toContain("Search depth");
    expect(html).toContain("Balanced scan");
    expect(html).toContain("Metadata source");
    expect(html).toContain("Google Books API key");
    expect(html).toContain("Google Books searches Google&#x27;s general book catalogue");
    expect(html).toContain("Reset filters");
    expect(html).toContain("Apply and rescan");
  });

  it("renders selected libraries in the shared dropdown style", () => {
    const html = renderToStaticMarkup(
      <ResultsLibraryPanel
        scanOptions={buildScanOptions()}
        onApply={async () => undefined}
        onClose={() => undefined}
      />
    );

    expect(html).toContain("Libraries");
    expect(html).toContain("1 of 2 selected");
    expect(html).toContain("Fiction");
    expect(html).toContain("Non-fiction");
    expect(html).toContain("Apply and rescan");
    expect(html).not.toContain("No library list available");
  });

  it("disables library rescans when no library list is available", () => {
    const html = renderToStaticMarkup(
      <ResultsLibraryPanel
        scanOptions={buildScanOptions({ availableLibraries: [], selectedLibraryIds: [] })}
        onApply={async () => undefined}
        onClose={() => undefined}
      />
    );

    expect(html).toContain("No library list available");
    expect(html).toContain("Connect to a server and run a scan before changing libraries here.");
    expect(html).toContain("disabled");
  });

  it("renders the server connection form from the results drawer", () => {
    const html = renderToStaticMarkup(
      <ResultsServerPanel onConnect={async () => undefined} />
    );

    expect(html).toContain("Audiobookshelf Server URL");
    expect(html).toContain("Login Method");
    expect(html).toContain("Password");
    expect(html).toContain("API key");
    expect(html).toContain("Connect");
  });
});
