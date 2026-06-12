import { describe, expect, it } from "vitest";
import { parseResultsPreferencesPayload } from "./resultsPreferencesStore";

describe("resultsPreferencesStore", () => {
  it("imports results display preferences from V2 local data exports", () => {
    const preferences = parseResultsPreferencesPayload(
      JSON.stringify({
        resultsPreferences: {
          showHiddenItems: true,
          sortOrder: "authorDesc",
        },
      })
    );

    expect(preferences).toEqual({
      showHiddenItems: true,
      sortOrder: "authorDesc",
    });
  });

  it("falls back to defaults for unknown sort orders", () => {
    const preferences = parseResultsPreferencesPayload(
      JSON.stringify({
        resultsPreferences: {
          showHiddenItems: true,
          sortOrder: "newestFirst",
        },
      })
    );

    expect(preferences).toEqual({
      showHiddenItems: true,
      sortOrder: "seriesAsc",
    });
  });

  it("returns null when a payload has no results preferences", () => {
    expect(parseResultsPreferencesPayload(JSON.stringify({ hiddenItems: [] }))).toBeNull();
  });
});
