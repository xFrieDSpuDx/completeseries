import { describe, expect, it } from "vitest";
import { parseScanPreferencesPayload } from "./scanPreferencesStore";

describe("scanPreferencesStore", () => {
  it("imports scan preferences from V2 local data exports", () => {
    const preferences = parseScanPreferencesPayload(
      JSON.stringify({
        preferences: {
          filters: {
            googleBooksApiKey: "google-key",
            metadataLookupMode: "quick",
            onlyUnabridged: false,
          },
          region: "us",
          selectedLibraryIds: ["library-1"],
        },
      })
    );

    expect(preferences).toMatchObject({
      filters: {
        metadataLookupMode: "quick",
        metadataProviderIds: ["audible"],
        metadataProviderSearchMode: "firstMatch",
        googleBooksApiKey: "google-key",
        onlyUnabridged: false,
      },
      region: "us",
      selectedLibraryIds: ["library-1"],
    });
  });

  it("returns null when a payload has no preferences", () => {
    expect(parseScanPreferencesPayload(JSON.stringify({ hiddenItems: [] }))).toBeNull();
  });

  it("normalises invalid provider ids from imported preferences", () => {
    const preferences = parseScanPreferencesPayload(
      JSON.stringify({
        preferences: {
          filters: {
            metadataProviderIds: ["missing-provider"],
            metadataProviderSearchMode: "deep",
          },
        },
      })
    );

    expect(preferences?.filters.metadataProviderIds).toEqual(["audible"]);
    expect(preferences?.filters.metadataProviderSearchMode).toBe("deep");
  });
});
