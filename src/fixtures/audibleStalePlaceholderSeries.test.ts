import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultScanFilters } from "../app/setup/scanFormTypes";
import type { LocalBookEvidence, LocalSeriesEvidence } from "../domain/audiobook";
import { findMissingBooksForSeries } from "../domain/missingBooks";
import { parseSeriesPosition } from "../domain/normalise";
import { audibleProvider } from "../integrations/metadata/audibleProvider";

const SERIES_ASIN = "B0F7Z67917";
const SERIES_NAME = "Kuma Kuma Kuma Bear Light Novel";

// Audible `relationships` response for the series (region `com`), trimmed to
// the fields the app reads. Audible still lists `PL_HLDR_` placeholders for
// volumes 11-13 next to the real `BK_` books that replaced them.
const SERIES_RELATIONSHIPS = [
  { asin: "B0F7SC7WVW", sequence: "1", sku: "BK_ACX0_449599", sort: "1" },
  { asin: "B0FZSHGK6G", sequence: "11", sku: "PL_HLDR_178309", sort: "11" },
  { asin: "B0FKNNMWN1", sequence: "3", sku: "BK_ACX0_463720", sort: "3" },
  { asin: "B0H7W4G99C", sequence: "13", sku: "PL_HLDR_191903", sort: "14" },
  { asin: "B0H7WKK6R5", sequence: "17", sku: "PL_HLDR_191907", sort: "18" },
  { asin: "B0HMVHLQPJ", sequence: "13", sku: "BK_ACX0_537271", sort: "14" },
  { asin: "B0H7W9WLWL", sequence: "14", sku: "PL_HLDR_191904", sort: "15" },
  { asin: "B0FT43R19G", sequence: "5", sku: "BK_ACX0_473932", sort: "5" },
  { asin: "B0GZ8J8XGS", sequence: "10", sku: "BK_ACX0_510784", sort: "10" },
  { asin: "B0H7WFJYR5", sequence: "20", sku: "PL_HLDR_191910", sort: "21" },
  { asin: "B0H7WFVYH2", sequence: "21", sku: "PL_HLDR_191911", sort: "22" },
  { asin: "B0FZSKS8C2", sequence: "12", sku: "PL_HLDR_178310", sort: "13" },
  { asin: "B0H7T2B2B1", sequence: "11.5", sku: "BK_ACX0_520796", sort: "12" },
  { asin: "B0GKPYTYJF", sequence: "8", sku: "BK_ACX0_495373", sort: "8" },
  { asin: "B0FZLXFVB6", sequence: "6", sku: "BK_ACX0_481360", sort: "6" },
  { asin: "B0H3LTF4RF", sequence: "11", sku: "BK_ACX0_515314", sort: "11" },
  { asin: "B0H7WDDC72", sequence: "19", sku: "PL_HLDR_191909", sort: "20" },
  { asin: "B0FP5NP5Y1", sequence: "4", sku: "BK_ACX0_468807", sort: "4" },
  { asin: "B0GR17K5G5", sequence: "9", sku: "BK_ACX0_500630", sort: "9" },
  { asin: "B0HL11YMR3", sequence: "12", sku: "BK_ACX0_534131", sort: "13" },
  { asin: "B0FG3FF8M8", sequence: "2", sku: "BK_ACX0_458049", sort: "2" },
  { asin: "B0H7WBC6W3", sequence: "16", sku: "PL_HLDR_191906", sort: "17" },
  { asin: "B0G4NFQDWR", sequence: "7", sku: "BK_ACX0_485433", sort: "7" },
  { asin: "B0H7WDNQB3", sequence: "22", sku: "PL_HLDR_191912", sort: "23" },
  { asin: "B0H7W7XF3T", sequence: "15", sku: "PL_HLDR_191905", sort: "16" },
  { asin: "B0H7WHHL1F", sequence: "18", sku: "PL_HLDR_191908", sort: "19" },
];

// Real Audible titles. The naming switches between `Kuma Kuma Kuma Bear, Vol. N`
// and `Kuma Kuma Kuma Bear (Light Novel) Vol. N`, so `Vol. 13` sits one edit
// away from owned titles such as `(Light Novel) Vol. 1`.
const REAL_BOOK_TITLES: Record<string, string> = {
  B0F7SC7WVW: "Kuma Kuma Kuma Bear (Light Novel) Vol. 1",
  B0FG3FF8M8: "Kuma Kuma Kuma Bear (Light Novel) Vol. 2",
  B0FKNNMWN1: "Kuma Kuma Kuma Bear, Vol. 3",
  B0FP5NP5Y1: "Kuma Kuma Kuma Bear, Vol. 4",
  B0FT43R19G: "Kuma Kuma Kuma Bear, Vol. 5",
  B0FZLXFVB6: "Kuma Kuma Kuma Bear, Vol. 6",
  B0G4NFQDWR: "Kuma Kuma Kuma Bear (Light Novel) Vol. 7",
  B0GKPYTYJF: "Kuma Kuma Kuma Bear, Vol. 8",
  B0GR17K5G5: "Kuma Kuma Kuma Bear, Vol. 9",
  B0GZ8J8XGS: "Kuma Kuma Kuma Bear, Vol. 10",
  B0H3LTF4RF: "Kuma Kuma Kuma Bear, Vol. 11",
  B0H7T2B2B1: "Kuma Kuma Kuma Bear, Vol. 11.5",
  B0HL11YMR3: "Kuma Kuma Kuma Bear, Vol. 12",
  B0HMVHLQPJ: "Kuma Kuma Kuma Bear (Light Novel) Vol. 13",
};

