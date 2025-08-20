// metadataCollector.js
import { fetchAudibleMetadata, findFromStorage } from "./dataFetcher.js";
import { setMessage, setRateMessage } from "./uiFeedback.js";
import { storeMetadataToLocalStorage } from "./localStorage.js";

// Rate limit configuration
const rateLimitResetTime = 60000; // Time in milliseconds before rate limit resets
let processStartTime; // Tracks when the batch process started

/**
 * Fetches metadata for a list of Audible book ASINs.
 * Also tracks and manages rate limiting per response headers.
 *
 * @param {Array<Object>} existingSeries - List of books with { asin, series, title }
 * @param {string} audibleRegion - Audible region code (e.g., 'uk', 'us')
 * @param {boolean} includeSubSeries - Whether to include subseries or not
 * @returns {Promise<Array<string>>} List of unique series ASINs
 */
export async function collectBookMetadata(
  existingSeries,
  audibleRegion,
  includeSubSeries
) {
  const seriesAsins = [];
  const totalSeries = existingSeries.length;
  let processedCount = 0;

  processStartTime = Date.now();

  for (const book of existingSeries) {
    const bookASIN = book.asin;

    // Skip empty or invalid ASINs
    if (!bookASIN || bookASIN === "Unknown ASIN") {
      processedCount++;
      continue;
    }

    try {
      let metadata = findFromStorage("asin", bookASIN, "existingFirstBookASINs");

      setMessage(
        `Fetching series unique ID: ${processedCount + 1} / ${totalSeries}`
      );

      if (!metadata) {
        // If metadata is not found in local storage, fetch it from the API
        const {
          audiMetaResponse,
          responseHeaders = {}
        } = (await fetchAudibleMetadata(bookASIN, audibleRegion, "book")) ?? {};

        if (!audiMetaResponse || typeof audiMetaResponse !== "object") {
          const err = new Error("Audible metadata missing or malformed.");
          err.details = { bookASIN, audibleRegion };
          throw err;
        }

        metadata = audiMetaResponse;

        const remainingRequestsEstimate = calculateRemainingRequests(totalSeries, processedCount, "book");

        await checkForRateLimitDelay(responseHeaders, remainingRequestsEstimate);

        if (!metadata?.series) continue;

        storeMetadataToLocalStorage(metadata, "existingFirstBookASINs");
      }
      // If metadata is not available, skip this book
      if (!metadata || !metadata.series) continue;

      for (const bookSeries of metadata.series) {
        if (!seriesAsins.includes(bookSeries.asin))
          seriesAsins.push(bookSeries.asin);

        if (!includeSubSeries) break;
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
 * Cleans out hidden books and respects rate limits.
 *
 * @param {Array<string>} seriesAsins - Audible series ASINs to fetch
 * @param {string} audibleRegion - Audible region code (e.g., 'uk')
 * @returns {Promise<Array<Object>>} Array of { seriesAsin, response } entries
 */
export async function collectSeriesMetadata(seriesAsins, audibleRegion, existingContent) {
  const seriesMetadataResults = [];
  const totalSeries = seriesAsins.length;
  let processedCount = 0;

  processStartTime = Date.now();

  for (const seriesAsin of seriesAsins) {
    try {
      let seriesMetadata = findFromStorage("seriesAsin", seriesAsin, "existingBookMetadata");

      setMessage(
        `Fetching series metadata: ${processedCount + 1} / ${totalSeries}`
      );

      if (!seriesMetadata) {
        // If metadata is not found in local storage, fetch it from the API
        const {
          audiMetaResponse,
          responseHeaders = {}
        } = (await fetchAudibleMetadata(seriesAsin, audibleRegion, "series")) ?? {};

        if (!audiMetaResponse || typeof audiMetaResponse !== "object") {
          const err = new Error("Audible metadata missing or malformed.");
          err.details = { seriesAsin, audibleRegion };
          throw err;
        }

        const remainingRequestsEstimate = calculateRemainingRequests(
          totalSeries,
          processedCount,
          "series"
        );

        await checkForRateLimitDelay(responseHeaders, remainingRequestsEstimate);

        if (!Array.isArray(audiMetaResponse)) continue;

        if (!existingContent) continue;

        seriesMetadata = {
          seriesAsin,
          response: audiMetaResponse,
        };

        storeMetadataToLocalStorage(seriesMetadata, "existingBookMetadata");
      }

      seriesMetadataResults.push(seriesMetadata);
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

/**
 * Estimates how many API requests are left based on current progress.
 * For "book", the total estimated count is doubled to account for subseries.
 *
 * @param {number} total - Total items in original list
 * @param {number} processed - Number of items already processed
 * @param {string} type - Either "book" or "series"
 * @returns {number} Remaining estimated API requests
 */
function calculateRemainingRequests(total, processed, type) {
  return type === "book"
    ? Math.max(0, total - processed + total) // Estimate subseries
    : Math.max(0, total - processed);
}

/**
 * Applies a dynamic wait if API rate limit has been reached and response is uncached.
 *
 * @param {Object} responseHeaders - The headers returned from the API response
 * @param {number} remainingRequestsEstimate - Approximate requests left in batch
 */
async function checkForRateLimitDelay(
  responseHeaders,
  remainingRequestsEstimate
) {
  if (responseHeaders.cached) return;

  const elapsed = Date.now() - processStartTime;

  if (Number(responseHeaders.requestRemaining) === 0) {
    await calculateRateLimitDelay(
      elapsed,
      remainingRequestsEstimate,
      responseHeaders.requestLimit
    );
  }
}

/**
 * Calculates a wait period based on time left in window and expected future requests.
 * This helps avoid hitting limits before reset.
 *
 * @param {number} elapsed - Time in ms since process began
 * @param {number} remainingRequestsEstimate - Number of requests remaining
 * @param {number|string} rateLimit - Max requests allowed in window
 */
async function calculateRateLimitDelay(
  elapsed,
  remainingRequestsEstimate,
  rateLimit
) {
  const millisecondsUntilReset = Math.max(rateLimitResetTime - elapsed, 0);
  const waitTimeInSeconds = Math.ceil(millisecondsUntilReset / 1000);
  const resetWindowSeconds = Math.ceil(rateLimitResetTime / 1000);

  const estimatedQuotaCycles = Math.floor(
    (remainingRequestsEstimate / rateLimit) * resetWindowSeconds
  );
  const estimatedOverhead = (remainingRequestsEstimate % rateLimit) * 0.5;

  const estimatedTimeLeft =
    waitTimeInSeconds + estimatedQuotaCycles + estimatedOverhead;
  const timeLeftMinutes = Math.ceil(estimatedTimeLeft / 60);
  const timeLeftSeconds = Math.ceil(estimatedTimeLeft % 60);

  const readableWait = `${timeLeftMinutes} minute(s) and ${timeLeftSeconds} second(s)`;
  const message = `Rate limit reached. Waiting ${waitTimeInSeconds}s before next request. Estimated time left: ${readableWait}`;

  setRateMessage(message);
  await delay(millisecondsUntilReset);
  setRateMessage(""); // Clear rate limit message after waiting
  processStartTime = Date.now(); // Reset the start time
}

/**
 * Creates a blocking delay.
 *
 * @param {number} delayInMilliseconds - Time to wait
 * @returns {Promise<void>} Resolved after delay
 */
function delay(delayInMilliseconds) {
  return new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
}