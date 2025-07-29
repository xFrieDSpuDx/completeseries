
# 📘 Complete My Series

**Identify missing audiobooks from the series you own**  
*Designed for use with Audible series and AudiobookShelf.*

Live demo: [completeseries.lily-pad.uk](https://completeseries.lily-pad.uk)

⚠️ Security & Server Use
This project uses PHP to make server-side requests — specifically for authenticating with your AudiobookShelf server and proxying metadata queries to external APIs.

⚠️ A word of caution:
In many PHP-based projects, usernames, passwords, or URLs can be logged, either accidentally or intentionally. That is not the case here. This project's PHP scripts do not store or log any credentials or personal data.
You can inspect the full source code in this repository to verify that yourself. If you have any concerns about privacy or want full control, it's strongly recommended to self-host this project on your own server.

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

3. **Discover missing books**  
   - The app fetches your library, finds the first book in each series, then uses that to get the full series metadata from `audimeta.de`.

4. **Review and buy**  
   - Click a series tile to see all missing titles.  
   - Click a book to see more info and a purchase link on Audible.

5. **Hide content you don't want**  
   - Use the 👁️ icon to hide series or books permanently.  
   - Hidden items are tracked and can be managed from the sidebar (burger menu).

---

## 🖼️ Screenshots

| Feature | Screenshot |
|--------|------------|
| 🏠 Home Page | ![HomePage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HomePage.png) |
| 📊 Results Page | ![ResultsPage](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/ResultsPage.png) |
| 📚 Book Modal | ![BooksModal](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BooksModal.png) |
| 📖 Book Details | ![BookDetails](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/BookDetails.png) |
| 🙈 Hide Individual Book | ![HideBooks](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideBooks.png) |
| 🚫 Hide Entire Series | ![HideSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HideSeries.png) |
| 👁️ Hidden Books & Series Modal | ![HiddenBooksAndSeries](https://raw.githubusercontent.com/xFrieDSpuDx/completeseries/refs/heads/main/ExampleImages/HiddenBooksAndSeries.png) |

---

## 📦 Deployment

You can host your own version or use the one at [https://completeseries.lily-pad.uk](https://completeseries.lily-pad.uk). The project is as client-side as possible, however AudiobookShelf login and audimeta proxy components rely on PHP to stop CORS issues.

---

## 📄 License

MIT – Use it, improve it, share it.
