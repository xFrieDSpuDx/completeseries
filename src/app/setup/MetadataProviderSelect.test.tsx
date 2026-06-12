import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MetadataProviderSelect } from "./MetadataProviderSelect";

describe("MetadataProviderSelect", () => {
  it("warns when Apple Books is selected", () => {
    const html = renderToStaticMarkup(
      <MetadataProviderSelect
        id="metadataProvider"
        label="Metadata Providers"
        providerIds={["audible", "appleBooks"]}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("Apple Books is search-only");
    expect(html).toContain("reliability and some filters are limited");
  });

  it("warns when Open Library is selected", () => {
    const html = renderToStaticMarkup(
      <MetadataProviderSelect
        id="metadataProvider"
        label="Metadata Providers"
        providerIds={["audible", "openLibrary"]}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("Open Library is not audiobook-specific");
    expect(html).toContain("series completeness are limited");
  });

  it("warns when Google Books is selected", () => {
    const html = renderToStaticMarkup(
      <MetadataProviderSelect
        id="metadataProvider"
        label="Metadata Providers"
        providerIds={["audible", "googleBooks"]}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("Google Books searches Google&#x27;s general book catalogue");
    expect(html).toContain("availability, format, and series completeness are limited");
    expect(html).toContain("Add a Google Books API key");
  });

  it("renders a Google Books API key field when Google Books is selected and editable", () => {
    const html = renderToStaticMarkup(
      <MetadataProviderSelect
        googleBooksApiKey="existing-key"
        id="metadataProvider"
        label="Metadata Providers"
        providerIds={["audible", "googleBooks"]}
        onGoogleBooksApiKeyChange={() => undefined}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("Google Books API key");
    expect(html).toContain("existing-key");
    expect(html).toContain("Google requests will use this API key");
  });

  it("does not show the Apple Books warning for Audible-only scans", () => {
    const html = renderToStaticMarkup(
      <MetadataProviderSelect
        id="metadataProvider"
        label="Metadata Providers"
        providerIds={["audible"]}
        onChange={() => undefined}
      />
    );

    expect(html).not.toContain("Apple Books is search-only");
    expect(html).not.toContain("Google Books searches Google&#x27;s general book catalogue");
    expect(html).not.toContain("Open Library is not audiobook-specific");
  });
});
