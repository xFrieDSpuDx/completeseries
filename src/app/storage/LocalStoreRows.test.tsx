import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrentLocalStoreRows, LegacyLocalStoreRows } from "./LocalStoreRows";

describe("LocalStoreRows", () => {
  it("shows current local data stores with human-readable counts", () => {
    const html = renderToStaticMarkup(
      <CurrentLocalStoreRows
        hiddenItems={[
          {
            hiddenAt: "2026-06-12T00:00:00.000Z",
            seriesName: "Hidden Series",
            type: "series",
          },
        ]}
        manualBookMatches={[
          {
            asin: "B0BOOK",
            authors: ["Known Author"],
            createdAt: "2026-06-12T00:00:00.000Z",
            providerId: "audible",
            providerName: "Audible catalogue",
            region: "uk",
            seriesAsin: "B0SERIES",
            seriesName: "Known Series",
            title: "Known Book",
          },
        ]}
        manualSeriesMatches={[
          {
            createdAt: "2026-06-12T00:00:00.000Z",
            localSeriesId: "local-series",
            localSeriesName: "Local Series",
            providerId: "audible",
            providerName: "Audible catalogue",
            providerSeriesAsin: "B0SERIES",
            providerSeriesName: "Known Series",
            region: "uk",
          },
        ]}
        providerResponseCacheCount={12}
        onClearHiddenItems={() => undefined}
        onClearManualBookMatches={() => undefined}
        onClearManualSeriesMatches={() => undefined}
        onClearProviderResponseCache={() => undefined}
        onClearResultsPreferences={() => undefined}
        onClearScanPreferences={() => undefined}
      />
    );

    expect(html).toContain("1 hidden items");
    expect(html).toContain("12 cached metadata provider responses");
    expect(html).toContain("1 manually owned books");
    expect(html).toContain("1 manual provider-series overrides");
  });

  it("keeps legacy V1 data separated from current V2 stores", () => {
    const html = renderToStaticMarkup(
      <LegacyLocalStoreRows onClearLegacyData={() => undefined} />
    );

    expect(html).toContain("Legacy V1 data");
    expect(html).toContain("Not used by V2 scans");
  });
});
