export type AppleBooksSearchResponse = {
  resultCount?: number;
  results?: AppleBooksAudiobookResult[];
};

export type AppleBooksAudiobookResult = {
  amgArtistId?: number;
  artistId?: number;
  artistName?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  collectionCensoredName?: string;
  collectionExplicitness?: string;
  collectionId?: number;
  collectionName?: string;
  collectionPrice?: number;
  collectionViewUrl?: string;
  country?: string;
  currency?: string;
  description?: string;
  genreIds?: string[];
  kind?: string;
  lookupIsbn?: string;
  longDescription?: string;
  previewUrl?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackCensoredName?: string;
  trackCount?: number;
  trackId?: number;
  trackName?: string;
  trackPrice?: number;
  trackTimeMillis?: number;
  trackViewUrl?: string;
  wrapperType?: string;
};
