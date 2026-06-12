import { LOGIN_DETAILS_ERROR_MESSAGE } from "./audiobookshelfMessages";
import type { AudiobookshelfRequestContext } from "./audiobookshelfTypes";

const MAX_RESPONSE_DETAIL_LENGTH = 320;

/**
 * Purpose: Convert an Audiobookshelf HTTP failure into a message that points at
 * the likely user action.
 *
 * @param response - Failed HTTP response returned by Audiobookshelf or a proxy.
 * @param context - Request type that failed.
 * @returns An Error with a context-specific message.
 */
export async function buildHttpStatusError(
  response: Response,
  context: AudiobookshelfRequestContext
): Promise<Error> {
  const statusLabel = describeStatus(response);
  const responseDetail = formatResponseDetail(await readResponseSnippet(response));

  if (context === "login" && (response.status === 401 || response.status === 403)) {
    return new Error(LOGIN_DETAILS_ERROR_MESSAGE);
  }

  if (response.status === 401 || response.status === 403) {
    return new Error(
      `Audiobookshelf rejected the API key or session token while ${describeRequestAction(
        context
      )} (${statusLabel}). If you are using an API key, check it is copied correctly and has not been revoked. If you logged in with username/password, log in again because the follow-up API request was not authorised.${responseDetail}`
    );
  }

  if (response.status === 400) {
    return new Error(
      `Audiobookshelf rejected the request while ${describeRequestAction(
        context
      )} (${statusLabel}). Check the server URL, login method, and any reverse proxy that forwards requests to Audiobookshelf.${responseDetail}`
    );
  }

  if (response.status === 404) {
    return new Error(
      `${describeMissingEndpoint(context)} (${statusLabel}). Check that the Audiobookshelf URL is the server root, not a library page or API endpoint, and make sure any reverse proxy routes this endpoint to Audiobookshelf.${responseDetail}`
    );
  }

  if (response.status === 429) {
    return new Error(
      `Audiobookshelf or the reverse proxy rate-limited the request while ${describeRequestAction(
        context
      )} (${statusLabel}). Wait a moment and try again, or check proxy rate-limit settings.${responseDetail}`
    );
  }

  if (response.status >= 500) {
    return new Error(
      `Audiobookshelf or the reverse proxy returned a server error while ${describeRequestAction(
        context
      )} (${statusLabel}). Try again, then check the Audiobookshelf and proxy logs if it repeats.${responseDetail}`
    );
  }

  if (response.status === 0) {
    return new Error(
      `The browser returned an unreadable response while ${describeRequestAction(
        context
      )}. This can happen when a request is blocked by browser origin rules or redirected across origins.`
    );
  }

  return new Error(
    `Audiobookshelf returned an unexpected response while ${describeRequestAction(
      context
    )} (${statusLabel}).${responseDetail}`
  );
}

/**
 * Purpose: Parse an Audiobookshelf JSON response and report wrong-service or
 * proxy HTML responses clearly.
 *
 * @param response - Successful HTTP response expected to contain JSON.
 * @param context - Request type that produced the response.
 * @returns Parsed JSON typed by the caller.
 */
export async function readAudiobookshelfJson<T>(
  response: Response,
  context: AudiobookshelfRequestContext
): Promise<T> {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(
      `Audiobookshelf returned an empty response while ${describeRequestAction(
        context
      )}. Check that the URL points to Audiobookshelf and that any reverse proxy is not stripping the response body.`
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    const contentType = response.headers.get("Content-Type") ?? "unknown content type";
    const responseDetail = formatResponseDetail(summariseResponseText(responseText));

    throw new Error(
      `Audiobookshelf returned a response that was not JSON while ${describeRequestAction(
        context
      )}. This usually means the URL points at the wrong service, a reverse proxy returned an HTML page, or Audiobookshelf is unavailable. Response type: ${contentType}.${responseDetail}`
    );
  }
}

/**
 * Purpose: Produce a concise label for an HTTP status code and text.
 *
 * @param response - Fetch response with status data.
 * @returns A label such as `HTTP 401 Unauthorized`.
 */
function describeStatus(response: Response): string {
  const statusText = response.statusText.trim();
  return `HTTP ${response.status}${statusText ? ` ${statusText}` : ""}`;
}

/**
 * Purpose: Describe the action that was underway when a request failed.
 *
 * @param context - Audiobookshelf request type.
 * @returns A human-readable action phrase.
 */
function describeRequestAction(context: AudiobookshelfRequestContext): string {
  switch (context) {
    case "books":
      return "loading Audiobookshelf books";
    case "libraries":
      return "loading Audiobookshelf libraries";
    case "login":
      return "logging in to Audiobookshelf";
    case "series":
      return "loading Audiobookshelf series";
  }
}

/**
 * Purpose: Explain which Audiobookshelf endpoint appears to be missing.
 *
 * @param context - Audiobookshelf request type.
 * @returns A sentence fragment for HTTP 404 diagnostics.
 */
function describeMissingEndpoint(context: AudiobookshelfRequestContext): string {
  switch (context) {
    case "books":
      return "Complete Series reached the server, but the Audiobookshelf books endpoint was not found";
    case "libraries":
      return "Complete Series reached the server, but the Audiobookshelf libraries endpoint was not found";
    case "login":
      return "Complete Series reached the server, but the Audiobookshelf login endpoint was not found";
    case "series":
      return "Complete Series reached the server, but the Audiobookshelf series endpoint was not found";
  }
}

/**
 * Purpose: Read a small response-body sample for HTTP error diagnostics.
 *
 * @param response - Response whose body may contain an error message.
 * @returns A trimmed body sample, or an empty string when unavailable.
 */
async function readResponseSnippet(response: Response): Promise<string> {
  try {
    return summariseResponseText(await response.clone().text());
  } catch {
    return "";
  }
}

/**
 * Purpose: Normalise a response body into a short single-line diagnostic.
 *
 * @param responseText - Raw response body text.
 * @returns A trimmed snippet capped to the configured maximum length.
 */
function summariseResponseText(responseText: string): string {
  const singleLineText = responseText.replace(/\s+/g, " ").trim();
  if (!singleLineText) return "";

  return singleLineText.length > MAX_RESPONSE_DETAIL_LENGTH
    ? `${singleLineText.slice(0, MAX_RESPONSE_DETAIL_LENGTH)}...`
    : singleLineText;
}

/**
 * Purpose: Attach an optional response-body sample to an error sentence.
 *
 * @param responseDetail - Short response body text, if available.
 * @returns A formatted response detail sentence or an empty string.
 */
function formatResponseDetail(responseDetail: string): string {
  return responseDetail ? ` Response: ${responseDetail}` : "";
}
