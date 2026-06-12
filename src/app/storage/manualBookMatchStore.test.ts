import { describe, expect, it } from "vitest";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import { parseManualBookMatchesPayload, upsertManualBookMatch } from "./manualBookMatchStore";

describe("manualBookMatchStore", () => {
  it("parses manual owned-book matches from local data exports", () => {
    const payload = JSON.stringify({
      manualBookMatches: [
        {
          createdAt: "2026-05-27T00:00:00.000Z",
          providerId: "audible",
          region: "uk",
          seriesName: "Discworld",
          asin: "B09MDKHZV5",
          title: "Monstrous Regiment",
          authors: ["Terry Pratchett"],
        },
      ],
    });

    expect(parseManualBookMatchesPayload(payload)).toHaveLength(1);
  });

  it("replaces one manual owned-book match per provider identifier", () => {
    const firstMatch = buildMatch("2026-05-27T00:00:00.000Z");
    const secondMatch = buildMatch("2026-05-27T01:00:00.000Z");

    expect(upsertManualBookMatch([firstMatch], secondMatch)).toEqual([secondMatch]);
  });
});

/**
 * Purpose: Build a manual owned-book match fixture for store tests.
 *
 * @param createdAt - Timestamp to place on the fixture.
 * @returns A manual book match fixture.
 */
function buildMatch(createdAt: string): ManualBookMatch {
  return {
    createdAt,
    providerId: "audible",
    region: "uk",
    seriesAsin: "series-discworld",
    seriesName: "Discworld",
    asin: "B09MDKHZV5",
    title: "Monstrous Regiment",
    authors: ["Terry Pratchett"],
  };
}
