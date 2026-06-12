import { LOGIN_DETAILS_ERROR_MESSAGE } from "./audiobookshelfMessages";
import type { AudiobookshelfRequestContext } from "./audiobookshelfTypes";
import { normaliseServerUrl } from "./audiobookshelfUrl";

const FETCH_DIAGNOSTIC_TIMEOUT_MS = 2500;

/**
 * Purpose: Diagnose a rejected browser fetch, where the response is hidden from
 * JavaScript and the browser often reports only "Load failed".
 *
 * @param error - Original fetch rejection reason.
 * @param baseUrl - User-entered Audiobookshelf server root.
 * @param context - Request type that failed.
 * @returns An Error explaining the most likely connection problem.
 */
export async function buildFetchFailureError(
  error: unknown,
  baseUrl: string,
  context: AudiobookshelfRequestContext
): Promise<Error> {
  const browserMessage = formatBrowserError(error);

  if (isMixedContentRequest(baseUrl)) {
    return new Error(
      `The browser blocked the request while ${describeRequestAction(
        context
      )} because Complete Series is running over HTTPS but the Audiobookshelf URL uses HTTP. Use an HTTPS Audiobookshelf URL, or open Complete Series over HTTP.${browserMessage}`
    );
  }

  const serverLooksReachable = await canReachServerWithoutCors(baseUrl);
  if (serverLooksReachable) {
    if (context === "login") {
      return new Error(LOGIN_DETAILS_ERROR_MESSAGE);
    }

    const origin = getAppOrigin();
    const originLabel = origin ? ` (${origin})` : "";

    return new Error(
      `Complete Series reached Audiobookshelf, but the browser did not provide a readable response while ${describeRequestAction(
        context
      )}. The server is reachable, so the URL is probably close, but the readable API response did not reach the app. Note: Audiobookshelf also needs this application's origin${originLabel} in its allowed origins list. If you use a reverse proxy, make sure OPTIONS requests are handled and the Authorization and Content-Type headers are allowed.${browserMessage}`
    );
  }

  return new Error(
    `Complete Series could not connect to Audiobookshelf at ${describeServer(
      baseUrl
    )} while ${describeRequestAction(
      context
    )}. Check the server URL, that Audiobookshelf is running, VPN/DNS/firewall access, reverse proxy routing, and whether the browser trusts the HTTPS certificate.${browserMessage}`
  );
}

/**
 * Purpose: Probe whether the browser can reach the Audiobookshelf origin even
 * when browser origin rules prevent JavaScript from reading the normal API
 * response.
 *
 * @param baseUrl - User-entered Audiobookshelf server root.
 * @returns `true` when a no-CORS request resolves before the timeout.
 */
async function canReachServerWithoutCors(baseUrl: string): Promise<boolean> {
  let serverUrl: string;

  try {
    serverUrl = new URL(normaliseServerUrl(baseUrl)).toString();
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), FETCH_DIAGNOSTIC_TIMEOUT_MS);

  try {
    await fetch(serverUrl, {
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

/**
 * Purpose: Detect requests that browsers block because the app is served over
 * HTTPS while Audiobookshelf is configured as HTTP.
 *
 * @param baseUrl - User-entered Audiobookshelf server root.
 * @returns `true` when the current page is HTTPS and the target is HTTP.
 */
function isMixedContentRequest(baseUrl: string): boolean {
  const appProtocol = getAppProtocol();
  if (appProtocol !== "https:") return false;

  try {
    return new URL(normaliseServerUrl(baseUrl)).protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Purpose: Read the current browser origin for allowed-origin instructions.
 *
 * @returns The app origin, or `null` outside a browser-like environment.
 */
function getAppOrigin(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.origin || null;
}

/**
 * Purpose: Read the current browser protocol for mixed-content checks.
 *
 * @returns The app protocol, or `null` outside a browser-like environment.
 */
function getAppProtocol(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.protocol || null;
}

/**
 * Purpose: Extract a readable message from a browser fetch rejection.
 *
 * @param error - Original fetch rejection reason.
 * @returns A sentence containing the browser message when one is available.
 */
function formatBrowserError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const trimmedMessage = rawMessage.trim();

  return trimmedMessage ? ` Browser said: ${trimmedMessage}.` : "";
}

/**
 * Purpose: Display the configured server URL in connection diagnostics without
 * throwing when it is malformed.
 *
 * @param baseUrl - User-entered Audiobookshelf server root.
 * @returns A normalised URL when possible, otherwise the original value.
 */
function describeServer(baseUrl: string): string {
  try {
    return new URL(normaliseServerUrl(baseUrl)).toString();
  } catch {
    return baseUrl.trim() || "the configured server URL";
  }
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
