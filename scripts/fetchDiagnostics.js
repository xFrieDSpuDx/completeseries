/**
 * Try a cross-origin request and diagnose why it failed — caller only passes the URL.
 * Throws on error so the caller can handle it in a try/catch.
 *
 * Success:
 *   → returns { outcome: "ok", response }
 *
 * Errors (thrown):
 *   → Error(kind: "http", status)                   Server responded non-2xx
 *   → Error(kind: "likely-cors")                    Origin reachable, request still failed → likely CORS
 *   → Error(kind: "likely-unreachable")             Couldn’t reach origin at all (DNS/TLS/network/ad-block)
 */
export async function fetchWithDiagnosis(targetUrl) {
  // Validate URL and compute the origin we’ll probe later
  let targetOrigin;
  try {
    const base =
      typeof location !== "undefined" && location.href ? location.href : "http://localhost";
    targetOrigin = new URL(targetUrl, base).origin;
  } catch {
    const err = new Error("Invalid URL.");
    err.kind = "validation";
    throw err;
  }

  // Default request options (simple CORS GET, no cache, no credentials)
  const requestOptions = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
    redirect: "follow",
  };

  // Abort after a reasonable timeout
  const TIMEOUT_MS = 5000;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    // Primary attempt
    const response = await fetch(targetUrl, { ...requestOptions, signal: abortController.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = new Error(response.statusText || "HTTP error");
      err.kind = "http";
      err.status = response.status;
      throw err;
    }

    return { outcome: "ok", response };
  } catch {
    clearTimeout(timeoutId);

    // Reachability probe: can we hit the ORIGIN at all?
    let originReachable = false;
    try {
      await fetch(`${targetOrigin}/?cors_probe=${Date.now()}`, {
        mode: "no-cors", // succeeds with opaque if origin is reachable
        cache: "no-store",
        credentials: "omit",
        redirect: "follow",
      });
      originReachable = true;
    } catch {
      originReachable = false;
    }

    if (originReachable) {
      const err = new Error(
        "Probably blocked by CORS. Check Allowed Origins on the AudiobookShelf (e.g. https://completeseries.lily-pad.uk) server or enable the PHP proxy in the advanced section below."
      );
      err.kind = "likely-cors";
      throw err; // IMPORTANT: not inside the probe try/catch
    } else {
      const err = new Error(
        "Unable to contact AudiobookShelf. Please check the URL and try again."
      );
      err.kind = "likely-unreachable";
      throw err;
    }
  }
}
