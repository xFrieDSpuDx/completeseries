/**
 * Metadata provider gateway.
 *
 * The app should call `fetchMetadataFromProvider` instead of depending on a
 * specific upstream service. Provider-specific URL shapes, response headers,
 * and error messages live here so the rest of the metadata flow can stay stable
 * when the upstream provider changes.
 */

const DEFAULT_METADATA_PROVIDER = "libex";

const metadataProviders = Object.freeze({
  libex: Object.freeze({
    id: "libex",
    displayName: "libex.lostcartographer.xyz",
    baseUrl: "https://libex.lostcartographer.xyz",
    fetchMetadata: fetchLibexMetadata,
  }),
});

/**
 * Fetch metadata for a book or series from the configured metadata provider.
 *
 * @param {Object} params
 * @param {string} [params.provider] - Provider identifier. Defaults to the current provider.
 * @param {"book"|"series"} [params.type="book"] - Metadata item type.
 * @param {string} params.asin - Audible ASIN for the book or series.
 * @param {string} [params.region="uk"] - Audible marketplace region code.
 * @returns {Promise<{metadataResponse:any,responseHeaders:Object,provider:string}>}
 */
export async function fetchMetadataFromProvider(params = {}) {
  const { provider = DEFAULT_METADATA_PROVIDER } = params;
  const selectedProvider = getMetadataProvider(provider);

  return selectedProvider.fetchMetadata(params);
}

/**
 * Resolve a provider by id.
 *
 * @param {string} providerName
 * @returns {{id:string,displayName:string,baseUrl:string,fetchMetadata:Function}}
 */
function getMetadataProvider(providerName) {
  const provider = metadataProviders[providerName];
  if (!provider) throw new Error(`Unknown metadata provider: ${providerName}`);
  return provider;
}

/**
 * Fetch metadata from the current short-term provider.
 *
 * @param {Object} params
 * @param {"book"|"series"} [params.type="book"]
 * @param {string} params.asin
 * @param {string} [params.region="uk"]
 * @returns {Promise<{metadataResponse:any,responseHeaders:Object,provider:string}>}
 */
async function fetchLibexMetadata(params) {
  const provider = metadataProviders.libex;
  const { type = "book", asin = "", region = "uk" } = params;

  if (!type || !asin || !region) throw new Error("Missing required fields: type, asin, or region.");
  if (type !== "book" && type !== "series")
    throw new Error(`Unsupported metadata type for ${provider.id}: ${type}`);

  const trimmedASIN = asin.trim();
  const regionCode = region.trim().toLowerCase();
  const apiUrl = buildLibexUrl({
    baseUrl: provider.baseUrl,
    type,
    asin: trimmedASIN,
    region: regionCode,
  });

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.displayName} request failed (${response.status}): ${errorText}`);
  }

  return {
    metadataResponse: await response.json(),
    responseHeaders: extractProviderResponseHeaders(response),
    provider: provider.id,
  };
}

/**
 * Build the current provider URL for book or series metadata.
 *
 * @param {Object} params
 * @param {string} params.baseUrl
 * @param {"book"|"series"} params.type
 * @param {string} params.asin
 * @param {string} params.region
 * @returns {string}
 */
function buildLibexUrl({ baseUrl, type, asin, region }) {
  return type === "book"
    ? `${baseUrl}/book/${asin}?cache=true&region=${region}`
    : `${baseUrl}/series/${asin}/books?region=${region}&cache=true`;
}

/**
 * Extract provider transport metadata used by the flow for throttling/caching.
 * Missing headers are kept as null so callers can distinguish "not provided"
 * from "quota is zero".
 *
 * @param {Response} response
 * @returns {{requestLimit:string|null,requestRemaining:string|null,cached:string|null}}
 */
function extractProviderResponseHeaders(response) {
  return {
    requestLimit: response.headers.get("x-ratelimit-limit"),
    requestRemaining: response.headers.get("x-ratelimit-remaining"),
    cached: response.headers.get("x-cached"),
  };
}
