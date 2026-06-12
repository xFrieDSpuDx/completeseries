/**
 * Purpose: Build an Audiobookshelf endpoint URL from the user-entered server
 * root while preserving reverse-proxy subpaths.
 *
 * @param baseUrl - User-entered Audiobookshelf server root.
 * @param path - API path to append to the server root.
 * @returns A URL object ready to fetch.
 */
export function buildAudiobookshelfUrl(baseUrl: string, path: string): URL {
  const endpointPath = path.startsWith("/") ? path : `/${path}`;

  try {
    return new URL(`${normaliseServerUrl(baseUrl)}${endpointPath}`);
  } catch {
    throw new Error(
      "Audiobookshelf server URL is not valid. Enter the server root, for example https://audiobooks.example.com, and do not include a library page or API endpoint."
    );
  }
}

/**
 * Purpose: Clean up user-entered Audiobookshelf URLs before making requests.
 *
 * @param serverUrl - User-entered server URL, with or without a protocol and
 * with or without trailing slashes.
 * @returns A URL string with a protocol and no trailing slash.
 */
export function normaliseServerUrl(serverUrl: string): string {
  const trimmedUrl = serverUrl.trim();
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;
  return withProtocol.replace(/\/+$/, "");
}
