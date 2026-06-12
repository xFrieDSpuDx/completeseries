import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import { defaultScanFilters } from "../setup/scanFormTypes";
import { LocalDataTools } from "./LocalDataTools";
import type { HiddenItem } from "./hiddenItemsStore";

const hiddenItems: HiddenItem[] = [
  {
    type: "series",
    seriesName: "Discworld",
    seriesAsin: "SERIES-1",
    hiddenAt: "2026-06-12T09:00:00.000Z",
  },
  {
    type: "book",
    seriesName: "Discworld",
    seriesAsin: "SERIES-1",
    title: "A Hidden Book",
    asin: "B000HIDDEN",
    hiddenAt: "2026-06-12T09:01:00.000Z",
  },
];

const manualBookMatches: ManualBookMatch[] = [
  {
    createdAt: "2026-06-12T09:02:00.000Z",
    providerId: "audible",
    providerName: "Audible catalogue",
    region: "uk",
    seriesAsin: "SERIES-1",
    seriesName: "Discworld",
    asin: "B000OWNED",
    title: "Already Owned",
    authors: ["Terry Pratchett"],
  },
];

const manualSeriesMatches: ManualSeriesMatch[] = [
  {
    createdAt: "2026-06-12T09:03:00.000Z",
    localSeriesId: "local-series-1",
    localSeriesName: "Discworld",
    providerId: "audible",
    providerName: "Audible catalogue",
    providerSeriesAsin: "SERIES-1",
    providerSeriesName: "Discworld",
    region: "uk",
  },
];

describe("LocalDataTools", () => {
  it("summarises current saved data and renders backup, restore, and delete controls", () => {
    const html = renderToStaticMarkup(
      <LocalDataTools
        hiddenItems={hiddenItems}
        manualBookMatches={manualBookMatches}
        manualSeriesMatches={manualSeriesMatches}
        onClearHiddenItems={() => undefined}
        onClearManualBookMatches={() => undefined}
        onClearManualSeriesMatches={() => undefined}
        onClearPreferences={() => undefined}
        onClearResultsPreferences={() => undefined}
        onImportHiddenItems={() => undefined}
        onImportManualBookMatches={() => undefined}
        onImportManualSeriesMatches={() => undefined}
        preferences={{
          filters: defaultScanFilters,
          region: "uk",
          selectedLibraryIds: ["fiction"],
        }}
        resultsPreferences={{
          showHiddenItems: true,
          sortOrder: "authorAsc",
        }}
      />
    );

    expect(html).toContain("Manage local data");
    expect(html).toContain("Back up, restore, or delete Complete Series data saved in this browser.");
    expect(html).toContain("Hidden items");
    expect(html).toContain("<dd>2</dd>");
    expect(html).toContain("Owned-book matches");
    expect(html).toContain("<dd>1</dd>");
    expect(html).toContain("Series overrides");
    expect(html).toContain("Download backup");
    expect(html).toContain("Restore from backup");
    expect(html).toContain("Provider response cache");
    expect(html).toContain("Legacy V1 data");
    expect(html).toContain("Delete all local data");
  });
});
