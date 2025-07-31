/**
 * Stores a unique metadata string (e.g., ASIN) to localStorage under a given key.
 * Prevents duplicates from being stored.
 *
 * @param {string} metadata - The string to store (e.g., an ASIN).
 * @param {string} storeIdentifier - The localStorage key under which data is stored.
 */
export function storeMetadataToLocalStorage(metadata, storeIdentifier) {
  // 1. Read existing values from localStorage
  const existingData = localStorage.getItem(storeIdentifier);

  // 2. Parse existing data or initialize an empty array
  let updatedDataArray = existingData ? JSON.parse(existingData) : [];

  // 3. Avoid duplicates
  if (!updatedDataArray.includes(metadata)) {
    updatedDataArray.push(metadata);
  }

  // 4. Save the updated array back to localStorage
  localStorage.setItem(storeIdentifier, JSON.stringify(updatedDataArray));
}

/**
 * Loads metadata array from localStorage for a given key.
 *
 * @param {string} storeIdentifier - The key used to retrieve stored values.
 * @returns {Array} - An array of stored metadata strings.
 */
export function loadMetadataFromLocalStorage(storeIdentifier) {
  const existingData = localStorage.getItem(storeIdentifier);
  return existingData ? JSON.parse(existingData) : [];
}

/**
 * Deletes a single localStorage key that matches the given identifier.
 *
 * @param {string} storeIdentifier - The exact key to remove.
 */
export function clearLocalStorageByIdentifier(storeIdentifier) {
  localStorage.removeItem(storeIdentifier);
}

/**
 * Clears all keys and values from localStorage.
 * Use with caution.
 */
export function clearLocalStorage() {
  localStorage.clear();
}