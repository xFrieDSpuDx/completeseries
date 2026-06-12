import { describe, expect, it } from "vitest";
import { cleanProviderText, decodeHtmlEntities } from "./providerText";

describe("providerText", () => {
  it("decodes named and numeric HTML entities", () => {
    expect(decodeHtmlEntities("&quot;A &amp; B&#39;s tale&#x201d;")).toBe("\"A & B's tale\"");
  });

  it("strips HTML tags and normalises whitespace", () => {
    expect(cleanProviderText("<p>One&nbsp;<strong>&amp;</strong> two</p>")).toBe("One & two");
  });

  it("keeps unknown entities unchanged", () => {
    expect(cleanProviderText("A &madeup; entity")).toBe("A &madeup; entity");
  });
});
