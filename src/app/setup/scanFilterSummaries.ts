import type { RegionCode } from "../../domain/audiobook";
import type { MetadataLookupMode, ScanOptions } from "../../features/scan/runLibraryScan";
import {
  getMetadataProviderSearchModeLabel,
  getMetadataProviderSelectionLabel,
} from "../../integrations/metadata/metadataProviderRegistry";
import { regions } from "./scanFormTypes";

const FILTER_LABELS: Array<[keyof ScanOptions, string]> = [
  ["onlyUnabridged", "Only unabridged"],
  ["includeSubSeries", "Subseries included"],
  ["ignoreMultiBooks", "Omnibus hidden"],
  ["ignoreNoPositionBooks", "No-position books hidden"],
  ["ignoreSubPositionBooks", "Decimal positions hidden"],
  ["ignoreFutureDateBooks", "Unreleased books hidden"],
  ["ignoreFuturePlaceholders", "Empty placeholders hidden"],
  ["ignorePastDateBooks", "Released books hidden"],
  ["ignoreTitleSubtitle", "Owned title/subtitle hidden"],
  ["ignoreSameSeriesPosition", "Owned positions hidden"],
  ["ignoreTitleSubtitleInMissingArray", "Duplicate titles collapsed"],
  ["ignoreSameSeriesPositionInMissingArray", "Duplicate positions collapsed"],
  ["matchNarratorEditions", "Narrator editions separated"],
  ["cacheMetadata", "Catalogue cache on"],
];

/**
 * Purpose: Convert enabled scan options into compact labels for summaries,
 * debug history, and results context.
 *
 * @param options - Scan options used for a completed or pending scan.
 * @returns Human-readable active filter labels.
 */
export function getActiveScanFilterLabels(options: ScanOptions): string[] {
  return [
    getMetadataProviderSelectionLabel(options.metadataProviderIds),
    getMetadataProviderSearchModeLabel(options.metadataProviderSearchMode),
    ...FILTER_LABELS.filter(([key]) => options[key] === true).map(([, label]) => label),
  ];
}

/**
 * Purpose: Convert lookup mode values into user-facing scan depth labels.
 *
 * @param lookupMode - Scan lookup mode.
 * @returns Compact display label.
 */
export function getLookupModeLabel(lookupMode: MetadataLookupMode): string {
  const labels: Record<MetadataLookupMode, string> = {
    quick: "Quick scan",
    balanced: "Balanced scan",
    thorough: "Thorough scan",
  };

  return labels[lookupMode];
}

/**
 * Purpose: Convert an Audible region code into the configured display label.
 *
 * @param region - Audible region code.
 * @returns Configured region label, or the upper-case code when unknown.
 */
export function getRegionLabel(region: RegionCode): string {
  return (
    regions.find((availableRegion) => availableRegion.value === region)?.label ??
    region.toUpperCase()
  );
}
