import { buildFetchFailureError } from "./audiobookshelfBrowserDiagnostics";
import type { AudiobookshelfRequestContext } from "./audiobookshelfTypes";

export {
  buildHttpStatusError,
  readAudiobookshelfJson,
} from "./audiobookshelfDiagnostics";
export { buildAudiobookshelfUrl } from "./audiobookshelfUrl";

/**
 * Purpose: Run an Audiobookshelf fetch and replace browser-level network
 * failures with connection, allowed-origin, or mixed-content diagnostics.
 *
 * @param url - Fully resolved Audiobookshelf endpoint URL.
 * @param init - Fetch options, including method, headers, and body.
 * @param baseUrl - User-entered server root used for reachability checks.
 * @param context - Request type being made, used to tailor the message.
 * @returns The raw fetch response when the browser allows the request.
 */
export async function fetchAudiobookshelfResponse(
  url: URL,
  init: RequestInit,
  baseUrl: string,
  context: AudiobookshelfRequestContext
): Promise<Response> {
  try {
    return await fetch(url.toString(), init);
  } catch (error) {
    throw await buildFetchFailureError(error, baseUrl, context);
  }
}
