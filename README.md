# 📘 Complete Your Collection

### Every series brought together

**Identify missing audiobooks from the series you own**  
_Designed for use with Audible series and AudiobookShelf._

Live demo: [completeseries.lily-pad.uk](https://completeseries.lily-pad.uk)

### ⚠️ Security & Server Use

**The Metadata agent has moved from Audimeta.de, a trusted source to an unknown libex.lostcartographer.xyz. I have confirmed the new source works, but have not had a deep look into it.

Work as started to migrate away from 3rd party metadata providers and to use Audible API directly.**

By default this project uses JavaScript to authenticate with your AudiobookShelf server. To achieve this CORS acceptions must be added in AudiobookShelf. These settings are found in the Audiobook main settings page under "Allowed CORS Origins". You should add the domain you are accessing this project from, e.g. you are accessing it form https://completeseries.lily-pad.uk you should add that URL into the Allow CORS Origins text area. If you are hosting locally e.g. http://localhost:8080, then add that URL instead.

Potential issues with CORS; you can not access an HTTP URL from an HTTPS URL. E.g. you are accessing this app from https://completeseries.lily-pad.uk and trying to connect to your AudiobookShelf server at http://audiobooks.example.com. This will always fail.

If you are unable to connect using JavaScript this project can use PHP to make server-side requests, acting as a proxy to avoid CORS issues — specifically for authenticating with your AudiobookShelf server. This is a manually selectable option to increase security and avoid sending authentication information to a potentially unknown server.

> ⚠️ **A word of caution:**  
> In many PHP-based projects, usernames, passwords, or URLs _can_ be logged, either accidentally or intentionally.  
> **That is _not_ the case here.**  
> This project's PHP scripts do **not** store or log any credentials or personal data.

You can inspect the full source code in this repository to verify that yourself. If you have any concerns about privacy or want full control, it’s strongly recommended to **self-host this project on your own server**.

---

## 🚀 Overview

**Complete My Series** helps you find audiobooks missing from your library's series collections. It integrates with your AudiobookShelf server and uses data from [libex.lostcartographer.xyz](https://libex.lostcartographer.xyz) to determine which titles you're missing from each Audible series.

---

## 🔧 Features

- 🔐 Connects securely to your AudiobookShelf server
- 🔎 Automatically identifies missing books in Audible series
- 📚 Supports filtering for unique titles only (no duplicates)
- 🎭 Hide unwanted books or series to reduce clutter
- 💬 Full metadata view via modals, with direct links to Audible and download options
- 🌍 Region support (UK, US, CA, AU, FR, DE, JP, IT, IN, ES, BR)
- 🐞 View and download full debug reports to understand exactly why results were filtered
- 📥 Download local cache to avoid being forced to request book metadata again

---

## 🧪 How to Use

1. **Enter your AudiobookShelf credentials**
   - URL, username, and password are required to retrieve your audiobook and series list.

1(b). **_Enter your AudiobookShelf credentials - API Key_**

- If you use API keys instead of username and password enable this option in the advanced section.

2. **Choose your settings**
   - Default behavior: shows only unique, unabridged titles you're missing.
   - Uncheck "Ignore matching titles" to allow duplicates with the same name.

3. **Choose your library**
   - If you have more than one library, pick the one(s) to search against and produce results.
   - If you have a single library this screen will not be shown and the default library will be used.

4. **Discover missing books**
   - The app fetches your library, finds the first book in each series, then uses that to get the full series metadata from `libex.lostcartographer.xyz`.
   - If the series metadata has already been fetched from `libex.lostcartographer.xyz` internal storage is used to improve performance and reduce API requests.

5. **Review and buy**
   - Click a series tile to see all missing titles.
   - Click a book to see more info and a purchase link on Audible.

6. **Hide content you don't want**
   - Use the 👁️ icon to hide series or books permanently.
   - Hidden items are tracked and can be managed from the sidebar (burger menu).

7. **Apply new filters**
   - Change the filters used and get an updated results page without logging in again
   - Clear cached contents to force a new request

8. **Download results**
   - Download the results to CSV or Json format

9. **Debug Modal**
   - The Debug Modal provides a detailed, real-time view of your library’s data and applied filters, helping with troubleshooting and understanding the app’s logic.
   - Group results
   - Filter results
   - Download results as JSON or CSV

---

## 🖼️ Screenshots

| Feature                             | Screenshot                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏠 Home Page                        | ![HomePage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HomepageFilterClosed.png)               |
| 🏠 Home Page Filters                | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HomepageFilterOpen.png)          |
| 🔑 Home Page API Key Login          | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/LoginWithAPIKey.png)             |
| 🔀 Home Page Filters                | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/PHPProxyAndWarning.png)          |
| 📚 Library Selection                | ![LibrarySelection](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/LibrarySelect.png)              |
| 📊 Results Page                     | ![ResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/ResultsPage.png)                     |
| ⏳ Results Loading                  | ![ResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/ResultsLoadingPlaceholder.png)       |
| 🧰 Filter Results Page              | ![FilterResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/FilterOptionsAfterResults.png) |
| 📚 Book Modal                       | ![BooksModal](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BooksModal.png)                       |
| 📖 Book Details                     | ![BookDetails](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BookDetails.png)                     |
| 🙈 Hide Individual Book             | ![HideBooks](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideBooks.png)                         |
| 🚫 Hide Entire Series               | ![HideSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideSeries.png)                       |
| 👁️ Hidden Books & Series Modal      | ![HiddenBooksAndSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HiddenBooksAndSeries.png)   |
| 🐞 Debug Modal (No Filters)         | ![DebugModalNoFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/Debug.png)                   |
| 🐞 Debug Modal (Filters & Grouping) | ![DebugModalWithFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/DebugFilterGroup.png)      |

---

## 📦 Deployment

You can host your own version or use the one at [https://completeseries.lily-pad.uk](https://completeseries.lily-pad.uk). The project is as client-side as possible, however older AudiobookShelf installs and certain setups rely on PHP to stop CORS issues. By default the application tries to use JavaScript but does give the option to fallback to using a PHP proxy if needed. The proxy option is found in the advanced section of the home page.

This repository ships with a full, production-grade toolchain so you can build and host your own optimised bundle instead of running the raw dev files. The build process bundles and minifies JS/CSS, rewrites HTML to use content-hashed assets, and copies required `assets/` and optional `php/` proxy files into `dist/` for zero-config deployment. Linting (ESLint) and formatting (Prettier) configs are included to keep contributions consistent. See the commands below to install, build, preview, and lint your local clone.

#### 1) Install (Node 18+)

npm install # or: npm ci

#### 2) Build a production bundle → dist/

npm run build

#### 3) Preview the built site locally

npm run serve:all

#### (Optional) Rebuild on changes during development

npm run watch

#### (Optional) Lint & auto-fix

npm run lint && npm run lint:fix && npm run format

---

## 📄 License

MIT – Use it, improve it, share it.
