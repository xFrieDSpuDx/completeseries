// metadataCollector.js

import { fetchAudibleMetadata } from "../scripts/dataFetcher.js";
import { setMessage } from "../utils/uiFeedback.js";
import { removeHiddenBooks } from "../scripts/dataCleaner.js";
import { isCurrentlyHidden } from "../scripts/visibility.js";

/**
 * Fetches metadata for a list of Audible book ASINs.
 * Displays progress feedback to the user while looping.
 *
 * @param {Array<Object>} existingSeries - List of books with { asin, series, title }
 * @param {string} audibleRegion - Audible region code (e.g., 'uk', 'us')
 * @returns {Array} seriesAsins: Array<string>
 */
export async function collectBookMetadata(
  existingSeries,
  audibleRegion,
  includeSubSeries
) {
  const seriesAsins = [];

  const totalBooks = existingSeries.length;
  let processedCount = 0;

  for (const book of existingSeries) {
    const bookASIN = book.asin;

    // Skip invalid ASINs
    if (!bookASIN || bookASIN === "Unknown ASIN") {
      processedCount++;
      continue;
    }

    try {
      // UI feedback
      setMessage(
        `Fetching book metadata: ${processedCount + 1} / ${totalBooks}`
      );

      // Fetch book metadata
      const metadata = await fetchAudibleMetadata(
        bookASIN,
        audibleRegion,
        "book"
      );

      if (!metadata?.series) {
        continue;
      }

      // Check to see if series is hidden (for books in multiple series)
      for (const bookSeries of metadata?.series) {
        const isSeriesHidden = isCurrentlyHidden({
          type: "series",
          series: bookSeries.name,
        });
        
        if (isSeriesHidden) {
          continue;
        }

        // check Duplicates
        if (!seriesAsins.includes(bookSeries.asin)) {
          // If ASIN does not exist yet, add it
          seriesAsins.push(bookSeries.asin);
        }

        if (!includeSubSeries) {
          break;
        }
      }
    } catch (error) {
      console.warn(`Error fetching metadata for ASIN ${bookASIN}:`, error);
    }

    processedCount++;
  }

  return seriesAsins;
}

/**
 * Fetches metadata for each series using its ASIN.
 * Filters out hidden books and displays UI progress.
 *
 * @param {Array<string>} seriesAsins - Audible series ASINs to fetch
 * @param {string} audibleRegion - Audible region code (e.g., 'uk')
 * @returns {Array<Object>} - List of { seriesAsin, response } entries
 */
export async function collectSeriesMetadata(seriesAsins, audibleRegion) {
  const seriesMetadataResults = [];
  const totalSeries = seriesAsins.length;
  let processedCount = 0;

  for (const seriesAsin of seriesAsins) {
    try {
      // Show progress to the user
      setMessage(
        `Fetching series metadata: ${processedCount + 1} / ${totalSeries}`
      );

      const seriesResponse = await fetchAudibleMetadata(
        seriesAsin,
        audibleRegion,
        "series"
      );

      // If response is not valid or empty, skip it
      if (!Array.isArray(seriesResponse)) continue;

      // Remove hidden books, skip if nothing remains
      if (!removeHiddenBooks(seriesResponse)) continue;

      // Append clean series metadata
      seriesMetadataResults.push({
        seriesAsin,
        response: seriesResponse,
      });
    } catch (error) {
      console.warn(
        `Error fetching series metadata for ASIN ${seriesAsin}:`,
        error
      );
    }

    processedCount++;
  }

  return seriesMetadataResults;
}
