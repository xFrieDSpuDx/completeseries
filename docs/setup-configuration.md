# Setup and Configuration

Use this guide to run Complete Series V2, host it, connect Audiobookshelf, and choose scan settings.

## Local Development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open one of these URLs:

- `http://127.0.0.1:5173/`
- `http://localhost:5173/`

The Vite development server also provides the local provider routes used during scans:

- `/api/audible/{region}`
- `/api/apple-books`

These local routes mirror the production NGINX routes so development and hosted behaviour stay close.

## Audiobookshelf Setup

Complete Series connects directly from the browser to your Audiobookshelf server. Audiobookshelf must allow the origin where Complete Series is running.

For local development, add the origin you use in the browser:

- `http://127.0.0.1:5173`
- `http://localhost:5173`

For a hosted copy, add the public Complete Series URL.

If login fails even when the server URL and credentials are correct, check:

- Audiobookshelf allowed origins.
- Reverse proxy support for `OPTIONS` requests.
- Reverse proxy support for `Authorization` and `Content-Type` headers.

You can sign in with either an Audiobookshelf API key or a username and password. Username/password login is exchanged for an Audiobookshelf bearer token by Audiobookshelf itself. The token is then used in your browser for direct Audiobookshelf requests.

Audiobookshelf credentials, API keys, bearer tokens, and library contents are not sent through the Audible or Apple Books provider routes.

## Production Hosting

Build the static app:

```bash
npm run build
```

Serve the generated `dist` directory from your web server.

Complete Series is a static browser app, but the web server must also provide the provider routes below:

- `/api/audible/{region}/1.0/catalog/products`
- `/api/audible/{region}/1.0/catalog/products/{asin}`
- `/api/apple-books/search`
- `/api/apple-books/lookup`

The included `nginx.conf` provides these routes. If you use another web server, mirror the same behaviour:

- Allow only the expected provider paths.
- Allow only `GET` and `HEAD` requests.
- Do not forward request bodies.
- Strip credential, cookie, origin, referrer, API-key, and forwarding headers.
- Hide provider `Set-Cookie` response headers.
- Serve all other routes from the static app.

Audible needs same-origin forwarding because its public catalogue API does not return browser-readable CORS headers. Apple Books is tried directly first; if the browser blocks the response, Complete Series uses the same-origin Apple fallback route.

## cPanel Hosting

A static cPanel upload is not enough for Complete Series, because Audible and Apple Books need same-origin provider routes. Use cPanel's Node.js application support if your host provides it.

Host Complete Series at the root of a subdomain or addon domain, such as:

```text
https://complete-series.example.com/
```

Avoid hosting it in a subdirectory such as `/complete-series` unless the Vite base path is changed and rebuilt.

Build the app locally:

```bash
npm install
npm run build
```

Upload these items to the cPanel Node.js app root:

- `app.js`
- `dist/`
- `server/cpanel-server.mjs`
- `package.json`
- `package-lock.json`

In cPanel's Node.js application screen, use:

- Node.js version: 18 or newer.
- Application mode: production.
- Application root: the folder containing the uploaded files.
- Application URL: the public subdomain or addon domain.
- Application startup file: `app.js`.
- Startup command, if your host asks for one: `npm start`.

cPanel should provide `PORT` automatically. Do not hard-code a port unless your host tells you to.

After starting or restarting the cPanel app, open the public URL and check these routes:

```text
https://complete-series.example.com/
https://complete-series.example.com/api/audible/uk/1.0/catalog/products/B09MDKHZV5?response_groups=product_attrs
https://complete-series.example.com/api/apple-books/search?country=GB&media=audiobook&entity=audiobook&term=Discworld&limit=1
```

Then add the public Complete Series origin to Audiobookshelf allowed origins:

```text
https://complete-series.example.com
```

The cPanel server mirrors the NGINX provider route behaviour. It serves the built app, forwards only the supported public catalogue `GET` and `HEAD` routes, does not forward request bodies, and does not send Audiobookshelf credentials or Google Books keys to Audible or Apple Books.

If your cPanel account does not provide Node.js application support, use Docker, NGINX, or another host that can provide the same provider routes. Uploading only `dist/` to `public_html` will show the interface but catalogue scans will fail when the browser reaches providers that block CORS.

