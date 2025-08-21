// dataFetcher.js
import { fetchAudimetaMetadata } from "./fetchAudimetaMetadata.js";
import { sanitiseAudiobookShelfURL, isInternalAudiobookShelfURL } from "./dataCleaner.js";
import { loadMetadataFromLocalStorage } from "./localStorage.js";
import { fetchAudiobookShelfLibrariesCall } from "./fetchLibraries.js";
import { fetchExistingSeriesLibraries } from "./fetchExistingSeries.js";
import { fetchWithDiagnosis } from "./fetchDiagnostics.js";

/**
 * Fetch existing content using an existing AudiobookShelf login.
 * Path A (JS): call JS fetcher with token (no re-login).
 * Path B (PHP): post token + libraries to php/existingSeriesFetcher.php.
 *
 * @param {Object} formData
 * @param {string} formData.serverUrl
 * @param {boolean} [formData.usePhpProxy]
 *
 * @param {Object} audiobookShelfLoginResponse
 * @param {string} audiobookShelfLoginResponse.authToken
 * @param {Array}  audiobookShelfLoginResponse.librariesList
 *
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function fetchExistingContent(formData, audiobookShelfLoginResponse) {
  const { serverUrl, usePhpProxy = false } = formData || {};
  const genericError = "Error retrieving existing content from AudiobookShelf server.";

  // normalise once, don’t mutate inputs
  const normalisedServerUrl = sanitiseAudiobookShelfURL(serverUrl);

  // Safely read prior login payload
  const { authToken = null, librariesList: audiobookShelfLibraries = null } =
    audiobookShelfLoginResponse || {};

  if (!authToken) throw new Error("Missing auth token from prior login. Please sign in first.");

  // ───────────────────────────────────────────────────────────────────────────
  // A) Direct JS path (token-based)
  // ───────────────────────────────────────────────────────────────────────────
  if (!usePhpProxy) {
    try {
      return await fetchExistingSeriesLibraries({
        serverUrl: normalisedServerUrl,
        authToken,
        libraries: audiobookShelfLibraries,
      });
    } catch (error) {
      throw new Error(error?.message || genericError, { cause: error });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B) PHP proxy path (send token + libraries to the backend fetcher)
  // ───────────────────────────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch("php/existingSeriesFetcher.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        url: normalisedServerUrl,
        libraries: audiobookShelfLibraries,
        authToken,
      }),
    });
  } catch (error) {
    throw new Error("Could not contact PHP proxy.", { cause: error });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(genericError);
    err.status = response.status;
    err.details = text;
    throw err;
  }

  let responseData;
  try {
    responseData = await response.json();
  } catch (error) {
    throw new Error("Unexpected response from PHP proxy (not JSON).", { cause: error });
  }

  // Optional: standardize on a success marker if your PHP returns it
  if (responseData?.status && responseData.status !== "success") {
    const err = new Error(responseData.message || genericError);
    err.details = responseData;
    throw err;
  }

  return responseData;
}

/**
 * Authenticates with the AudiobookShelf PHP backend using user credentials,
 * and retrieves the initial list of series and books.
 * - Uses fetchWithDiagnosis to detect unreachable URL or likely CORS only on the JS path.
 *
 * @param {Object} formData - An object with:
 *   @property {string} serverUrl - The AudiobookShelf server URL.
 *   @property {string} username - The user's login name.
 *   @property {string} password - The user's password.
 *   @property {boolean} usePhpProxy - Checkbox status of use PHP Proxy toggle
 *
 * @returns {Promise<Object>} Server response object (e.g., { status, authToken, librariesList })
 *
 * @throws {Error} - If the login request fails (e.g., incorrect credentials or network error).
 */
