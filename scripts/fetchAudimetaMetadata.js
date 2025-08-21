/**
 * Fetches metadata from audimeta.de for a specific Audible book or series.
 * Includes response headers such as rate limits and cache status.
 *
 * @param {Object} params - Input parameters for the request.
 * @param {string} params.type - Either "book" or "series" (defaults to "book").
 * @param {string} params.asin - Audible ASIN identifier (must be provided).
 * @param {string} params.region - Audible region code, e.g., "uk", "us", "de" (defaults to "uk").
 *
 * @returns {Promise<Object>} - An object containing:
 *   - audiMetaResponse: Parsed JSON data from audimeta.de.
 *   - responseHeaders: Metadata from the response headers including rate limits and cache status.
 *
 * @throws {Error} If required fields are missing or the fetch request fails.
 */
export async function fetchAudimetaMetadata(params) {
  // Destructure input with defaults
  const { type = "book", asin = "", region = "uk" } = params;

  // Validate required fields
  if (!type || !asin || !region) throw new Error("Missing required fields: type, asin, or region.");

  // Clean up input values
  const trimmedASIN = asin.trim();
  const regionCode = region.trim().toLowerCase();

  // Build the API URL based on type
  const apiUrl =
    type === "book"
      ? `https://audimeta.de/book/${trimmedASIN}?cache=true&region=${regionCode}`
      : `https://audimeta.de/series/${trimmedASIN}/books?region=${regionCode}&cache=true`;

  // Perform the fetch request
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  // Handle non-OK responses gracefully
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`audimeta.de request failed (${response.status}): ${errorText}`);
  }

  // Extract and return both data and headers
  const audiMetaResponse = await response.json();
  const responseHeaders = {
    requestLimit: response.headers.get("x-ratelimit-limit"),
    requestRemaining: response.headers.get("x-ratelimit-remaining"),
    cached: response.headers.get("x-cached"),
  };

  return { audiMetaResponse, responseHeaders };
}
