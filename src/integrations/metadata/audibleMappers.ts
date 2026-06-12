import type { ProviderSeriesBook, RegionCode } from "../../domain/audiobook";
import { normaliseIdentifier } from "../../domain/normalise";
import { buildAudibleProductLink } from "./audibleLinks";
import { cleanProviderText } from "./providerText";
import type {
  AudibleContributor,
  AudibleProduct,
  AudibleRelationship,
} from "./audibleTypes";

/**
 * Purpose: Convert an Audible catalogue product into Complete Series' provider
 * book shape.
 *
 * @param product - Raw Audible catalogue product.
 * @param region - Audible marketplace region used for the product lookup.
 * @returns Provider book metadata used by matching and missing-book detection.
 */
export function mapAudibleProductToProviderBook(
  product: AudibleProduct,
  region: RegionCode
): ProviderSeriesBook {
  const asin = product.asin ?? "unknown";
  const isBuyable = isAudibleProductBuyable(product);

  return {
    asin,
    title: cleanProviderText(product.title) ?? "Unknown Title",
    subtitle: cleanProviderText(product.subtitle),
    description: cleanProviderText(product.publisher_summary ?? product.merchandising_summary),
    summary: cleanProviderText(product.summary),
    sku: product.sku ?? null,
    skuGroup: product.sku_lite ?? null,
    region,
    authors: mapContributorNames(product.authors),
    narrators: mapContributorNames(product.narrators),
    series: (product.series ?? []).map((seriesEntry) => ({
      asin: seriesEntry.asin ?? null,
      name: cleanProviderText(seriesEntry.title) ?? "Unknown Series",
      position: seriesEntry.sequence ?? null,
    })),
    bookFormat: product.format_type ?? null,
    releaseDate: product.release_date ?? null,
    imageUrl: getPreferredImageUrl(product.product_images),
    link: buildAudibleProductLink(region, asin, product.url, cleanProviderText(product.title)),
    publisher: cleanProviderText(product.publisher_name),
    isAvailable: product.is_purchasability_suppressed === true ? false : true,
    isBuyable,
    isListenable: product.is_listenable,
    deliveryType: product.content_delivery_type ?? null,
    hasChildren: product.has_children ?? hasChildRelationships(product.relationships),
    childRelationshipTypes: getChildRelationshipTypes(product.relationships),
  };
}

/**
 * Purpose: Extract child relationships from an Audible series placeholder
 * product and sort them by Audible's relationship order.
 *
 * @param seriesProduct - Raw Audible series placeholder product.
 * @returns Child product relationships for the books in the series.
 */
export function getSeriesChildRelationships(seriesProduct: AudibleProduct): AudibleRelationship[] {
  return (seriesProduct.relationships ?? [])
    .filter(
      (relationship) =>
        relationship.asin &&
        relationship.relationship_type === "series" &&
        relationship.relationship_to_product === "child"
    )
    .sort(compareSeriesRelationships);
}

/**
 * Purpose: Ensure a mapped provider book contains the series relationship found
 * on the Audible series placeholder product.
 *
 * @param book - Provider book mapped from an Audible child product.
 * @param seriesAsin - Normalised Audible series ASIN.
 * @param seriesName - Audible series display title.
 * @param relationship - Audible relationship metadata connecting the book to
 * the series.
 * @returns The provider book with a matching series entry present.
 */
export function applySeriesRelationship(
  book: ProviderSeriesBook,
  seriesAsin: string,
  seriesName: string,
  relationship: AudibleRelationship
): ProviderSeriesBook {
  const position = relationship.sequence ?? relationship.sort ?? null;
  const existingEntryIndex = book.series.findIndex(
    (seriesEntry) => normaliseIdentifier(seriesEntry.asin) === seriesAsin
  );

  if (existingEntryIndex === -1) {
    return {
      ...book,
      series: [
        ...book.series,
        {
          asin: seriesAsin,
          name: seriesName,
          position,
        },
      ],
    };
  }

  return {
    ...book,
    series: book.series.map((seriesEntry, index) =>
      index === existingEntryIndex && !seriesEntry.position
        ? { ...seriesEntry, position }
        : seriesEntry
    ),
  };
}

