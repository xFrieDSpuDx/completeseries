/**
 * existingSeriesFetcher.js
 *
 * Fetch all series for the given libraries using an existing AudiobookShelf token,
 * paginate through results, and produce:
 *  - seriesFirstASIN: [{ series, title, asin }]
 *  - seriesAllASIN:   [{ series, title, asin, subtitle, seriesPosition, seriesPositionNumber }]
 *
 * Mirrors the PHP behavior with a per-library pagination loop.
 *
 * @param {Object} params
 * @param {string} params.serverUrl               Base AudiobookShelf URL
 * @param {string} params.authToken               Bearer token from prior login
 * @param {Array<{id:string}>} params.libraries   Libraries to scan (must include `id`)
 * @param {number} [params.limit=100]             Page size
 *
 * @returns {Promise<{status:"success", seriesFirstASIN:Array, seriesAllASIN:Array}>}
 * @throws {Error} on network/HTTP/JSON errors (with details where possible)
 */
export async function fetchExistingSeriesLibraries({
  serverUrl,
  authToken,
  libraries,
  limit = 100
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: Validate and normalise inputs (presence only; format is handled upstream)
  // ─────────────────────────────────────────────────────────────────────────────
  const normalisedServerUrl =
    typeof serverUrl === "string" ? serverUrl.trim().replace(/\/+$/, "") : "";

  if (!normalisedServerUrl || !authToken || !Array.isArray(libraries) || libraries.length === 0) {
    const error = new Error("Missing required fields: url, authentication token, or libraries list");
    error.httpStatus = 400;
    error.kind = "validation";
    throw error;
  }

  // Helper: parse JSON safely and attach diagnostic info on failure
  async function parseJsonOrThrow(response) {
    try {
      return await response.json();
    } catch (cause) {
      const bodyText = await response.text().catch(() => "");
      const parseError = new Error("Invalid JSON in response", { cause });
      parseError.httpStatus = response.status;
      parseError.details = bodyText;
      parseError.kind = "bad-json";
      throw parseError;
    }
  }

  // Helper: build series URL safely
  function buildSeriesUrl(base, libraryId, { limit, page }) {
    const url = new URL(`${base}/api/libraries/${encodeURIComponent(libraryId)}/series`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("page", String(page));
    return url.toString();
  }

  // Helper: parse "# <number>" into both a string and a sortable number
  function parseSeriesPosition(seriesNameFromMeta) {
    const name = seriesNameFromMeta ?? "Unknown Series";
    const hashIndex = name.indexOf("#");
    if (hashIndex === -1) 
      return { label: "N/A", number: null };
    
    const raw = String(name.slice(hashIndex + 1)).trim();
    const num = Number.parseFloat(raw.replace(/[^0-9.-]/g, "")); // tolerate "Book 1", "1.5", etc.
    return {
      label: raw || "N/A",
      number: Number.isFinite(num) ? num : null
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Step 2: Fetch library content
  // ────────────────────────────────────────────────────────────────────────────
  const seriesFirstASIN = [];
  const seriesAllASIN = [];

  for (const library of libraries) {
    const libraryId = library?.id;
    if (!libraryId) continue; // skip malformed entries

    let page = 0;
    let totalSeriesCount = null;       // from API "total"
    let fetchedCountThisLibrary = 0;   // number of series processed for this library

    // Paginate until we've processed all series for this library
    do {
      const seriesUrl = buildSeriesUrl(normalisedServerUrl, libraryId, { limit, page });

      let httpResponse;
      try {
        httpResponse = await fetch(seriesUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        });
      } catch (cause) {
        const error = new Error(`Failed to fetch series (page ${page}) from library ${libraryId}`, { cause });
        error.url = seriesUrl;
        error.libraryId = libraryId;
        throw error;
      }

      if (!httpResponse.ok) {
        const details = await httpResponse.text().catch(() => "");
        const httpError = new Error(`Failed to fetch series (page ${page}) from library ${libraryId}`);
        httpError.httpStatus = httpResponse.status;
        httpError.details = details;
        httpError.kind = "http";
        httpError.url = seriesUrl;
        httpError.libraryId = libraryId;
        throw httpError;
      }

      const seriesPayload = await parseJsonOrThrow(httpResponse);
      const results = Array.isArray(seriesPayload?.results) ? seriesPayload.results : [];

      // Initialize total on first page
      if (totalSeriesCount == null && Number.isFinite(seriesPayload?.total))
        totalSeriesCount = seriesPayload.total;

      // Map results to output structures
      for (const series of results) {
        const seriesName = series?.name ?? "Unknown Series";
        const books = Array.isArray(series?.books) ? series.books : [];

        // First-asin per series (use the first book if available)
        if (books.length > 0) {
          const firstMeta = books[0]?.media?.metadata ?? {};
          seriesFirstASIN.push({
            series: seriesName,
            title: firstMeta.title ?? "Unknown Title",
            asin: firstMeta.asin ?? "Unknown ASIN"
          });
        }

        // All ASIN entries for every book in the series
        for (const book of books) {
          const meta = book?.media?.metadata ?? {};
          const { label: seriesPosition, number: seriesPositionNumber } =
            parseSeriesPosition(meta.seriesName);

          seriesAllASIN.push({
            series: seriesName,
            title: meta.title ?? "Unknown Title",
            asin: meta.asin ?? "Unknown ASIN",
            subtitle: meta.subtitle ?? "No Subtitle",
            seriesPosition,           // original string form (e.g., "1", "1.5", "Book 1")
            seriesPositionNumber      // numeric when parseable, else null
          });
        }
      }

      fetchedCountThisLibrary += results.length;
      page += 1;

      // If API didn't provide a total, stop when we hit an empty page
      if (totalSeriesCount == null && results.length === 0) break;

    } while (fetchedCountThisLibrary < totalSeriesCount);
  }

  return {
    status: "success",
    seriesFirstASIN,
    seriesAllASIN
  };
}
