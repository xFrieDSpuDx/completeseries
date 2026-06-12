export type AudibleContributor = {
  name?: string | null;
};

export type AudibleSeriesEntry = {
  asin?: string | null;
  sequence?: string | number | null;
  title?: string | null;
  url?: string | null;
};

export type AudibleRelationship = {
  asin?: string | null;
  relationship_to_product?: string | null;
  relationship_type?: string | null;
  sequence?: string | number | null;
  sort?: string | number | null;
};

export type AudiblePrice = {
  credit_price?: number | null;
  list_price?: {
    base?: number | null;
    currency_code?: string | null;
  } | null;
  lowest_price?: {
    base?: number | null;
    currency_code?: string | null;
  } | null;
};

export type AudibleProduct = {
  asin?: string | null;
  available_codecs?: unknown[];
  authors?: AudibleContributor[];
  content_delivery_type?: string | null;
  content_type?: string | null;
  format_type?: string | null;
  has_children?: boolean;
  is_listenable?: boolean;
  is_preview_enabled?: boolean;
  is_purchasability_suppressed?: boolean;
  merchandising_summary?: string | null;
  narrators?: AudibleContributor[];
  price?: AudiblePrice | null;
  product_images?: Record<string, string>;
  publisher_name?: string | null;
  publisher_summary?: string | null;
  relationships?: AudibleRelationship[];
  release_date?: string | null;
  runtime_length_min?: number | null;
  sample_url?: string | null;
  series?: AudibleSeriesEntry[];
  sku?: string | null;
  sku_lite?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  title?: string | null;
  url?: string | null;
};

export type AudibleProductResponse = {
  product?: AudibleProduct;
  products?: AudibleProduct[];
  similar_products?: AudibleProduct[];
};