/**
 * Purpose: Decide whether Audible relationships show child products for a
 * mapped provider book.
 *
 * @param relationships - Raw Audible relationship records from the catalogue
 * response.
 * @returns `true` when at least one relationship points from this product to a
 * child product.
 */
function hasChildRelationships(relationships: AudibleRelationship[] | undefined): boolean {
  return (relationships ?? []).some(
    (relationship) => relationship.relationship_to_product === "child"
  );
}

/**
 * Purpose: Extract the relationship types used by child products so domain
 * checks can identify container records without depending on raw Audible JSON.
 *
 * @param relationships - Raw Audible relationship records from the catalogue
 * response.
 * @returns Unique child relationship types, such as `component`.
 */
function getChildRelationshipTypes(relationships: AudibleRelationship[] | undefined): string[] {
  return [
    ...new Set(
      (relationships ?? [])
        .filter((relationship) => relationship.relationship_to_product === "child")
        .map((relationship) => relationship.relationship_type)
        .filter(isPresent)
    ),
  ];
}

/**
 * Purpose: Sort Audible series relationships using the provider's `sort` value
 * first and the visible sequence value second.
 *
 * @param first - First Audible relationship to compare.
 * @param second - Second Audible relationship to compare.
 * @returns Standard array sort comparison value.
 */
function compareSeriesRelationships(
  first: AudibleRelationship,
  second: AudibleRelationship
): number {
  return getRelationshipOrder(first) - getRelationshipOrder(second);
}

/**
 * Purpose: Convert Audible relationship order metadata into a sortable number.
 *
 * @param relationship - Audible series relationship metadata.
 * @returns Numeric sort value, or positive infinity when no order can be parsed.
 */
function getRelationshipOrder(relationship: AudibleRelationship): number {
  const rawValue = relationship.sort ?? relationship.sequence;
  const numericValue = Number.parseFloat(String(rawValue ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;
}

/**
 * Purpose: Extract contributor display names from an Audible product.
 *
 * @param contributors - Raw Audible author or narrator records.
 * @returns Contributor names with empty values removed.
 */
function mapContributorNames(contributors: AudibleContributor[] | undefined): string[] {
  return (contributors ?? [])
    .map((contributor) => cleanProviderText(contributor.name))
    .filter(isPresent);
}

/**
 * Purpose: Pick the best cover image URL from Audible's size-keyed image map.
 *
 * @param images - Audible product image URLs keyed by size.
 * @returns A preferred image URL, or `null` when no image is available.
 */
function getPreferredImageUrl(images: Record<string, string> | undefined): string | null {
  return images?.["500"] ?? images?.["882"] ?? Object.values(images ?? {})[0] ?? null;
}

/**
 * Purpose: Decide whether a public Audible catalogue product has enough
 * storefront evidence to be treated as buyable in the selected marketplace.
 *
 * @param product - Raw Audible catalogue product.
 * @returns `true` when the product exposes price evidence and is not suppressed.
 */
function isAudibleProductBuyable(product: AudibleProduct): boolean {
  if (product.is_purchasability_suppressed === true) return false;

  return (
    hasPriceValue(product.price?.lowest_price?.base) ||
    hasPriceValue(product.price?.list_price?.base)
  );
}

/**
 * Purpose: Check whether an Audible price field contains a usable numeric
 * value.
 *
 * @param value - Raw price value from the Audible API.
 * @returns `true` when the value is a finite number.
 */
function hasPriceValue(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Purpose: Narrow nullable values when mapping arrays.
 *
 * @param value - Value that may be null or undefined.
 * @returns `true` when the value is present.
 */
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
