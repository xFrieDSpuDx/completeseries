# Metadata Provider Architecture

Complete Series treats metadata providers as catalogue adapters. The scan engine asks each selected provider for the same small set of operations, then compares the returned catalogue evidence with the user's Audiobookshelf library.

## Provider Contract

Each provider implements `MetadataProvider` in `src/integrations/metadata/metadataProvider.ts`.

- `getBookByAsin` returns one provider book for an identifier anchor.
- `getSeriesBooks` returns every known book for one provider series.
- `searchSeries` returns likely series when identifier evidence is not enough.

Providers return the shared domain types from `src/domain/audiobook.ts`. This keeps matching, filtering, debug output, and manual overrides independent of the source catalogue.

Providers can set `automaticMatch` to `false` on a series candidate when the candidate is useful review evidence but should not create normal missing-book results without a manual user override.

Providers and candidates also expose an evidence level:

- `trusted` providers can create matched-series results when confidence checks pass.
- `review` providers can help Review and less-confident result workflows but should stay user-confirmed until their catalogue semantics are strong enough.
- `weak` is reserved for providers or candidate paths that should only be shown as supporting clues.

## Registry

`src/integrations/metadata/metadataProviderRegistry.ts` is the single place that defines provider order, default selection, lifecycle, and user-facing options.

- Audible is the primary default provider.
- Apple Books is experimental, non-default, and search-only.
- Google Books is experimental, non-default, and search-only.
- Open Library is experimental, non-default, and search-only.
- Normal scans stop after the first selected provider returns useful candidates.
- Deep provider search queries all selected providers and merges candidates.

## Adding a Provider

1. Add a provider adapter in `src/integrations/metadata`.
2. Map the external response into `ProviderSeriesBook` and `ProviderSeriesCandidate`.
3. Add the provider to `metadataProviderRegistry`.
4. Add registry tests for default selection, ordering, and lifecycle.
5. Add provider tests for mapping, unavailable products, region handling, and search behaviour.
6. Document the provider's matching limits, data source, and request volume.

New providers should be non-default until their matching quality, availability handling, and request volume are understood.

## Current Providers

### Audible

Audible supports the full current matching flow: ASIN lookup, series lookup, child product lookup, product search, regional storefronts, covers, and availability evidence.

Audible requests use the app host's same-origin forwarding route because the public Audible API host does not return browser-readable CORS headers. The route is limited to public catalogue `GET` requests and strips credential, cookie, origin, referrer, API-key, and forwarding headers before sending the request to Audible.

Complete Series does not send Audiobookshelf credentials, API keys, bearer tokens, server URLs, library contents, hidden items, manual matches, saved filters, debug history, local exports, or Google Books keys through the Audible route.

The Audible route receives only public catalogue lookup data: selected region, catalogue path, ASIN or batch ASINs, optional keyword search text, result count, and Audible response groups. The full forwarding data list is in [Setup and configuration](setup-configuration.md#provider-forwarding-data).

### Apple Books

Apple Books uses the Apple Search API audiobook endpoints. It can help with review evidence, but it does not provide Audible ASINs or a confirmed complete-series endpoint.

Complete Series treats Apple Books as an experimental review provider. Apple candidates can be selected manually from Review when the user confirms the catalogue series is the right one.

Apple evidence is gathered from ISBN lookup when local ISBN metadata exists, series-name search, and cautious author/title search. Matching uses visible title text, author text, series-name text in result fields, and ISBN values when Apple resolves a local ISBN lookup.

Descriptions, publisher-style text, cover filenames, genres, and availability fields are not treated as matching evidence. Apple title-derived positions may help display or filter manually selected candidates, but Apple filters remain limited because the Search API does not provide a confirmed complete series endpoint.

The Apple Books fallback route is used only when direct browser requests are blocked. The production NGINX route is limited to `/search` and `/lookup`.

### Google Books

Google Books uses the public Volumes API for title, author, edition, language, cover, and ISBN evidence. It is useful when Audiobookshelf records include ISBN values or when a broad book catalogue can help explain uncertain Audible matching.

Google Books is not audiobook-specific and does not expose a confirmed complete audiobook-series endpoint. Complete Series treats it as an experimental review provider. It can populate Review and less-confident result cards, but it should not be used as a trusted completeness source without manual confirmation.

Google Books matching uses title, author, series-name text from the search query, and ISBN evidence. Availability, audiobook format, narrator, storefront region, and series completeness filters are limited for this provider.

Google Books requests use `langRestrict` when the selected region maps cleanly to one language. Complete Series also filters explicit language evidence after the response. Users can enter a Google Books API key when selecting the provider, and deployments can provide `VITE_GOOGLE_BOOKS_API_KEY` at build time as a default.

Google Books keeps request volume low by searching broadly before using ISBN fallback:

- Quick scans make one Google Books search request and no ISBN fallback requests.
- Balanced scans use at most one ISBN fallback request if broad search returns nothing useful.
- Thorough scans use at most three ISBN fallback requests.

### Open Library

Open Library uses the public Search API for work and edition evidence, plus the Cover API for display images. It is useful for ISBN, title, author, work, and edition identifiers, especially when Audiobookshelf records contain ISBN values.

Open Library is not audiobook-specific and does not expose a complete audiobook-series endpoint. Complete Series treats it as an experimental review provider. Open Library candidates can help populate Review and less-confident result cards, but they do not create trusted matched series unless the user manually confirms the provider series.

Open Library matching uses title, author, series-name text from the search result, and ISBN evidence. Availability, audiobook format, narrator, storefront region, and series completeness filters are limited for this provider.