const OWNED_ASINS = [
  "B0F7SC7WVW",
  "B0FG3FF8M8",
  "B0FKNNMWN1",
  "B0FP5NP5Y1",
  "B0FT43R19G",
  "B0FZLXFVB6",
  "B0G4NFQDWR",
  "B0GKPYTYJF",
  "B0GR17K5G5",
  "B0GZ8J8XGS",
  "B0H3LTF4RF",
  "B0H7T2B2B1",
  "B0HL11YMR3",
];

describe("Audible series with stale placeholder relationships", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    "reports the released volume 13 as missing (collapse duplicate positions: %s)",
    async (ignoreSameSeriesPositionInMissingArray) => {
      mockAudibleSeriesResponses();

      const providerSeries = await audibleProvider.getSeriesBooks({
        seriesAsin: SERIES_ASIN,
        region: "us",
        cache: false,
      });
      expect(providerSeries).not.toBeNull();

      const localSeries = buildOwnedLocalSeries();
      const result = findMissingBooksForSeries(localSeries, providerSeries!, localSeries.books, {
        ...defaultScanFilters,
        ignoreSameSeriesPositionInMissingArray,
        region: "us",
      });

      expect(result.books.map((book) => book.asin)).toEqual(["B0HMVHLQPJ"]);
    }
  );
});

/**
 * Purpose: Route mocked Audible catalogue requests to the series relationships
 * fixture and to product records built from it.
 *
 * @returns Nothing. `fetch` is replaced for the current test.
 */
function mockAudibleSeriesResponses(): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes(`/api/audible/us/1.0/catalog/products/${SERIES_ASIN}`)) {
      return jsonResponse({
        product: {
          asin: SERIES_ASIN,
          title: SERIES_NAME,
          relationships: SERIES_RELATIONSHIPS.map((relationship) => ({
            ...relationship,
            relationship_to_product: "child",
            relationship_type: "series",
          })),
        },
      });
    }

    if (url.includes("/api/audible/us/1.0/catalog/products?")) {
      const requestedAsins = new URL(url, "http://localhost").searchParams
        .get("asins")
        ?.split(",");
      return jsonResponse({
        products: SERIES_RELATIONSHIPS.filter((relationship) =>
          requestedAsins?.includes(relationship.asin)
        ).map(buildAudibleProduct),
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });
}

/**
 * Purpose: Build an Audible product record shaped like the live catalogue data
 * for either a real book or a `PL_HLDR_` placeholder.
 *
 * @param relationship - Series relationship fixture entry.
 * @returns Raw Audible product fixture.
 */
function buildAudibleProduct(relationship: (typeof SERIES_RELATIONSHIPS)[number]) {
  const isPlaceholder = relationship.sku.startsWith("PL_HLDR_");
  const title =
    REAL_BOOK_TITLES[relationship.asin] ??
    `Kuma Kuma Kuma Bear (Light Novel) Vol. ${relationship.sequence}`;

  return {
    asin: relationship.asin,
    sku: relationship.sku,
    title,
    authors: [{ name: "Kumanano" }],
    format_type: "unabridged",
    content_delivery_type: "SinglePartBook",
    series: [{ asin: SERIES_ASIN, title: SERIES_NAME, sequence: relationship.sequence }],
    ...(isPlaceholder
      ? {
          release_date: "2200-01-01",
          publisher_name: "ZZZ - Series Advisor Placeholder",
        }
      : {
          release_date: "2026-01-01",
          publisher_name: "Seven Seas Entertainment",
          price: { list_price: { base: 19.78, currency_code: "USD" } },
          product_images: { "500": `https://example.test/${relationship.asin}.jpg` },
        }),
  };
}

/**
 * Purpose: Build the local Audiobookshelf series that owns volumes 1-12 and
 * 11.5.
 *
 * @returns Local series evidence with real titles, ASINs, and positions.
 */
function buildOwnedLocalSeries(): LocalSeriesEvidence {
  const books: LocalBookEvidence[] = OWNED_ASINS.map((asin) => ({
    id: `local-${asin}`,
    title: REAL_BOOK_TITLES[asin],
    asin,
    authors: ["Kumanano"],
    narrators: [],
    seriesNames: [SERIES_NAME],
    position: parseSeriesPosition(
      SERIES_RELATIONSHIPS.find((relationship) => relationship.asin === asin)?.sequence
    ),
  }));

  return { id: "local-kuma", name: SERIES_NAME, books };
}

/**
 * Purpose: Wrap a fixture payload in a JSON fetch response.
 *
 * @param payload - JSON-serialisable response body.
 * @returns A 200 JSON response.
 */
function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
