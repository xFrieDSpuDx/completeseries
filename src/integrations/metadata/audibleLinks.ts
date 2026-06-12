import type { RegionCode } from "../../domain/audiobook";

/**
 * Purpose: Build a human-facing Audible product URL for the selected
 * marketplace, preferring the provider's product path when it is available.
 *
 * @param region - Audible marketplace region selected by the user.
 * @param asin - Audible product ASIN.
 * @param sourceUrl - Optional URL/path returned by the Audible API or a
 * compatible metadata provider.
 * @param title - Optional product title used to build a more reliable fallback
 * URL when the provider only returns an ASIN-only path.
 * @returns An Audible product URL for the selected marketplace.
 */
export function buildAudibleProductLink(
  region: RegionCode,
  asin: string,
  sourceUrl?: string | null,
  title?: string | null
): string {
  const host = getAudibleWebsiteHost(region);
  const fallbackUrl = buildAudibleFallbackProductLink(host, asin, title);
  if (!sourceUrl) return fallbackUrl;

  try {
    const parsedUrl = new URL(sourceUrl, `https://${host}`);
    if (!parsedUrl.pathname.includes(asin)) return fallbackUrl;
    if (isBareAudibleProductPath(parsedUrl.pathname, asin)) return fallbackUrl;

    parsedUrl.protocol = "https:";
    parsedUrl.host = host;
    return parsedUrl.toString();
  } catch {
    return fallbackUrl;
  }
}

/**
 * Purpose: Build a human-facing Audible fallback URL. Audible accepts product
 * pages in `/pd/title-slug/ASIN` form more reliably than `/pd/ASIN` for some
 * storefront pages.
 *
 * @param host - Audible storefront host.
 * @param asin - Audible product ASIN.
 * @param title - Optional product title used for the URL slug.
 * @returns Slugged Audible product URL when a title is available, otherwise an
 * ASIN-only fallback.
 */
function buildAudibleFallbackProductLink(host: string, asin: string, title?: string | null): string {
  const slug = title ? buildAudibleProductSlug(title) : "";
  if (!slug) return `https://${host}/pd/${encodeURIComponent(asin)}`;

  return `https://${host}/pd/${encodeURIComponent(slug)}/${encodeURIComponent(asin)}`;
}

/**
 * Purpose: Detect provider URLs that only contain `/pd/ASIN`, which can fail on
 * some Audible storefronts.
 *
 * @param pathname - Parsed provider URL pathname.
 * @param asin - Audible product ASIN.
 * @returns `true` when the path has no human product slug.
 */
function isBareAudibleProductPath(pathname: string, asin: string): boolean {
  const pathParts = pathname.split("/").filter(Boolean);

  return (
    pathParts.length === 2 &&
    pathParts[0].toLowerCase() === "pd" &&
    decodeURIComponent(pathParts[1]).toUpperCase() === asin.toUpperCase()
  );
}

/**
 * Purpose: Convert an Audible product title into a product-page slug.
 *
 * @param title - Audible product title.
 * @returns A hyphenated product slug ending in `Audiobook`.
 */
function buildAudibleProductSlug(title: string): string {
  const titleSlug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!titleSlug) return "";
  if (titleSlug.toLowerCase().endsWith("-audiobook")) return titleSlug;

  return `${titleSlug}-Audiobook`;
}

/**
 * Purpose: Map Complete Series region codes to Audible storefront hosts.
 *
 * @param region - Audible marketplace region selected by the user.
 * @returns The matching public Audible storefront host.
 */
export function getAudibleWebsiteHost(region: RegionCode): string {
  const websiteHosts: Record<RegionCode, string> = {
    au: "www.audible.com.au",
    br: "www.audible.com.br",
    ca: "www.audible.ca",
    de: "www.audible.de",
    es: "www.audible.es",
    fr: "www.audible.fr",
    in: "www.audible.in",
    it: "www.audible.it",
    jp: "www.audible.co.jp",
    uk: "www.audible.co.uk",
    us: "www.audible.com",
  };

  return websiteHosts[region];
}
