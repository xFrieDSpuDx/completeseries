import type { ProviderSeriesBook, ProviderSeriesCandidate, RegionCode } from "../../domain/audiobook";
import type { ManualBookMatch } from "../../domain/manualBookMatches";
import type { MissingBookDiagnostic, MissingBookGroup } from "../../domain/missingBooks";
import { buildAudibleProductLink } from "../../integrations/metadata/audibleLinks";

export type MissingBooksManualBookSource = {
  providerId: string;
  providerName?: string;
  providerSeriesAsin: string;
  providerSeriesName: string;
  region: ManualBookMatch["region"];
};

const regionCodes = new Set<RegionCode>([
  "au",
  "br",
  "ca",
  "de",
  "es",
  "fr",
  "in",
  "it",
  "jp",
  "uk",
  "us",
]);

/**
 * Purpose: Convert modal match source data into the provider-series shape used
 * by manual owned-book matching.
 *
 * @param source - Provider series details for the opened result group.
 * @returns Provider series reference for manual book matching.
 */
export function buildProviderSeriesReference(
  source: MissingBooksManualBookSource
): Pick<ProviderSeriesCandidate, "name" | "providerId" | "providerName" | "seriesAsin"> {
  return {
    name: source.providerSeriesName,
    providerId: source.providerId,
    providerName: source.providerName,
    seriesAsin: source.providerSeriesAsin,
  };
}

/**
 * Purpose: Build the safest provider-page URL available for the missing book,
 * repairing old cached Audible links that only contain `/pd/ASIN`.
 *
 * @param book - Provider book shown as missing.
 * @param fallbackRegion - Selected scan region used when older cached data did
 * not store a book-level region.
 * @returns A provider page URL, or `null` when no link can be built.
 */
export function getProviderPageLink(
  book: ProviderSeriesBook,
  fallbackRegion?: RegionCode
): string | null {
  const region = parseRegionCode(book.region) ?? fallbackRegion;
  if (!region || !book.asin) return book.link ?? null;
  if (book.link && !isAudibleProductLink(book.link)) return book.link;

  return buildAudibleProductLink(region, book.asin, book.link, book.title);
}

/**
 * Purpose: Convert detailed diagnostics into short, high-signal visible flags.
 *
 * @param diagnostic - Diagnostic data for the visible missing book.
 * @returns Compact labels explaining the strongest reasons a book is listed.
 */
export function getDiagnosticFlags(diagnostic: MissingBookDiagnostic): string[] {
  const text = [...diagnostic.shownBecause, ...diagnostic.checks].join(" ").toLowerCase();
  const flags: string[] = [];

  if (text.includes("no matching asin")) flags.push("New ASIN/SKU");
  if (text.includes("narrator-sensitive")) flags.push("Narrator differs");
  if (text.includes("no local title")) flags.push("No title match");
  if (text.includes("no local book was found at provider series position")) {
    flags.push("Position gap");
  }

  return flags.length > 0 ? flags : ["Needs review"];
}

/**
 * Purpose: Get the most relevant series position badge for a missing book card.
 *
 * @param book - Provider book shown in the selected missing-book group.
 * @param group - Missing-book group that was opened by the user.
 * @returns A compact `#position` badge, or an empty string when no position is
 * available.
 */
export function getBookPositionBadge(book: ProviderSeriesBook, group: MissingBookGroup): string {
  const matchingSeries =
    book.series.find((series) => series.asin && series.asin === group.seriesAsin) ??
    book.series.find((series) => series.name === group.seriesName) ??
    book.series[0];

  return matchingSeries?.position ? `#${matchingSeries.position}` : "";
}

/**
 * Purpose: Convert a provider book's series entries into compact position text.
 *
 * @param book - Provider book containing series entries.
 * @returns Human-readable series position text.
 */
export function getBookSeriesPositions(book: ProviderSeriesBook): string {
  const positions = book.series
    .map((series) => `${series.name} #${series.position ?? "N/A"}`)
    .filter(Boolean);

  return positions.join("; ") || "Unknown";
}

/**
 * Purpose: Pick the best available overview text from provider metadata.
 *
 * @param book - Provider book with optional summary and description fields.
 * @returns Overview text for the book detail drawer.
 */
export function getBookOverview(book: ProviderSeriesBook): string {
  const overviews = [book.summary, book.description].filter(isPresent);
  return overviews.sort((first, second) => scoreOverview(second) - scoreOverview(first))[0] ?? "";
}

/**
 * Purpose: Check whether a stored provider link looks like an Audible product
 * page and can therefore be safely repaired by the Audible link builder.
 *
 * @param link - Stored provider URL or path.
 * @returns `true` when the link appears to be an Audible product URL/path.
 */
function isAudibleProductLink(link: string): boolean {
  try {
    const parsedUrl = new URL(link, "https://www.audible.co.uk");
    const firstPathPart = parsedUrl.pathname.split("/").filter(Boolean)[0]?.toLowerCase();

    return parsedUrl.hostname.includes("audible.") || firstPathPart === "pd";
  } catch {
    return false;
  }
}

/**
 * Purpose: Parse a stored provider region value into a supported Complete
 * Series Audible region code.
 *
 * @param region - Region value from provider data or cached scan output.
 * @returns A supported region code, or `null` when the value is unknown.
 */
function parseRegionCode(region: ProviderSeriesBook["region"]): RegionCode | null {
  if (!region || !regionCodes.has(region as RegionCode)) return null;

  return region as RegionCode;
}

/**
 * Purpose: Prefer the least-truncated overview text when providers expose both
 * a short summary and a fuller description.
 *
 * @param overview - Candidate overview text.
 * @returns A score where longer, non-ellipsis text ranks highest.
 */
function scoreOverview(overview: string): number {
  const trimmedOverview = overview.trim();
  const truncationPenalty = /\.{3}$|…$/.test(trimmedOverview) ? 5000 : 0;
  return trimmedOverview.length - truncationPenalty;
}

/**
 * Purpose: Narrow nullable overview values out of candidate arrays.
 *
 * @param value - Nullable string value.
 * @returns `true` when the value contains non-whitespace text.
 */
function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
