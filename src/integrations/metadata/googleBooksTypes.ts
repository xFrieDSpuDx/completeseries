export type GoogleBooksVolumesResponse = {
  items?: GoogleBooksVolume[];
  kind?: string;
  totalItems?: number;
};

export type GoogleBooksVolume = {
  id?: string;
  lookupIsbn?: string;
  selfLink?: string;
  volumeInfo?: GoogleBooksVolumeInfo;
};

export type GoogleBooksVolumeInfo = {
  authors?: string[];
  categories?: string[];
  description?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  industryIdentifiers?: Array<{
    identifier?: string;
    type?: string;
  }>;
  language?: string;
  previewLink?: string;
  publishedDate?: string;
  publisher?: string;
  subtitle?: string;
  title?: string;
};
