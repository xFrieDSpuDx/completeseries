import { describe, expect, it } from "vitest";
import type { ManualSeriesMatch } from "../../features/scan/runLibraryScan";
import {
  parseManualSeriesMatchesPayload,
  upsertManualSeriesMatch,
} from "./manualSeriesMatchStore";

describe("manualSeriesMatchStore", () => {
  it("parses manual matches from local data exports", () => {
    const payload = JSON.stringify({
      manualSeriesMatches: [
        {
          createdAt: "2026-05-27T08:00:00.000Z",
          localSeriesId: "local-1",
          localSeriesName: "Bridei",
          providerId: "audible",
          providerName: "Audible catalogue",
          providerSeriesAsin: "series-bridei",
          providerSeriesName: "Bridei",
          region: "uk",
        },
        { localSeriesName: "Incomplete" },
      ],
    });

    expect(parseManualSeriesMatchesPayload(payload)).toHaveLength(1);
  });

  it("replaces one manual match per local series, provider, and region", () => {
    const firstMatch: ManualSeriesMatch = {
      createdAt: "2026-05-27T08:00:00.000Z",
      localSeriesId: "local-1",
      localSeriesName: "Bridei",
      providerId: "audible",
      providerSeriesAsin: "old-series",
      region: "uk",
    };
    const secondMatch: ManualSeriesMatch = {
      ...firstMatch,
      createdAt: "2026-05-27T08:01:00.000Z",
      providerSeriesAsin: "new-series",
    };

    expect(upsertManualSeriesMatch([firstMatch], secondMatch)).toEqual([secondMatch]);
  });
});
