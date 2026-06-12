import type { LocalBookEvidence } from "../../domain/audiobook";
import type { MetadataLookupAnchor } from "../../features/scan/lookupAnchors";
import type { ProviderDiscoveryTrace } from "../../features/scan/providerDiscoveryTrace";
import type { SeriesCandidateReview } from "../../features/scan/seriesScanReport";

/**
 * Purpose: Summarise the lookup anchors tried during provider discovery.
 *
 * @param lookupAnchors - Provider-neutral anchors used during metadata lookup.
 * @returns Human-readable lookup-anchor summary.
 */
export function formatLookupAnchors(lookupAnchors: MetadataLookupAnchor[]): string {
  if (lookupAnchors.length === 0) return "no lookup anchors";

  return `${lookupAnchors.length} lookup anchor${lookupAnchors.length === 1 ? "" : "s"} used`;
}

/**
 * Purpose: Prefer provider display names while keeping unknown providers
 * readable.
 *
 * @param candidate - Candidate being labelled.
 * @returns Provider name for review UI.
 */
export function formatProviderName(candidate: SeriesCandidateReview): string {
  return candidate.providerName ?? candidate.providerId ?? "Unknown provider";
}

/**
 * Purpose: Convert provider evidence level into user-facing review text.
 *
 * @param evidenceLevel - Provider or candidate trust level.
 * @returns Short display label for the evidence level.
 */
export function formatEvidenceLevel(evidenceLevel: string | undefined): string {
  if (evidenceLevel === "trusted") return "trusted";
  if (evidenceLevel === "weak") return "weak evidence";
  return "review evidence";
}

/**
 * Purpose: Summarise one provider discovery step without exposing raw provider
 * response data in the main Review card.
 *
 * @param step - Provider discovery step captured during scan.
 * @returns Compact status and count text.
 */
export function formatProviderStep(step: ProviderDiscoveryTrace["steps"][number]): string {
  const counts = [
    typeof step.requestCount === "number" ? `${step.requestCount} requests` : null,
    typeof step.candidateCount === "number" ? `${step.candidateCount} candidates` : null,
  ].filter(Boolean);
  const suffix = counts.length > 0 ? ` (${counts.join(", ")})` : "";

  return `${step.status}${suffix}`;
}

/**
 * Purpose: Format a local book title and optional subtitle.
 *
 * @param book - Local book evidence.
 * @returns Combined title/subtitle text.
 */
export function formatBookTitle(book: LocalBookEvidence): string {
  return book.subtitle ? `${book.title}: ${book.subtitle}` : book.title;
}

/**
 * Purpose: Format local series-position evidence for review.
 *
 * @param book - Local book evidence.
 * @returns Series position text, or a placeholder when absent.
 */
export function formatBookPosition(book: LocalBookEvidence): string {
  return book.position.raw ? `#${book.position.raw}` : "no position";
}

/**
 * Purpose: Format the identifiers that can help explain provider matching.
 *
 * @param book - Local book evidence.
 * @returns ASIN/SKU/SKU group text, or a placeholder when absent.
 */
export function formatBookIdentifiers(book: LocalBookEvidence): string {
  const identifiers = [
    book.asin ? `ASIN ${book.asin}` : null,
    book.sku ? `SKU ${book.sku}` : null,
    book.skuGroup ? `SKU group ${book.skuGroup}` : null,
  ].filter(Boolean);

  return identifiers.join(", ") || "no identifiers";
}
