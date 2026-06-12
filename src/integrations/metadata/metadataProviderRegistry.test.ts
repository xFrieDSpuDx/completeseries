import { describe, expect, it } from "vitest";
import {
  defaultMetadataProviderIds,
  getMetadataProviderSearchModeLabel,
  getMetadataProviderSelectionLabel,
  getMetadataProvidersById,
  metadataProviderOptions,
  normaliseMetadataProviderIds,
} from "./metadataProviderRegistry";

describe("metadata provider registry", () => {
  it("defaults to Audible when no valid provider is selected", () => {
    expect(normaliseMetadataProviderIds(undefined)).toEqual(defaultMetadataProviderIds);
    expect(normaliseMetadataProviderIds(["unknown"])).toEqual(defaultMetadataProviderIds);
  });

  it("ignores removed or unknown providers when resolving selected providers", () => {
    expect(
      getMetadataProvidersById([
        "removed-provider",
        "openLibrary",
        "googleBooks",
        "appleBooks",
        "audible",
      ]).map((provider) => provider.id)
    ).toEqual(["audible", "appleBooks", "googleBooks", "openLibrary"]);
  });

  it("exposes Audible as default and alternate providers as experimental", () => {
    expect(defaultMetadataProviderIds).toEqual(["audible"]);
    expect(metadataProviderOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          defaultSelected: true,
          id: "audible",
          lifecycle: "primary",
        }),
        expect.objectContaining({
          defaultSelected: false,
          id: "appleBooks",
          evidenceLevel: "review",
          lifecycle: "experimental",
        }),
        expect.objectContaining({
          defaultSelected: false,
          id: "googleBooks",
          evidenceLevel: "review",
          lifecycle: "experimental",
        }),
        expect.objectContaining({
          defaultSelected: false,
          id: "openLibrary",
          evidenceLevel: "review",
          lifecycle: "experimental",
        }),
      ])
    );
  });

  it("normalises removed provider selections back to Audible", () => {
    expect(normaliseMetadataProviderIds(["removed-provider"])).toEqual(["audible"]);
    expect(getMetadataProviderSelectionLabel(["removed-provider"])).toBe("Audible catalogue");
  });

  it("builds user-facing provider labels", () => {
    expect(getMetadataProviderSelectionLabel(["audible"])).toBe("Audible catalogue");
    expect(getMetadataProviderSelectionLabel(["appleBooks"])).toBe("Apple Books");
    expect(getMetadataProviderSelectionLabel(["googleBooks"])).toBe("Google Books");
    expect(getMetadataProviderSelectionLabel(["openLibrary"])).toBe("Open Library");
    expect(getMetadataProviderSelectionLabel(["audible", "appleBooks"])).toBe(
      "2 metadata providers"
    );
    expect(getMetadataProviderSelectionLabel(["audible", "appleBooks", "googleBooks"])).toBe(
      "3 metadata providers"
    );
    expect(
      getMetadataProviderSelectionLabel(["audible", "appleBooks", "googleBooks", "openLibrary"])
    ).toBe("4 metadata providers");
    expect(getMetadataProviderSelectionLabel(["unknown"])).toBe("Audible catalogue");
    expect(getMetadataProviderSearchModeLabel("deep")).toBe("Deep provider search");
  });
});
