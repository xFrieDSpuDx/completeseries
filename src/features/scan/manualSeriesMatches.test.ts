import { describe, expect, it } from "vitest";
import type { LocalSeriesEvidence } from "../../domain/audiobook";
import { getManualSeriesMatchesForProvider, type ManualSeriesMatch } from "./manualSeriesMatches";

describe("getManualSeriesMatchesForProvider", () => {
  it("finds matches by local series id, provider, and region", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "series-1",
      name: "The Locked Tomb",
      books: [],
    };
    const matches: ManualSeriesMatch[] = [
      {
        createdAt: "2026-05-26T22:00:00.000Z",
        localSeriesId: "series-1",
        localSeriesName: "Different local name",
        providerId: "audible",
        providerSeriesAsin: "manual-series",
        region: "uk",
      },
      {
        createdAt: "2026-05-26T22:00:00.000Z",
        localSeriesId: "series-1",
        localSeriesName: "The Locked Tomb",
        providerId: "audible",
        providerSeriesAsin: "wrong-region",
        region: "us",
      },
    ];

    expect(getManualSeriesMatchesForProvider(localSeries, "audible", "uk", matches)).toEqual([
      matches[0],
    ]);
  });

  it("falls back to normalised local series names", () => {
    const localSeries: LocalSeriesEvidence = {
      id: "new-id",
      name: "Cormoran Strike",
      books: [],
    };
    const matches: ManualSeriesMatch[] = [
      {
        createdAt: "2026-05-26T22:00:00.000Z",
        localSeriesName: "Cormoron Strike",
        providerId: "audible",
        providerSeriesAsin: "misspelled-name",
        region: "uk",
      },
      {
        createdAt: "2026-05-26T22:00:00.000Z",
        localSeriesName: "Cormoran Strike",
        providerId: "audible",
        providerSeriesAsin: "matching-name",
        region: "uk",
      },
    ];

    expect(getManualSeriesMatchesForProvider(localSeries, "audible", "uk", matches)).toEqual([
      matches[1],
    ]);
  });
});
