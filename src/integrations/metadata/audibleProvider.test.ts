import { afterEach, describe, expect, it, vi } from "vitest";
import { audibleProvider } from "./audibleProvider";

describe("audibleProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("looks up a book through the same-origin Audible catalogue route and maps product metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          product: {
            asin: "B0BOOK",
            title: "Known Book",
            subtitle: "Known Series, Book 2",
            authors: [{ name: "Known Author" }],
            content_delivery_type: "SinglePartBook",
            has_children: false,
            narrators: [{ name: "Known Narrator" }],
            format_type: "unabridged",
            is_listenable: true,
            price: { lowest_price: { base: 7.99, currency_code: "GBP" } },
            product_images: { "500": "https://example.com/image.jpg" },
            release_date: "2024-01-01",
            series: [{ asin: "B0SERIES", title: "Known Series", sequence: "2" }],
            sku: "BK_TEST_000001UK",
            sku_lite: "BK_TEST_000001",
            publisher_summary: "<p>Full publisher overview.</p>",
            summary: "<p>Short summary text.</p>",
            url: "https://www.audible.com/pd/Known-Book-Audiobook/B0BOOK",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const book = await audibleProvider.getBookByAsin({
      asin: "B0BOOK",
      region: "uk",
      cache: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/audible/uk/1.0/catalog/products/B0BOOK"),
      { headers: { Accept: "application/json" } }
    );
    expect(book).toMatchObject({
      asin: "B0BOOK",
      title: "Known Book",
      subtitle: "Known Series, Book 2",
      authors: ["Known Author"],
      narrators: ["Known Narrator"],
      bookFormat: "unabridged",
      imageUrl: "https://example.com/image.jpg",
      description: "Full publisher overview.",
      deliveryType: "SinglePartBook",
      hasChildren: false,
      childRelationshipTypes: [],
      isAvailable: true,
      isBuyable: true,
      isListenable: true,
      link: "https://www.audible.co.uk/pd/Known-Book-Audiobook/B0BOOK",
      sku: "BK_TEST_000001UK",
      skuGroup: "BK_TEST_000001",
      summary: "Short summary text.",
      series: [{ asin: "B0SERIES", name: "Known Series", position: "2" }],
    });
  });

  it("keeps catalogue products without purchase evidence available but not buyable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          product: {
            asin: "B0UNAVAILABLE",
            title: "Unavailable Book",
            authors: [{ name: "Known Author" }],
            format_type: "unabridged",
            is_listenable: true,
            is_purchasability_suppressed: false,
            release_date: "2026-05-26",
            series: [{ asin: "B0SERIES", title: "Known Series", sequence: "2" }],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const book = await audibleProvider.getBookByAsin({
      asin: "B0UNAVAILABLE",
      region: "uk",
      cache: false,
    });

    expect(book).toMatchObject({
      asin: "B0UNAVAILABLE",
      isAvailable: true,
      isBuyable: false,
      isListenable: true,
    });
  });

  it("loads Audible series children from relationships and preserves series order", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/audible/uk/1.0/catalog/products/B0SERIES")) {
        return new Response(
          JSON.stringify({
            product: {
              asin: "B0SERIES",
              title: "Known Series",
              relationships: [
                {
                  asin: "B0BOOK2",
                  relationship_to_product: "child",
                  relationship_type: "series",
                  sequence: "2",
                  sort: "2",
                },
                {
                  asin: "B0BOOK1",
                  relationship_to_product: "child",
                  relationship_type: "series",
                  sequence: "1",
                  sort: "1",
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (url.includes("/api/audible/uk/1.0/catalog/products?")) {
        return new Response(
          JSON.stringify({
            products: [
              {
                asin: "B0BOOK1",
                title: "Book One",
                authors: [{ name: "Known Author" }],
                narrators: [],
                series: [{ asin: "B0SERIES", title: "Known Series", sequence: "1" }],
              },
              {
                asin: "B0BOOK2",
                title: "Book Two",
                authors: [{ name: "Known Author" }],
                narrators: [],
                series: [{ asin: "B0SERIES", title: "Known Series", sequence: "2" }],
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const series = await audibleProvider.getSeriesBooks({
      seriesAsin: "B0SERIES",
      region: "uk",
      cache: false,
    });

    expect(series?.name).toBe("Known Series");
    expect(series?.books.map((book) => book.asin)).toEqual(["B0BOOK1", "B0BOOK2"]);
  });

  it("decodes HTML entities in visible provider text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          product: {
            asin: "B0ENTITY",
            title: "Tom &amp; Jerry",
            subtitle: "&quot;Escapes&quot; &amp; Adventures",
            authors: [{ name: "Author &amp; Co" }],
            narrators: [{ name: "Reader &#39;One&#39;" }],
            publisher_summary: "<p>&quot;Full&quot; overview &amp; more&nbsp;text.</p>",
            series: [{ asin: "B0SERIES", title: "Series &amp; Saga", sequence: "1" }],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const book = await audibleProvider.getBookByAsin({
      asin: "B0ENTITY",
      region: "uk",
      cache: false,
    });

    expect(book).toMatchObject({
      title: "Tom & Jerry",
      subtitle: '"Escapes" & Adventures',
      authors: ["Author & Co"],
      narrators: ["Reader 'One'"],
      description: '"Full" overview & more text.',
      series: [{ name: "Series & Saga" }],
    });
  });
});
