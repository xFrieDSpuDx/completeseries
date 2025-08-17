/**
 * Authenticate with an Audiobookshelf server and return ONLY the libraries
 * whose mediaType is "book".
 *
 * This mirrors the original PHP flow:
 *   1) Validate inputs
 *   2) POST /login  -> get user token + default library id
 *   3) GET  /api/libraries with Authorization: Bearer <token>
 *   4) Filter libraries to mediaType === "book"
 *   5) Return { status: "success", authToken, librariesList }
 *
 * @typedef {Object} FetchAudiobookshelfLibrariesParams
 * @property {string} serverUrl     Base URL of the Audiobookshelf server (e.g. "https://abs.example.com")
 * @property {string} username      Account username
 * @property {string} password      Account password
 * @property {number} [timeoutMs=5000]  Milliseconds before aborting each network call
 *
 * @typedef {Object} FetchAudiobookshelfLibrariesResult
 * @property {"success"} status
 * @property {string} authToken
 * @property {Array} librariesList
 *
 * @param {FetchAudiobookshelfLibrariesParams} params
 * @returns {Promise<FetchAudiobookshelfLibrariesResult>}
 * @throws {Error} normalised errors with optional fields:
 *                 - err.kind: "validation" | "http" | "bad-json" | "missing-fields" | "bad-structure"
 *                 - err.httpStatus: number (when available)
 *                 - err.details or err.bodyText: response body text (when available)
 *                 (Network/CORS/URL errors are NOT handled here and will bubble up.)
 */
export async function fetchAudiobookShelfLibrariesCall({
  serverUrl,
  username,
  password,
  timeoutMs = 5000
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: Validate and normalise inputs (presence only; format is handled upstream)
  // ─────────────────────────────────────────────────────────────────────────────
  const normalisedServerUrl =
    typeof serverUrl === "string" ? serverUrl.trim().replace(/\/+$/, "") : "";
  const normalisedUsername = typeof username === "string" ? username.trim() : "";
  const normalisedPassword = typeof password === "string" ? password.trim() : "";

  if (!normalisedServerUrl || !normalisedUsername || !normalisedPassword) {
    const validationError = new Error(
      "Missing required fields: url, username, or password"
    );
    validationError.httpStatus = 400;
    validationError.kind = "validation";
    throw validationError;
  }

  // Helper: create an AbortController that auto-aborts after `ms` milliseconds.
  function createAbortControllerWithTimeout(ms) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), ms);
    return {
      signal: abortController.signal,
      cancelTimeout: () => clearTimeout(timeoutId)
    };
  }

  // Helper: parse JSON safely; if parsing fails, attach the raw text for diagnostics.
  async function parseJsonFromResponseOrThrow(httpResponse) {
    try {
      return await httpResponse.json();
    } catch {
      const responseText = await httpResponse.text().catch(() => "");
      const parseError = new Error("Invalid JSON in response");
      parseError.bodyText = responseText;
      parseError.httpStatus = httpResponse.status;
      parseError.kind = "bad-json";
      throw parseError;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2: Authenticate (POST /login) — network errors bubble up; we only check HTTP + JSON
  // ─────────────────────────────────────────────────────────────────────────────
  const loginAbort = createAbortControllerWithTimeout(timeoutMs);
  let loginHttpResponse;
  try {
    const loginUrl = `${normalisedServerUrl}/login`;
    const loginRequestBody = {
      username: normalisedUsername,
      password: normalisedPassword
    };

    loginHttpResponse = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginRequestBody),
      signal: loginAbort.signal
    });
  } finally {
    loginAbort.cancelTimeout(); // ensure cleanup even if fetch rejects
  }

  if (!loginHttpResponse.ok) {
    const responseBodyText = await loginHttpResponse.text().catch(() => "");
    const httpError = new Error("Login failed. Please check your credentials and try again.");
    httpError.httpStatus = loginHttpResponse.status;
    httpError.details = responseBodyText;
    httpError.kind = "http";
    throw httpError;
  }

  const loginResponseJson = await parseJsonFromResponseOrThrow(loginHttpResponse);
  const defaultLibraryId = loginResponseJson?.userDefaultLibraryId ?? null;
  const bearerToken = loginResponseJson?.user?.token ?? null;

  if (!defaultLibraryId || !bearerToken) {
    const missingFieldsError = new Error("Missing library ID or token in login response");
    missingFieldsError.httpStatus = 500;
    missingFieldsError.kind = "missing-fields";
    throw missingFieldsError;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 3: Fetch libraries (GET /api/libraries with Bearer token)
  //         Network errors bubble up; we only check HTTP + JSON
  // ─────────────────────────────────────────────────────────────────────────────
  const librariesAbort = createAbortControllerWithTimeout(timeoutMs);
  let librariesHttpResponse;
  try {
    const librariesUrl = `${normalisedServerUrl}/api/libraries`;

    librariesHttpResponse = await fetch(librariesUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: librariesAbort.signal
    });
  } finally {
    librariesAbort.cancelTimeout();
  }

  if (!librariesHttpResponse.ok) {
    const responseBodyText = await librariesHttpResponse.text().catch(() => "");
    const httpError = new Error("Failed to fetch libraries");
    httpError.httpStatus = librariesHttpResponse.status;
    httpError.details = responseBodyText;
    httpError.kind = "http";
    throw httpError;
  }

  const librariesResponseJson =
    await parseJsonFromResponseOrThrow(librariesHttpResponse);

  // We expect a top-level object with a "libraries" array
  const allLibrariesList = Array.isArray(librariesResponseJson?.libraries)
    ? librariesResponseJson.libraries
    : null;

  if (!allLibrariesList) {
    const structureError = new Error("Invalid JSON structure in libraries response");
    structureError.httpStatus = 500;
    structureError.kind = "bad-structure";
    throw structureError;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 4: Keep only audiobook libraries (mediaType === "book")
  // ─────────────────────────────────────────────────────────────────────────────
  const bookLibrariesOnly = allLibrariesList.filter(
    (library) => library && library.mediaType === "book"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 5: Return the structured result
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    status: "success",
    authToken: bearerToken,
    librariesList: bookLibrariesOnly
  };
}
