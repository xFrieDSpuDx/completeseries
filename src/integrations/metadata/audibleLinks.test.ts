import { describe, expect, it } from "vitest";
import { buildAudibleProductLink } from "./audibleLinks";

describe("buildAudibleProductLink", () => {
  it("builds slugged Audible links when no provider URL is available", () => {
    expect(buildAudibleProductLink("uk", "B07HS46RRD", null, "Sherlock Holmes: The Sign of Four"))
      .toBe("https://www.audible.co.uk/pd/Sherlock-Holmes-The-Sign-of-Four-Audiobook/B07HS46RRD");
  });

  it("replaces bare provider ASIN paths with slugged links", () => {
    expect(
      buildAudibleProductLink(
        "uk",
        "B07HS46RRD",
        "https://www.audible.co.uk/pd/B07HS46RRD",
        "Sherlock Holmes: The Sign of Four"
      )
    ).toBe("https://www.audible.co.uk/pd/Sherlock-Holmes-The-Sign-of-Four-Audiobook/B07HS46RRD");
  });

  it("keeps full provider paths while forcing the selected region host", () => {
    expect(
      buildAudibleProductLink(
        "uk",
        "B0BOOK",
        "https://www.audible.com/pd/Known-Book-Audiobook/B0BOOK",
        "Known Book"
      )
    ).toBe("https://www.audible.co.uk/pd/Known-Book-Audiobook/B0BOOK");
  });
});
