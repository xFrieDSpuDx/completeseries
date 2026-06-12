import {
  fetchAudiobookshelfLibraries,
  resolveAuthToken,
  type AudiobookshelfAuthConfig,
  type AudiobookshelfLibrary,
} from "../../integrations/audiobookshelf/audiobookshelfClient";

export type ScanConnectionOptions = AudiobookshelfAuthConfig & {
  serverUrl: string;
};

export type AuthenticatedScanSession = {
  serverUrl: string;
  apiKey: string;
  libraries: AudiobookshelfLibrary[];
};

export type AuthenticatedAudiobookshelfClientConfig = {
  baseUrl: string;
  mode: "apiKey";
  apiKey: string;
};

/**
 * Purpose: Authenticate with Audiobookshelf once and load the available
 * audiobook libraries so later re-scans can reuse the resolved token.
 *
 * @param options - Audiobookshelf server URL and login details.
 * @param progress - Optional callback that receives short status messages while
 * authentication and library loading run.
 * @returns A reusable scan session containing a bearer-token-compatible API key
 * value and the user's audiobook libraries.
 */
export async function createScanSession(
  options: ScanConnectionOptions,
  progress?: (message: string) => void
): Promise<AuthenticatedScanSession> {
  progress?.("Authenticating with Audiobookshelf...");
  const authenticatedConfig = await buildAuthenticatedConfig(options);

  progress?.("Fetching Audiobookshelf libraries...");
  const libraries = await fetchAudiobookshelfLibraries(authenticatedConfig);

  if (libraries.length === 0) throw new Error("No audiobook libraries were found.");

  return {
    serverUrl: options.serverUrl,
    apiKey: authenticatedConfig.apiKey,
    libraries,
  };
}

/**
 * Purpose: Fetch selectable Audiobookshelf libraries for setup before a full
 * metadata scan starts.
 *
 * @param options - Audiobookshelf server URL and login details.
 * @returns Audiobookshelf audiobook libraries available to the authenticated
 * user.
 */
export async function loadSelectableLibraries(
  options: ScanConnectionOptions
): Promise<AudiobookshelfLibrary[]> {
  const session = await createScanSession(options);
  return session.libraries;
}

/**
 * Purpose: Resolve the selected login method into an authenticated
 * Audiobookshelf client configuration.
 *
 * @param options - Audiobookshelf server URL and either API key or
 * username/password credentials.
 * @returns Client configuration using a bearer token-compatible API key value.
 */
export async function buildAuthenticatedConfig(
  options: ScanConnectionOptions
): Promise<AuthenticatedAudiobookshelfClientConfig> {
  const authToken = await resolveAuthToken({
    baseUrl: options.serverUrl,
    ...(options.mode === "apiKey"
      ? { mode: "apiKey" as const, apiKey: options.apiKey }
      : { mode: "password" as const, username: options.username, password: options.password }),
  });

  return {
    baseUrl: options.serverUrl,
    mode: "apiKey",
    apiKey: authToken,
  };
}

/**
 * Purpose: Apply the user's optional library selection to the available
 * Audiobookshelf libraries.
 *
 * @param libraries - Libraries returned by Audiobookshelf.
 * @param selectedLibraryIds - Optional list of library ids selected in the UI.
 * @returns Either all libraries or the selected subset.
 */
export function filterSelectedLibraries<T extends { id: string }>(
  libraries: T[],
  selectedLibraryIds: string[] | undefined
): T[] {
  if (!selectedLibraryIds || selectedLibraryIds.length === 0) return libraries;

  const selectedIds = new Set(selectedLibraryIds);
  return libraries.filter((library) => selectedIds.has(library.id));
}