## Docker Hosting

Docker is optional. The provided Docker setup builds the app and serves it with NGINX:

```bash
docker compose up --build
```

The app will be available at `http://127.0.0.1:8080/`.

To provide a default Google Books key at build time, set `VITE_GOOGLE_BOOKS_API_KEY` in your shell or in a local `.env` file before building:

```bash
VITE_GOOGLE_BOOKS_API_KEY=your_key_here docker compose up --build
```

This key is embedded into the browser app. It is not private. Users can still enter a different Google Books key in the scan filters.

## Docker Validation Checklist

These steps are intended for the final release check. They have not been run automatically by the app.

1. Build and start the container:

```bash
docker compose up --build
```

2. Open the app:

```text
http://127.0.0.1:8080/
```

3. Confirm the static app responds:

```bash
curl -I http://127.0.0.1:8080/
```

4. Confirm the Audible forwarding route responds:

```bash
curl -I "http://127.0.0.1:8080/api/audible/uk/1.0/catalog/products/B09MDKHZV5?response_groups=product_attrs"
```

5. Confirm the Apple Books fallback route responds:

```bash
curl -I "http://127.0.0.1:8080/api/apple-books/search?country=GB&media=audiobook&entity=audiobook&term=Discworld&limit=1"
```

6. Confirm blocked routes are not accepted:

```bash
curl -I http://127.0.0.1:8080/api/apple-books/anything-else
curl -I http://127.0.0.1:8080/api/audible/uk/anything-else
```

7. Check the container logs:

```bash
docker compose logs --tail=100
```

8. Stop the validation container:

```bash
docker compose down
```

Provider route checks require outbound internet access from the container. A provider `4xx` or `5xx` can still prove the NGINX route is wired correctly, but a release check should confirm real provider requests return readable JSON.

## Google Books Key

Google Books public requests are more reliable with an API key. Users can enter a key in the scan filters when Google Books is selected, or a deployment can provide a default key at build time.

For local development, copy `.env.example` to `.env.local` and set:

```bash
VITE_GOOGLE_BOOKS_API_KEY=your_key_here
```

Restart the development server after changing `.env.local`.

Browser apps cannot keep this key secret. Treat it as a quota and identification key, not as a private credential.

## First Scan

1. Open Complete Series.
2. Enter your Audiobookshelf server URL.
3. Choose API-key login or username/password login.
4. Select one or more audiobook libraries.
5. Choose the catalogue region.
6. Choose metadata providers and filters.
7. Start the scan.

Audible is the recommended default provider. Experimental providers are best used for Review evidence, less-confident results, or deeper investigation.

## Catalogue Region

The catalogue region decides which marketplace Complete Series asks providers to use.

For Audible, this changes the Audible catalogue host. For other providers, Complete Series uses the selected region for country, storefront, or language filters when the provider supports them.

## Metadata Providers

### Audible

Audible is the trusted default provider. It gives the strongest audiobook-specific evidence for series membership, format, region, availability, release date, cover art, SKU, and relationships.

Audible catalogue calls use the same-origin route described above because Audible does not return browser-readable CORS headers. The route handles public catalogue requests only.

### Apple Books

Apple Books uses Apple Search API audiobook results. It can help with difficult matches, but it does not provide the same series or edition detail as Audible.

Apple matching is limited to title, author, series-name text, and ISBN when Apple resolves it. Some filters are weaker for Apple Books results.

### Google Books

Google Books uses the public Google Books Volumes API. It is useful for title, author, edition, ISBN, cover, and language evidence, but it is not audiobook-specific and can return print books or ebooks.

Complete Series does not treat Google Books as proof that an audiobook is available.

To reduce request volume, Google Books tries one broad series or author search before ISBN fallback:

- Quick scan: no ISBN fallback.
- Balanced scan: one ISBN fallback.
- Thorough scan: up to three ISBN fallbacks.

Complete Series uses Google's `langRestrict` parameter when the selected region maps cleanly to one language, such as UK, US, Germany, France, Spain, Italy, Japan, Brazil, Australia, or India. Regions with more than one expected language, such as Canada, keep broader results and are filtered after the response.

### Open Library

