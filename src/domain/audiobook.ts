export type RegionCode = "au" | "br" | "ca" | "de" | "es" | "fr" | "in" | "it" | "jp" | "uk" | "us";

export type SeriesPosition = {
  raw: string | null;
  numeric: number | null;
};

export type LocalBookEvidence = {
  id: string;
  title: string;
  subtitle?: string | null;
  asin?: string | null;
  isbn?: string | null;
  sku?: string | null;
  skuGroup?: string | null;
  authors: string[];
  narrators: string[];
  seriesNames?: string[];
  genres?: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  releaseDate?: string | null;
  position: SeriesPosition;
};

export type LocalSeriesEvidence = {
  id: string;
  name: string;
  libraryId?: string;
  books: LocalBookEvidence[];
};

export type ProviderSeriesBook = {
  asin: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  summary?: string | null;
  isbn?: string | null;
  sku?: string | null;
  skuGroup?: string | null;
  region?: RegionCode | string | null;
  authors: string[];
  narrators: string[];
  genres?: string[];
  series: Array<{
    asin?: string | null;
    name: string;
    position?: string | number | null;
  }>;
  bookFormat?: "abridged" | "unabridged" | string | null;
  releaseDate?: string | null;
  imageUrl?: string | null;
  link?: string | null;
  publisher?: string | null;
  isAvailable?: boolean;
  isBuyable?: boolean;
  isListenable?: boolean;
  deliveryType?: string | null;
  hasChildren?: boolean;
  childRelationshipTypes?: string[];
};

export type ProviderSeriesCandidate = {
  seriesAsin: string;
  name: string;
  /**
   * Describes how much trust Complete Series should place in the provider
   * candidate before user review.
   */
  evidenceLevel?: "trusted" | "review" | "weak";
  /**
   * When false, the candidate can be shown as review evidence but cannot be
   * accepted automatically as the matching provider series.
   */
  automaticMatch?: boolean;
  manualMatch?: boolean;
  /**
   * Optional provider-level controls for evidence that may be useful for
   * display or filtering but should not increase confidence in a match.
   */
  matchingRules?: {
    includeFormat?: boolean;
    includeSeriesPosition?: boolean;
    includeSubtitle?: boolean;
  };
  providerId?: string;
  providerName?: string;
  region?: RegionCode | string | null;
  books: ProviderSeriesBook[];
};

export type MatchStatus = "matched" | "unresolved";

export type SeriesMatch = {
  status: MatchStatus;
  localSeries: LocalSeriesEvidence;
  providerSeries?: ProviderSeriesCandidate;
  score: number;
  reason: string;
  signals: MatchSignals;
};

export type MatchSignals = {
  asinMatches: number;
  isbnMatches: number;
  skuMatches: number;
  titleMatches: number;
  subtitleMatches: number;
  positionMatches: number;
  authorMatches: number;
  seriesNameSimilarity: number;
};
