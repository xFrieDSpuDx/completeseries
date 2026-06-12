import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { ScanResult } from "../../features/scan/runLibraryScan";
import { ResultsDrawerContent, getResultsToolTitle } from "./ResultsDrawerContent";

type ResultsDrawerContentProps = ComponentProps<typeof ResultsDrawerContent>;

const scanResult: ScanResult = {
  librariesScanned: 1,
  localSeriesCount: 1,
  matchedSeriesCount: 1,
  missingBookCount: 0,
  missingGroups: [],
  unresolvedSeries: [],
  seriesReports: [],
};

function buildProps(
  overrides: Partial<ResultsDrawerContentProps> = {}
): ResultsDrawerContentProps {
  return {
    activeTool: "download",
    debugHistory: [],
    hiddenItems: [],
    lastScanOptions: null,
    manualBookMatches: [],
    manualSeriesMatches: [],
    onClearHiddenItems: () => undefined,
    onClearManualBookMatches: () => undefined,
    onClearManualSeriesMatches: () => undefined,
    onClearResultsPreferences: () => undefined,
    onClose: () => undefined,
    onConnectServer: async () => undefined,
    onImportHiddenItems: () => undefined,
    onImportManualBookMatches: () => undefined,
    onImportManualSeriesMatches: () => undefined,
    onImportResultsPreferences: () => undefined,
    onRescanWithOptions: async () => undefined,
    onSaveManualSeriesMatch: () => undefined,
    onShowHiddenChange: () => undefined,
    onUnhideItem: () => undefined,
    result: scanResult,
    showHiddenItems: false,
    sortOrder: "seriesAsc",
    ...overrides,
  };
}

describe("ResultsDrawerContent", () => {
  it("maps tool ids to drawer titles", () => {
    expect(getResultsToolTitle("filters")).toBe("Filters");
    expect(getResultsToolTitle("libraries")).toBe("Libraries");
    expect(getResultsToolTitle("server")).toBe("Server");
    expect(getResultsToolTitle("hidden")).toBe("Hidden items");
    expect(getResultsToolTitle("data")).toBe("Local data");
    expect(getResultsToolTitle("download")).toBe("Download");
    expect(getResultsToolTitle("review")).toBe("Review");
    expect(getResultsToolTitle("debug")).toBe("Debug checks");
  });

  it("renders download actions from the download drawer", () => {
    const html = renderToStaticMarkup(<ResultsDrawerContent {...buildProps()} />);

    expect(html).toContain("Download");
    expect(html).toContain("Missing books JSON");
    expect(html).toContain("Debug checks CSV");
    expect(html).toContain("Local data backup");
  });

  it("renders empty setup guidance when filters or libraries have no scan options", () => {
    const filtersHtml = renderToStaticMarkup(
      <ResultsDrawerContent {...buildProps({ activeTool: "filters" })} />
    );
    const librariesHtml = renderToStaticMarkup(
      <ResultsDrawerContent {...buildProps({ activeTool: "libraries" })} />
    );

    expect(filtersHtml).toContain("No previous scan settings");
    expect(librariesHtml).toContain("No library list available");
  });

  it("routes hidden items and server tools to their panels", () => {
    const hiddenHtml = renderToStaticMarkup(
      <ResultsDrawerContent
        {...buildProps({
          activeTool: "hidden",
          hiddenItems: [
            {
              type: "series",
              seriesName: "Hidden Series",
              hiddenAt: "2026-06-12T09:00:00.000Z",
            },
          ],
        })}
      />
    );
    const serverHtml = renderToStaticMarkup(
      <ResultsDrawerContent {...buildProps({ activeTool: "server" })} />
    );

    expect(hiddenHtml).toContain("Hidden Series");
    expect(serverHtml).toContain("Audiobookshelf Server URL");
  });
});