Open Library uses open book and work metadata. Like Google Books, it is not audiobook-specific.

It can help with work ids, edition ids, ISBNs, authors, cover art, and Review evidence. It should not be treated as proof that a matching audiobook is available.

## Provider Forwarding Data

Complete Series uses same-origin provider forwarding only when a provider blocks browser requests. The forwarding route is hosted by the same web server that serves Complete Series. It is not a third-party metadata service.

### What the Audible route can receive

The Audible route can receive:

- The selected Audible region in the path, such as `uk`, `us`, or `de`.
- The public Audible catalogue path `/1.0/catalog/products`.
- One Audible product or series ASIN when looking up a single catalogue item.
- A comma-separated `asins` query value when loading known series children in batches.
- A `keywords` query value when falling back to Audible catalogue search. This is usually a local series title, book title, or author name already visible in Audiobookshelf metadata.
- `num_results=50` for Audible keyword searches.
- `response_groups`, which asks Audible to return fields such as contributors, media, product attributes, descriptions, series, SKU, and relationships.

### What the Apple Books route can receive

The Apple Books fallback route can receive:

- The Apple API endpoint, limited in NGINX to `/search` or `/lookup`.
- `country`, the selected Apple storefront country.
- `term`, usually a series title, book title, or author name from local metadata.
- `media=audiobook` and `entity=audiobook`.
- `limit`, the requested search result count.
- `id`, an Apple track id when reloading an Apple result.
- `isbn`, only when the local Audiobookshelf record already contains an ISBN and Apple Books is selected.

### What provider routes do not receive

Provider forwarding routes do not receive or forward:

- Audiobookshelf username or password.
- Audiobookshelf API key.
- Audiobookshelf bearer token.
- Google Books API key.
- Audiobookshelf server URL.
- Audiobookshelf library id list.
- Full Audiobookshelf library contents.
- Hidden items, manual matches, saved filters, debug history, or exported local data.

Normal requests to the Complete Series web server can still include ordinary web connection metadata, such as IP address and user-agent. That is true for any hosted web page. The included Vite and NGINX forwarding configurations remove `Authorization`, `Cookie`, `Origin`, `Referer`, `X-Api-Key`, `X-Forwarded-*`, and `X-Real-IP` before forwarding provider requests to Audible or Apple.

## Provider Search Mode

First provider match is the default. Complete Series checks selected providers in order and stops once a provider returns usable candidates.

Deep provider search checks every selected provider and merges the evidence. This helps difficult matches, but it creates more provider requests and may produce more Review items.

## Search Depth

Search depth controls how many local identifiers Complete Series tries before falling back to search.

- Quick scan uses the strongest ASIN anchor and makes the fewest provider requests.
- Balanced scan checks a small spread of local books and is the recommended default.
- Thorough scan checks every usable ASIN and can be slower on large libraries.

Non-Audible providers may also use search depth to limit fallback requests.

## Filters

The default filters are aimed at the common audiobook-series use case:

- Only show unabridged editions.
- Hide omnibus and multi-book editions.
- Hide books without a series position.
- Hide positions already owned.
- Hide title/subtitle matches already owned.
- Reuse catalogue cache.
- Hide empty future placeholders.

Other filters are available for stricter or more specialised scans:

- Include subseries results.
- Hide decimal positions, such as `#3.5`.
- Collapse duplicate missing positions.
- Treat narrator changes as separate editions.
- Collapse duplicate missing titles.
- Hide unreleased books.
- Hide already released books.

Some filters rely on provider evidence. They are strongest with Audible and weaker with experimental book-catalogue providers.

## Local Data

Complete Series stores user preferences in browser storage so repeat scans are quicker and easier.

Stored data can include:

- Hidden series and hidden books.
- Manual book matches.
- Series overrides.
- Saved scan filters.
- Selected region and libraries.
- Display settings.
- Provider response cache.

The Data panel can delete each local data area individually or clear all local data.

Deleting the provider response cache also clears provider responses held in the current browser session, so the next scan asks the selected metadata providers again.

## Export and Import

The Download panel can export results, debug data, hidden items, saved filters, manual matches, and provider response cache data.

Use local data export before clearing browser storage, moving to another browser, or testing a new deployment.
