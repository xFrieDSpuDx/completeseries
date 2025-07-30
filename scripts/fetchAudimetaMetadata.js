/**
 * Fetches metadata from audimeta.de for a book or a series.
 *
 * @param {Object} params - The input object containing:
 * @property {string} type - Either "book" or "series"
 * @property {string} asin - The Audible ASIN identifier
 * @property {string} region - Audible region code (e.g. "uk", "us", "de")
 *
 * @returns {Promise<Object>} - JSON metadata from audimeta.de
 * @throws {Error} - If input is invalid or the request fails
 */
export async function fetchAudimetaMetadata(params) {
  // Destructure and apply default values
  const { type = "book", asin = "", region = "uk" } = params;

  // Basic input validation
  if (!type || !asin || !region) {
    throw new Error("Missing required fields: type, asin, or region.");
  }

  // Sanitize and normalize input
  const trimmedASIN = asin.trim();
  const regionCode = region.trim().toLowerCase();

  // Construct the API endpoint based on type
  let apiUrl;
  if (type === "book") {
    apiUrl = `https://audimeta.de/book/${trimmedASIN}?cache=true&region=${regionCode}`;
  } else {
    apiUrl = `https://audimeta.de/series/${trimmedASIN}/books?region=${regionCode}&cache=true`;
  }

  // Fetch metadata from audimeta.de
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AudibleMetaBot/1.0 (+https://github.com/xFrieDSpuDx/completeseries)",
    },
  });

  // If the request fails, provide clear context in the error
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `audimeta.de request failed (${response.status}): ${errorText}`
    );
  }

  // Parse and return the response JSON
  return await response.json();
}