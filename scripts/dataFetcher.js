// dataFetcher.js

import { sanitiseAudiobookShelfURL } from "./dataCleaner.js";

/**
 * Authenticates with the AudiobookShelf PHP backend using user credentials,
 * and retrieves the initial list of series and books.
 *
 * @param {Object} credentials - An object with:
 *   @property {string} serverUrl - The AudiobookShelf server URL.
 *   @property {string} username - The user's login name.
 *   @property {string} password - The user's password.
 *
 * @returns {Promise<Object>} - Parsed JSON response from the server,
 * containing authentication token and library data.
 *
 * @throws {Error} - If the login request fails (e.g., incorrect credentials or network error).
 */
export async function fetchExistingContent(credentials) {
  // Ensure the server URL is well-formed
  credentials.serverUrl = sanitiseAudiobookShelfURL(credentials.serverUrl);

  // Send credentials to the backend login handler
  const response = await fetch("php/existingSeriesFetcher.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: credentials.serverUrl,
      username: credentials.username,
      password: credentials.password,
    }),
  });

  // Throw an error if the login attempt failed
  if (!response.ok) {
    throw new Error("Login failed. Please check your credentials and try again.");
  }

  // Return the parsed response as a JavaScript object
  return await response.json();
}

/**
 * Retrieves metadata from Audible for either a single book or an entire series.
 *
 * @param {string} itemASIN - The ASIN (Amazon ID) for the book or series.
 * @param {string} region - Audible region code (e.g., 'uk', 'us', 'de').
 * @param {string} itemType - Either "book" or "series", depending on the request type.
 *
 * @returns {Promise<Object|Array>} - JSON metadata from AudibleMeta API for the item.
 *
 * @throws {Error} - If the fetch request fails (e.g., bad ASIN, region mismatch).
 */
export async function fetchAudibleMetadata(itemASIN, region, itemType) {
  const response = await fetch("php/audimeta_proxy.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asin: itemASIN,
      type: itemType,
      region: region,
    }),
  });

  // Handle network or API failures
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata for ASIN: ${itemASIN}`);
  }

  return await response.json();
}