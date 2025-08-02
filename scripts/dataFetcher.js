// dataFetcher.js
import { fetchAudimetaMetadata } from './fetchAudimetaMetadata.js';
import { sanitiseAudiobookShelfURL, isInternalAudiobookShelfURL } from "./dataCleaner.js";
import { loadMetadataFromLocalStorage } from './localStorage.js';

/**
 * Authenticates with the AudiobookShelf PHP backend using user credentials,
 * and retrieves the initial list of series and books.
 *
 * @param {Object} credentials - An object with:
 *   @property {string} serverUrl - The AudiobookShelf server URL.
 * @param {Object} audiobookShelfLoginResponse - The response object from the AudiobookShelf login,
 *   which contains the authentication token and libraries list.
 *   @property {string} audiobookShelfLoginResponse.authToken - The authentication token.
 *   @property {Array} audiobookShelfLoginResponse.librariesList - List of libraries available
 * @returns {Promise<Object>} - Parsed JSON response from the server,
 * containing authentication token and library data.
 *
 * @throws {Error} - If the login request fails (e.g., incorrect credentials or network error).
 */
export async function fetchExistingContent(credentials, audiobookShelfLoginResponse) {
  // Ensure the server URL is well-formed
  credentials.serverUrl = sanitiseAudiobookShelfURL(credentials.serverUrl);
  const audiobookShelfLibraries = audiobookShelfLoginResponse.librariesList;
  const authToken = audiobookShelfLoginResponse.authToken;
  // Send credentials to the backend login handler
  const response = await fetch("php/existingSeriesFetcher.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: credentials.serverUrl,
      libraries: audiobookShelfLibraries,
      authToken: authToken
    }),
  });

  // Throw an error if the login attempt failed
  if (!response.ok) {
    throw new Error("Failed to get existing content from AudiobookShelf.");
  }

  // Parse the response as a JavaScript object to check for handled errors
  const responseData = await response.json();

  // Return the parsed response as a JavaScript object
  return responseData;
}

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
export async function fetchAudiobookShelfLibraries(credentials) {
  // Ensure the server URL is well-formed
  credentials.serverUrl = sanitiseAudiobookShelfURL(credentials.serverUrl);

  // Send credentials to the backend login handler
  const response = await fetch("php/getLibraries.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: credentials.serverUrl,
      username: credentials.username,
      password: credentials.password
    }),
  });

  // Throw an error if the login attempt failed
  if (!response.ok) {
    throw new Error("Login failed. Please check your credentials and try again.");
  }

  // Parse the response as a JavaScript object to check for handled errors
  const responseData = await response.json();
  // Check if there was no response to the AudiobookShelf server login request (likely an invalid URL)
  if (responseData.responseCode === 0) {
    if (isInternalAudiobookShelfURL(credentials.serverUrl)) {
      document.getElementById("urlError").textContent = "Server IP is an internal address. Ensure it is accessbile from this site";
    }
    throw new Error(responseData.message || "No response from the AudiobookShelf server. Please check the URL and try again.");
  }
  
  // Return the parsed response as a JavaScript object
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
      region: region,
      type: itemType
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
  if (!existingFirstBookASINsArray || !Array.isArray(existingFirstBookASINsArray)) {
    return null;
  }

  // Attempt to find the first object where the specified key matches the given value
  const matchingItem = existingFirstBookASINsArray.find(item => key in item && item[key] === value);

  // Return the found item or null if no match
  return matchingItem || null;
}