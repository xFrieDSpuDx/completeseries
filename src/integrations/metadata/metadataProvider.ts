import type {
  ProviderSeriesBook,
  ProviderSeriesCandidate,
  RegionCode,
} from "../../domain/audiobook";

export type MetadataProviderRequest = {
  region: RegionCode;
  cache: boolean;
  googleBooksApiKey?: string;
};

export type MetadataProviderId = "audible" | "appleBooks" | "googleBooks" | "openLibrary";

export type MetadataProviderEvidenceLevel = "trusted" | "review" | "weak";

export type MetadataProviderSearchMode = "firstMatch" | "deep";

export type MetadataProviderCapabilities = {
  supportsAudiobooks: boolean;
  supportsAvailability: boolean;
  supportsBookLookup: boolean;
  supportsCovers: boolean;
  supportsRegion: boolean;
  supportsSeriesLookup: boolean;
  supportsSeriesSearch: boolean;
};

export type BookLookupRequest = MetadataProviderRequest & {
  asin: string;
};

export type SeriesLookupRequest = MetadataProviderRequest & {
  seriesAsin: string;
};

export type SeriesSearchRequest = MetadataProviderRequest & {
  query: string;
  authorNames: string[];
  knownIsbns: string[];
  knownTitles: string[];
  metadataLookupMode?: "quick" | "balanced" | "thorough";
};

export type MetadataProvider = {
  id: MetadataProviderId;
  displayName: string;
  capabilities: MetadataProviderCapabilities;
  evidenceLevel: MetadataProviderEvidenceLevel;

  /**
   * Purpose: Look up a single provider book by ASIN.
   *
   * @param request - Book lookup details, including ASIN, region, and cache
   * preference.
   * @returns Provider book metadata, or `null` when the book cannot be found.
   */
  getBookByAsin(request: BookLookupRequest): Promise<ProviderSeriesBook | null>;

  /**
   * Purpose: Look up every known book in a provider series.
   *
   * @param request - Series lookup details, including provider series ASIN,
   * region, and cache preference.
   * @returns Provider series metadata, or `null` when the series cannot be
   * found.
   */
  getSeriesBooks(request: SeriesLookupRequest): Promise<ProviderSeriesCandidate | null>;

  /**
   * Purpose: Search for likely provider series when identifier-based lookup is
   * not enough.
   *
   * @param request - Search text and local evidence that can help a provider
   * narrow the results.
   * @returns Provider series candidates ordered by the provider's own relevance
   * when available.
   */
  searchSeries(request: SeriesSearchRequest): Promise<ProviderSeriesCandidate[]>;
};

export type ProviderTransportMetadata = {
  requestLimit: string | null;
  requestRemaining: string | null;
  cached: string | null;
};