export async function fetchAudiobookShelfLibraries(formData) {
  const {
    serverUrl,
    username,
    password,
    apiKey = null,
    useApiKey = false,
    usePhpProxy = false,
  } = formData || {};

  // normalise once, don’t mutate inputs
  const normalisedServerUrl = sanitiseAudiobookShelfURL(serverUrl);

  // ───────────────────────────────────────────────────────────────────────────
  // A) Direct JS path: run BOTH JS fetch calls (diagnosis, then real call)
  // ───────────────────────────────────────────────────────────────────────────
  if (!usePhpProxy) {
    try {
      // Probe the login endpoint
      await fetchWithDiagnosis(`${normalisedServerUrl}/login`);
    } catch (error) {
      // Preserve root cause while shaping the message
      throw new Error(error?.message || "Error contacting AudiobookShelf server.", {
        cause: error,
      });
    }

    try {
      // Real login + libraries fetch
      return await fetchAudiobookShelfLibrariesCall({
        serverUrl: normalisedServerUrl,
        username,
        password,
        apiKey,
        useApiKey,
      });
    } catch (error) {
      throw new Error(error?.message || "Error retrieving libraries from AudiobookShelf server.", {
        cause: error,
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B) PHP proxy path
  // ───────────────────────────────────────────────────────────────────────────
  let response;

  try {
    response = await fetch("php/getLibraries.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: normalisedServerUrl,
        username,
        password,
        apiKey,
        useApiKey,
      }),
    });
  } catch (error) {
    // Network error reaching the proxy
    throw new Error("Could not contact PHP proxy.", { cause: error });
  }

  if (!response.ok) {
    // Server reached, but proxy returned non-2xx
    const text = await response.text().catch(() => "");
    const err = new Error(
      "Login failed via PHP proxy. Please check your credentials and try again."
    );
    err.details = text;
    throw err;
  }

  let responseData;

  try {
    responseData = await response.json();
  } catch (error) {
    // Proxy responded with non-JSON (e.g., HTML error page)
    throw new Error("Unexpected response from PHP proxy (not JSON).", { cause: error });
  }

  // Proxy convention for transport-level failure
  if (responseData.responseCode === 0) {
    const urlErrorElement = globalThis?.document?.getElementById?.("urlError") ?? null;

    if (urlErrorElement && isInternalAudiobookShelfURL(normalisedServerUrl)) {
      urlErrorElement.textContent =
        "Server IP is an internal address. Ensure it is accessible from this site.";
      urlErrorElement.hidden = false; // in case the element is initially hidden
      urlErrorElement.setAttribute("role", "alert"); // announce the change to screen readers
      urlErrorElement.setAttribute("aria-live", "polite");
      urlErrorElement.classList?.add("error");
    }

    throw new Error(
      responseData.message || "No response from the AudiobookShelf server via proxy."
    );
  }

  return responseData;
}

/**
 * Retrieves metadata for a specific Audible item (book or series) directly from audimeta.de.
 *
 * @param {string} itemASIN - The Audible ASIN identifier
 * @param {string} region - Audible region code (e.g., "uk", "us", "de")
 * @param {string} itemType - Either "book" or "series"
 * @returns {Promise<Object>} - Metadata response from audimeta.de
 * @throws {Error} - If the request fails or response is invalid
 */
export async function fetchAudibleMetadata(itemASIN, region, itemType) {
  try {
    return await fetchAudimetaMetadata({
      asin: itemASIN,
      // eslint-disable-next-line object-shorthand
      region: region,
      type: itemType,
    });
  } catch (error) {
    throw new Error(`Failed to fetch metadata for ASIN ${itemASIN}: ${error.message}`);
  }
}

/**
 * Searches localStorage for a specific item in a stored array by matching a key-value pair.
 *
 * @param {string} key - The object key to match (e.g., 'asin').
 * @param {any} value - The value to search for.
 * @param {string} storeIdentifier - The key used in localStorage to retrieve the array.
 * @returns {Object|null} The matched item object if found, otherwise null.
 */
export function findFromStorage(key, value, storeIdentifier) {
  // Load stored metadata array from localStorage
  const existingFirstBookASINsArray = loadMetadataFromLocalStorage(storeIdentifier);

  // Validate that the result is a proper array
  if (!existingFirstBookASINsArray || !Array.isArray(existingFirstBookASINsArray)) return null;

  // Attempt to find the first object where the specified key matches the given value
  const matchingItem = existingFirstBookASINsArray.find(
    (item) => key in item && item[key] === value
  );

  // Return the found item or null if no match
  return matchingItem || null;
}
