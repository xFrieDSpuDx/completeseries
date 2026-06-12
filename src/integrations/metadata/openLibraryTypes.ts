export type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
  numFound?: number;
  num_found?: number;
  start?: number;
};

export type OpenLibrarySearchDoc = {
  author_name?: string[];
  cover_i?: number;
  edition_key?: string[];
  first_publish_year?: number;
  isbn?: string[];
  key?: string;
  language?: string[];
  lookupIsbn?: string;
  publish_year?: number[];
  publisher?: string[];
  title?: string;
};
