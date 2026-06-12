import type { ScanOptions } from "../../features/scan/runLibraryScan";
import type { ScanFilters } from "./scanFormTypes";

/**
 * Purpose: Extract the user-editable scan filter fields from a complete scan
 * options object.
 *
 * @param scanOptions - Full scan options from the completed scan.
 * @returns Scan filters safe for the shared filter controls.
 */
export function extractScanFilters(scanOptions: ScanOptions): ScanFilters {
  return {
    includeSubSeries: scanOptions.includeSubSeries,
    metadataLookupMode: scanOptions.metadataLookupMode,
    metadataProviderIds: scanOptions.metadataProviderIds,
    metadataProviderSearchMode: scanOptions.metadataProviderSearchMode,
    googleBooksApiKey: scanOptions.googleBooksApiKey ?? "",
    onlyUnabridged: scanOptions.onlyUnabridged,
    ignoreMultiBooks: scanOptions.ignoreMultiBooks,
    ignoreNoPositionBooks: scanOptions.ignoreNoPositionBooks,
    ignoreSubPositionBooks: scanOptions.ignoreSubPositionBooks,
    ignoreFutureDateBooks: scanOptions.ignoreFutureDateBooks,
    ignoreFuturePlaceholders: scanOptions.ignoreFuturePlaceholders,
    ignorePastDateBooks: scanOptions.ignorePastDateBooks,
    ignoreTitleSubtitle: scanOptions.ignoreTitleSubtitle,
    ignoreSameSeriesPosition: scanOptions.ignoreSameSeriesPosition,
    ignoreTitleSubtitleInMissingArray: scanOptions.ignoreTitleSubtitleInMissingArray,
    ignoreSameSeriesPositionInMissingArray: scanOptions.ignoreSameSeriesPositionInMissingArray,
    matchNarratorEditions: scanOptions.matchNarratorEditions,
    cacheMetadata: scanOptions.cacheMetadata,
  };
}
