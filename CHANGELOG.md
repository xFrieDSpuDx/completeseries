# Change log

## 2026-06-15 - Unraid Docker template

- Added an Unraid Docker template using bridge networking, host port 8080, and the 512px Complete Series favicon.

## 2026-06-13 - Docker package publishing

- Restored GitHub Container Registry publishing for the V2 Docker image.
- Documented the published `ghcr.io/xfriedspudx/completeseries:latest` image.

## 2026-06-12 - Complete Series V2 first public build

Complete Series has been rebuilt as a TypeScript and React browser app. This first V2 build
focuses on matching accuracy, review tools, and practical self-hosting.

### Application

- Moved the separately developed V2 app into the original Complete Series repository so it can
  replace the deprecated V1 codebase.
- Replaced the PHP flow with a browser app that talks directly to Audiobookshelf.
- Added a typed metadata-provider layer so catalogue providers can be changed or added without
  reshaping the scan engine.
- Added optional Docker and NGINX hosting support while keeping ordinary web-server hosting as the
  main release path.

### Matching and scanning

- Reduced the reliance on the first book ASIN by using title, subtitle, author, narrator, ASIN, SKU,
  ISBN, and series-position evidence where available.
- Added quick, balanced, and thorough scan depths for choosing between speed and deeper checks.
- Added a Review section for series that do not pass confidence checks instead of silently skipping
  them.
- Added manual book matches and provider-series overrides for difficult catalogue cases.
- Added lower-confidence result handling so weaker provider evidence can be reviewed without being
  treated as fully trusted.

### Metadata providers

- Made Audible the default trusted catalogue provider.
- Added Apple Books, Google Books, and Open Library as experimental providers.
- Added deep provider search for checking all selected metadata providers.
- Added provider evidence and request traces so users can see how each provider contributed to each
  result.
- Added Google Books API key support and language restriction for regions that map cleanly to one
  language.
- Tightened the same-origin Audible catalogue forwarding route used when browsers block direct
  Audible catalogue requests.

### Filters and result quality

- Restored and expanded V1-style filters for unabridged editions, omnibus editions, missing
  positions, duplicate titles, duplicate positions, subseries, narrator editions, and release dates.
- Added handling for empty far-future catalogue placeholders such as 2200-01-01.
- Improved matching so owned books are less likely to be reported as missing when providers return
  alternate editions.

### User experience

- Reworked the flow into login, library selection, scan progress, and results stages.
- Added a compact results grid with missing-book drawers, full overview text, read-more behaviour,
  provider links, evidence, and manual match actions.
- Added a sticky result action bar with filters, libraries, review, debug, hidden items, data,
  server, and download tools.
- Improved mobile layouts, drawer behaviour, scroll containment, and horizontal toolbar affordances.
- Added sorting by series and author, hidden item controls, and clearer scan/result summaries.
- Added visible merged-series badges and drawer details so overlapping catalogue series can be
  understood.

### Debug, data, and exports

- Added debug history, scan identifiers, provider traces, filterable debug checks, and debug
  downloads.
- Added CSV and JSON exports for missing-book results.
- Added local data backup and restore for hidden items, manual matches, saved filters, display
  settings, and provider response cache.
- Added browser-side catalogue response caching to reduce repeated provider requests.
- Fixed local-data deletion so provider response cache clearing also forces fresh metadata requests
  in the current session.

### Documentation and release work

- Added provider architecture documentation and setup/configuration guidance.
- Documented exactly what data the provider forwarding routes receive and what credentials they do
  not receive.
- Expanded automated tests around matching, provider adapters, scan orchestration, exports, local
  storage, and UI rendering.
