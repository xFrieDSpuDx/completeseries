
# 📘 Complete My Series

**Identify missing audiobooks from the series you own**  
*Designed for use with Audible series and AudiobookShelf.*

Live demo: [completeseries.lily-pad.uk](https://completeseries.lily-pad.uk)

### ⚠️ Security & Server Use

This project uses PHP to make server-side requests — specifically for authenticating with your AudiobookShelf server and proxying metadata queries to external APIs.

> ⚠️ **A word of caution:**  
> In many PHP-based projects, usernames, passwords, or URLs *can* be logged, either accidentally or intentionally.  
> **That is *not* the case here.**  
> This project's PHP scripts do **not** store or log any credentials or personal data.

You can inspect the full source code in this repository to verify that yourself. If you have any concerns about privacy or want full control, it’s strongly recommended to **self-host this project on your own server**.


---

## 🚀 Overview

**Complete My Series** helps you find audiobooks missing from your library's series collections. It integrates with your AudiobookShelf server and uses data from [audimeta.de](https://audimeta.de) to determine which titles you're missing from each Audible series.

---

## 🔧 Features

- 🔐 Connects securely to your AudiobookShelf server  
- 🔎 Automatically identifies missing books in Audible series  
- 📚 Supports filtering for unique titles only (no duplicates)  
- 🎭 Hide unwanted books or series to reduce clutter  
- 💬 Full metadata view via modals, with direct links to Audible  
- 🌍 Region support (UK, US, CA, AU, FR, DE, JP, IT, IN, ES, BR)

---

## 🧪 How to Use

1. **Enter your AudiobookShelf credentials**  
   - URL, username, and password are required to retrieve your audiobook and series list.

2. **Choose your settings**  
   - Default behavior: shows only unique, unabridged titles you're missing.  
   - Uncheck "Ignore matching titles" to allow duplicates with the same name.

3. **Choose your library**  
   - If you have more than one library, pick the one(s) to search against and produce results.
   - If you have a single library this screen will not be shown and the default library will be used. 

4. **Discover missing books**  
   - The app fetches your library, finds the first book in each series, then uses that to get the full series metadata from `audimeta.de`.
   - If the series metadata has already been fetched from `audimeta.de` internal storage is used to improve performance and reduce API requests.

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

| Feature | Screenshot |
|--------|------------|
| 🏠 Home Page | ![HomePage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HomepageFilterClosed.png) |
| 🏠 Home Page Filters | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HomepageFilterOpen.png) |
| 🔑 Home Page API Key Login | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/LoginWithAPIKey.png) |
| 🔀 Home Page Filters | ![HomePageFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/PHPProxyAndWarning.png) |
| 📚 Library Selection | ![LibrarySelection](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/LibrarySelect.png) |
| 📊 Results Page | ![ResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/ResultsPage.png) |
| ⏳ Results Loading | ![ResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/ResultsLoadingPlaceholder.png) |
| 🧰 Filter Results Page | ![FilterResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/FilterOptionsAfterResults.png) |
| 📚 Book Modal | ![BooksModal](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BooksModal.png) |
| 📖 Book Details | ![BookDetails](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BookDetails.png) |
| 🙈 Hide Individual Book | ![HideBooks](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideBooks.png) |
| 🚫 Hide Entire Series | ![HideSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideSeries.png) |
| 👁️ Hidden Books & Series Modal | ![HiddenBooksAndSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HiddenBooksAndSeries.png) |
| 🐞 Debug Modal (No Filters) | ![DebugModalNoFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/Debug.png) |
| 🐞 Debug Modal (Filters & Grouping) | ![DebugModalWithFilters](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/DebugFilterGroup.png) |

---

## 📦 Deployment

You can host your own version or use the one at [https://completeseries.lily-pad.uk](https://completeseries.lily-pad.uk). The project is as client-side as possible, however older AudiobookShelf installs and certain setups rely on PHP to stop CORS issues. By default the application tries to use JavaScript but does give the option to fallback to using a PHP proxy if needed. The proxy option is found in the advanced section of the home page.

---

## 📄 License

MIT – Use it, improve it, share it.