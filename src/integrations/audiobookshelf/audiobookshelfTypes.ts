import type { LocalBookEvidence, LocalSeriesEvidence } from "../../domain/audiobook";

export type AudiobookshelfAuthConfig =
  | {
      mode: "apiKey";
      apiKey: string;
    }
  | {
      mode: "password";
      username: string;
      password: string;
    };

export type AudiobookshelfClientConfig = AudiobookshelfAuthConfig & {
  baseUrl: string;
};

export type AudiobookshelfLibrary = {
  id: string;
  name: string;
  mediaType?: string;
};

export type AudiobookshelfLibrariesResponse = {
  libraries?: AudiobookshelfLibrary[];
};

export type AudiobookshelfLoginResponse = {
  user?: {
    token?: string;
  };
};

export type AudiobookshelfRequestContext = "books" | "libraries" | "login" | "series";

export type AudiobookshelfNamedValue = string | { name?: string | null };

export type AudiobookshelfSeriesSequence = {
  id?: string;
  name?: string | null;
  sequence?: string | number | null;
};

export type AudiobookshelfSeriesResponse = {
  total?: number;
  results?: Array<{
    id?: string;
    name?: string;
    books?: Array<{
      id?: string;
      media?: {
        metadata?: {
          title?: string;
          subtitle?: string;
          asin?: string;
          isbn?: string;
          isbn10?: string;
          isbn13?: string;
          isbn_10?: string;
          isbn_13?: string;
          sku?: string;
          skuGroup?: string;
          authors?: AudiobookshelfNamedValue[];
          authorName?: string;
          narrators?: AudiobookshelfNamedValue[];
          narratorName?: string;
          genres?: AudiobookshelfNamedValue[];
          publishedDate?: string;
          publishedYear?: string;
          publisher?: string;
          releaseDate?: string;
          series?: AudiobookshelfSeriesSequence | AudiobookshelfSeriesSequence[];
          seriesName?: string;
        };
      };
    }>;
  }>;
};

export type AudiobookshelfItemsResponse = {
  total?: number;
  results?: AudiobookshelfLibraryItem[];
};

export type AudiobookshelfLibraryItem = {
  id?: string;
  media?: {
    metadata?: AudiobookshelfBookMetadata;
  };
};

export type AudiobookshelfBookMetadata = {
  title?: string;
  subtitle?: string;
  asin?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  isbn_10?: string;
  isbn_13?: string;
  sku?: string;
  skuGroup?: string;
  authors?: AudiobookshelfNamedValue[];
  authorName?: string;
  narrators?: AudiobookshelfNamedValue[];
  narratorName?: string;
  genres?: AudiobookshelfNamedValue[];
  publishedDate?: string;
  publishedYear?: string;
  publisher?: string;
  releaseDate?: string;
  series?: AudiobookshelfSeriesSequence | AudiobookshelfSeriesSequence[] | string;
  seriesName?: string;
};

export type AudiobookshelfMapperOutput = {
  books: LocalBookEvidence[];
  series: LocalSeriesEvidence[];
};
