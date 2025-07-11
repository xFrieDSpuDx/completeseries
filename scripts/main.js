document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("loginForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      clearErrors();
      const formData = getFormData();
      if (!validateForm(formData)) return;

      document.getElementById("form-container").style.display = "none";
      setMessage("Logging in…");
      document.getElementById("spinner").style.display = "block";

      try {
        const loginData = await loginToServer(formData);
        setMessage("Login successful. Fetching book and series information...");

        // Filter out hidden series from cookie
        const hiddenItems = getHiddenItems();

        loginData.seriesFirstASIN = loginData.seriesFirstASIN.filter(
          (entry) => {
            return !hiddenItems.some((h) => h.series === entry.series && h.type === "series");
          }
        );

        const bookMeta = await fetchBookMeta(
          loginData.seriesFirstASIN,
          formData.region
        );

        const seriesMeta = await fetchSeriesMeta(
          bookMeta.seriesAsins,
          formData.region
        );

        const {
          uniqueSeriesAllASIN,
          uniqueSeriesAudibleBooks,
          groupedBySeries,
        } = deduplicateData(
          loginData.seriesAllASIN,
          seriesMeta.seriesAudibleASIN,
          formData.region,
          formData.ignoreTitleMatch,
          formData.filterUnabridged
        );

        renderResults(
          uniqueSeriesAllASIN,
          uniqueSeriesAudibleBooks,
          groupedBySeries
        );
      } catch (err) {
        console.error(err);
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("spinner").style.display = "none";
        setMessage("Error occurred. Please try again.");
      }
    });

  function clearErrors() {
    [
      "urlError",
      "usernameError",
      "passwordError",
      "spinner",
      "seriesOutput",
    ].forEach((id) => {
      document.getElementById(id).textContent = "";
      if (id === "seriesOutput") document.getElementById(id).innerHTML = "";
    });
  }

  function getFormData() {
    return {
      serverUrl: document.getElementById("serverUrl").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      region: document.getElementById("audibleRegion").value,
      ignoreTitleMatch: document.getElementById("ignoreTitleMatch").checked,
      filterUnabridged: document.getElementById("filterUnabridged").checked,
    };
  }

  function validateForm({ serverUrl, username, password }) {
    let ok = true;
    if (!serverUrl) {
      document.getElementById("urlError").textContent = "Enter the server URL.";
      ok = false;
    }
    if (!username) {
      document.getElementById("usernameError").textContent =
        "Enter your username.";
      ok = false;
    }
    if (!password) {
      document.getElementById("passwordError").textContent =
        "Enter your password.";
      ok = false;
    }
    return ok;
  }

  function setMessage(text) {
    document.getElementById("statusText").textContent = text;
  }

  async function loginToServer({ serverUrl, username, password }) {
    if (!/^https?:\/\//i.test(serverUrl)) {
      serverUrl = "https://" + serverUrl;
    }

    const resp = await fetch("../php/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverUrl, username, password }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      document.getElementById("spinner").style.display = "none";
      document.getElementById("form-container").style.display = "flex";

      throw new Error(data.message || "Login failed");
    }

    return {
      seriesFirstASIN: data.seriesFirstASIN || [],
      seriesAllASIN: data.seriesAllASIN || [],
    };
  }

  async function fetchBookMeta(seriesFirstASIN, region) {
    const seriesAsins = [];
    const results = [];
    const totalSeries = seriesFirstASIN.length;
    let activeSearchIndex = 0;

    for (const entry of seriesFirstASIN) {
      const asin = entry.asin;
      if (asin === "Unknown ASIN") continue;

      try {
        setMessage(
          `Fetching series metadata: ${activeSearchIndex} / ${totalSeries}`
        );
        const resp = await fetch(
          `../php/audimeta_proxy.php?type=book&asin=${asin}&region=${region}`
        );
        const json = await resp.json();
        if (json && json.series?.[0]?.asin) {
          results.push({ asin, response: json });
          seriesAsins.push(json.series[0].asin);
        }
        activeSearchIndex++;
      } catch (err) {
        console.warn(`Error fetching book ASIN ${asin}`, err);
        document.getElementById("spinner").style.display = "none";
      }
    }

    return { bookMetaResults: results, seriesAsins };
  }

  async function fetchSeriesMeta(seriesAsins, region) {
    const seriesAudibleASIN = [];
    const totalSeries = seriesAsins.length;
    let activeSearchIndex = 0;
    // Get hidden books from cookie
    const hiddenItems = getHiddenItems();

    for (const asin of seriesAsins) {
      try {
        setMessage(
          `Fetching books in series: ${activeSearchIndex} / ${totalSeries}`
        );
        const resp = await fetch(
          `../php/audimeta_proxy.php?type=series&asin=${asin}&region=${region}`
        );
        let json = await resp.json();

        if (!Array.isArray(json)) continue;

        json = json.filter((entry) => {
          return !hiddenItems.some((h) => h.asin === entry.asin);
        });
        seriesAudibleASIN.push({ asin, response: json });

        activeSearchIndex++;
      } catch (err) {
        console.warn(`Error fetching series ASIN ${asin}`, err);
        document.getElementById("spinner").style.display = "none";
      }
    }

    return { seriesAudibleASIN };
  }

  function deduplicateData(
    seriesAllASIN,
    seriesAudibleASIN,
    selectedRegion,
    ignoreTitleMatch,
    filterUnabridged
  ) {
    const audibleASINSet = new Set();
    const uniqueSeriesAudibleBooks = [];

    for (let i = 0; i < seriesAudibleASIN.length; i++) {
      const group = seriesAudibleASIN[i];
      if (!Array.isArray(group.response)) continue;

      for (let j = 0; j < group.response.length; j++) {
        const book = group.response[j];
        const asin = book?.asin;
        const region = book?.region;
        const isAvailable = book?.isAvailable;
        const title = book?.title;
        const series = book?.series?.[0]?.name;

        if (!asin || !region || !series || isAvailable !== true) continue;

        audibleASINSet.add(asin);

        if (region !== selectedRegion) continue;

        const isMatching = seriesAllASIN.some((entry) => {
          const sameSeries = entry.series === series;
          const asinMatch = entry.asin === asin;
          const titleMatch = ignoreTitleMatch && entry.title === title;
          return sameSeries && (asinMatch || titleMatch);
        });

        if (!isMatching) {
          const isAlreadyInUnique = uniqueSeriesAudibleBooks.some(
            (entry) => entry.asin === book.asin
          );

          const isUnabridged =
            book.bookFormat === "unabridged" || !filterUnabridged;

          if (!isAlreadyInUnique && isUnabridged) {
            uniqueSeriesAudibleBooks.push(book);
          }
        }
      }
    }

    const uniqueSeriesAllASIN = seriesAllASIN.filter(
      (entry) => !audibleASINSet.has(entry.asin)
    );

    // Deduplicate uniqueSeriesAllASIN based on entry.link
    const seenLinks = new Set();
    const deduplicatedAllASIN = [];

    for (const entry of uniqueSeriesAllASIN) {
      if (!seenLinks.has(entry.link)) {
        seenLinks.add(entry.link);
        deduplicatedAllASIN.push(entry);
      }
    }

    const groupedBySeries = groupBooksBySeries(uniqueSeriesAudibleBooks);

    return {
      uniqueSeriesAllASIN: deduplicatedAllASIN,
      uniqueSeriesAudibleBooks,
      groupedBySeries,
    };
  }

  function groupBooksBySeries(books) {
    const grouped = [];

    books.forEach((book) => {
      const seriesName = book.series?.[0].name || "No Series";

      // Find the group for this series
      let group = grouped.find((g) => g.series === seriesName);

      // If not found, create it
      if (!group) {
        group = { series: seriesName, books: [] };
        grouped.push(group);
      }

      // Add the book to the group
      group.books.push(book);
    });

    return grouped;
  }

  function renderSeriesTiles(groupedBySeries) {
    const container = document.getElementById("seriesOutput");
    container.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = `You have ${groupedBySeries.length} series with missing books.`;
    container.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "series-grid";
    container.appendChild(grid);

    const modal = document.getElementById("booksModal");
    const modalOverlay = document.getElementById("modalOverlay");
    const modalContent = document.getElementById("modalContent");
    const closeBtn = document.getElementById("modalCloseBtn");

    groupedBySeries.forEach((seriesGroup, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "tile-wrapper";
      wrapper.style.position = "relative"; // anchor for absolute positioning

      const tile = document.createElement("div");
      tile.className = "series-tile";

      const badge = document.createElement("div");
      badge.className = "series-badge";
      badge.textContent = seriesGroup.books.length;
      tile.appendChild(badge);

      const img = document.createElement("img");
      img.className = "series-image";
      img.src = seriesGroup.books[0].imageUrl;
      img.alt = seriesGroup.series;
      tile.appendChild(img);

      const title = document.createElement("div");
      title.className = "series-title";
      title.textContent = seriesGroup.series;
      tile.appendChild(title);

      grid.appendChild(tile);

      // Click event to open modal
      tile.addEventListener("click", () => {
        showModal(seriesGroup);
      });

      // Eye badge (outside the tile, positioned absolutely)
      const eyeBadge = document.createElement("div");
      eyeBadge.className = "eye-badge";

      const eyeIcon = document.createElement("img");
      eyeIcon.className = "eye-icon";
      const seriesItem = {
        type: "series",
        series: seriesGroup.series,
      };

      const isHiddenSeries = isCurrentlyHidden(seriesItem);
      if (isHiddenSeries) {
        tile.classList.add("series-mask");
      }
      eyeIcon.src = isHiddenSeries
        ? "../assets/eye-closed.svg"
        : "../assets/eye-open.svg";
      eyeIcon.alt = "Toggle visibility";
      eyeIcon.title = "Click to hide / unhide this series";

      eyeIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleVisibility({
          type: "series",
          series: seriesGroup.series,
          asin: seriesGroup.asin,
        });
        const isClosed = eyeIcon.src.includes("eye-closed.svg");
        eyeIcon.src = isClosed
          ? "../assets/eye-open.svg"
          : "../assets/eye-closed.svg";
        tile.classList.toggle("series-mask");
      });

      eyeBadge.appendChild(eyeIcon);
      // Append structure
      wrapper.appendChild(tile);
      wrapper.appendChild(eyeBadge);
      grid.appendChild(wrapper);
    });

    function showModal(seriesGroup) {
      document.body.classList.add("modal-open");
      const modal = document.getElementById("booksModal");
      const modalOverlay = document.getElementById("modalOverlay");
      const modalContent = document.getElementById("modalContent");

      // Clear modal content
      modalContent.innerHTML = "";

      // Add series title
      const seriesHeading = document.createElement("h3");
      seriesHeading.className = "modal-series-title";
      seriesHeading.textContent = seriesGroup.series;
      modalContent.appendChild(seriesHeading);

      // Create the book grid
      const booksGrid = document.createElement("div");
      booksGrid.className = "books-grid";

      seriesGroup.books.forEach((book) => {
        // Create a wrapper for positioning
        const wrapper = document.createElement("div");
        wrapper.className = "tile-wrapper";
        wrapper.style.position = "relative";

        const bookTile = document.createElement("div");
        bookTile.className = "book-tile";

        const bookItem = {
          type: "book",
          title: book.title,
          series: seriesGroup.series,
        };

        const isHiddenBook = isCurrentlyHidden(bookItem);
        if (isHiddenBook) {
          bookTile.classList.add("series-mask");
        }

        // Eye badge wrapper
        const eyeBadge = document.createElement("div");
        eyeBadge.className = "eye-badge";

        const eyeIcon = document.createElement("img");
        eyeIcon.className = "eye-icon";

        if (isHiddenBook) {
          bookTile.classList.add("series-mask");
        }
        eyeIcon.src = isHiddenBook
          ? "../assets/eye-closed.svg"
          : "../assets/eye-open.svg";
        eyeIcon.alt = "Toggle visibility";
        eyeIcon.title = "Click to hide / show this book";

        // Toggle mask and icon on click
        eyeIcon.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleVisibility({
            type: "book",
            series: seriesGroup.series,
            title: book.title,
            asin: book.asin,
          });
          const isClosed = eyeIcon.src.includes("eye-closed.svg");
          eyeIcon.src = isClosed
            ? "../assets/eye-open.svg"
            : "../assets/eye-closed.svg";
          bookTile.classList.toggle("series-mask");
        });

        eyeBadge.appendChild(eyeIcon);
        wrapper.appendChild(eyeBadge);

        // Book image link
        const bookLink = document.createElement("a");
        bookLink.href = book.link;
        bookLink.target = "_blank";
        bookLink.rel = "noopener noreferrer";

        const bookImg = document.createElement("img");
        bookImg.src = book.imageUrl;
        bookImg.alt = book.title;

        bookLink.appendChild(bookImg);
        bookTile.appendChild(bookLink);

        // Book title
        const bookTitle = document.createElement("div");
        bookTitle.className = "book-title";
        bookTitle.textContent = book.title;
        bookTile.appendChild(bookTitle);

        // Position badge
        if (book.series?.[0]?.position) {
          const posBadge = document.createElement("div");
          posBadge.className = "series-badge";
          posBadge.textContent = `#${book.series[0].position}`;
          bookTile.appendChild(posBadge);
        }

        wrapper.appendChild(bookTile);
        booksGrid.appendChild(wrapper);
      });

      modalContent.appendChild(booksGrid);

      // Show modal and overlay
      modal.classList.add("active");
      modalOverlay.classList.add("active");
    }

    function closeModal() {
      document.body.classList.remove("modal-open");
      modal.classList.remove("active");
      modalOverlay.classList.remove("active");
      modalContent.innerHTML = "";
    }

    closeBtn.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", closeModal);
  }

  function renderResults(uniqueAll, uniqueAudible, groupedBySeries) {
    setMessage(""); // Clear progress messages
    document.getElementById("message").style.display = "none";
    renderSeriesTiles(groupedBySeries);
    console.log("Unique to seriesAllASIN:", uniqueAll);
    console.log("Unique to seriesAudibleASIN:", uniqueAudible);
    console.log("Grouped by Series:", groupedBySeries);
  }

  // Helpers
  function getHiddenItems() {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("hiddenItems="));
    if (!cookie) return [];
    try {
      const json = decodeURIComponent(cookie.split("=")[1]);
      return JSON.parse(json).hiddenItems || [];
    } catch (e) {
      return [];
    }
  }

  function saveHiddenItems(hiddenItems) {
    const value = encodeURIComponent(JSON.stringify({ hiddenItems }));
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    document.cookie = `hiddenItems=${value}; expires=${expiry.toUTCString()}; path=/`;
  }

  // Check if a series/book is hidden
  function isCurrentlyHidden(item) {
    const hiddenItems = getHiddenItems();
    return hiddenItems.some(
      (h) =>
        h.type === item.type &&
        h.series === item.series &&
        (item.type === "series" || h.title === item.title)
    );
  }

  function toggleVisibility(item, shouldRefresh = true) {
    const hiddenItems = getHiddenItems();
    const index = hiddenItems.findIndex(
      (h) =>
        h.type === item.type &&
        h.series === item.series &&
        (item.type === "series" || h.title === item.title)
    );

    if (index > -1) {
      hiddenItems.splice(index, 1); // remove
    } else {
      hiddenItems.push(item); // add
    }

    saveHiddenItems(hiddenItems);
    if (shouldRefresh) renderVisibilityPanel(); // update panel view only if requested
  }

  // Render the panel
  function renderVisibilityPanel() {
    const hiddenItems = getHiddenItems();
    const seriesContainer = document.getElementById("hiddenSeries");
    const booksContainer = document.getElementById("hiddenBooks");

    seriesContainer.innerHTML = "";
    booksContainer.innerHTML = "";

    hiddenItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "visibility-item";

      const label = document.createElement("span");
      label.textContent =
        item.type === "book" ? `${item.series} - ${item.title}` : item.series;

      const toggleIcon = document.createElement("img");
      const isHidden = isCurrentlyHidden(item);
      toggleIcon.src = isHidden
        ? "../assets/eye-closed.svg"
        : "../assets/eye-open.svg";
      toggleIcon.className = "eye-icon";
      toggleIcon.title = isHidden ? "Click to show" : "Click to hide";

      // Toggle icon and cookie, but don't remove row
      toggleIcon.addEventListener("click", () => {
        toggleVisibility(item, false);

        const stillHidden = isCurrentlyHidden(item);

        // Update visibility menu icon and title
        toggleIcon.src = stillHidden
          ? "../assets/eye-closed.svg"
          : "../assets/eye-open.svg";
        toggleIcon.title = stillHidden ? "Click to show" : "Click to hide";

        // Target tiles to apply/remove mask and sync eye icon
        if (item.type === "series") {
          const seriesTiles = document.querySelectorAll(".series-tile");
          seriesTiles.forEach((tile) => {
            const title = tile.querySelector(".series-title")?.textContent;
            if (title === item.series) {
              // Toggle mask
              tile.classList.toggle("series-mask", stillHidden);

              // Update tile's eye icon
              const icon = tile
                .closest(".tile-wrapper")
                ?.querySelector(".eye-icon");
              if (icon) {
                icon.src = stillHidden
                  ? "../assets/eye-closed.svg"
                  : "../assets/eye-open.svg";
              }
            }
          });
        } else if (item.type === "book") {
          const seriesTitle = document.querySelector(
            ".modal-series-title"
          )?.textContent;
          const bookTiles = document.querySelectorAll(".book-tile");

          bookTiles.forEach((tile) => {
            const title = tile.querySelector(".book-title")?.textContent;
            if (title === item.title && item.series === seriesTitle) {
              // Toggle mask
              tile.classList.toggle("series-mask", stillHidden);

              // Update tile's eye icon
              const icon = tile
                .closest(".tile-wrapper")
                ?.querySelector(".eye-icon");
              if (icon) {
                icon.src = stillHidden
                  ? "../assets/eye-closed.svg"
                  : "../assets/eye-open.svg";
              }
            }
          });
        }
      });

      row.appendChild(label);
      row.appendChild(toggleIcon);

      if (item.type === "book") {
        booksContainer.appendChild(row);
      } else {
        seriesContainer.appendChild(row);
      }
    });
  }

  // Modal open/close logic
  document.getElementById("settingsToggle").addEventListener("click", () => {
    document.getElementById("visibilityManager").classList.add("active");
    document.getElementById("visibilityOverlay").classList.add("active");
    renderVisibilityPanel();
  });

  document
    .getElementById("closeVisibilityManager")
    .addEventListener("click", () => {
      document.getElementById("visibilityManager").classList.remove("active");
      document.getElementById("visibilityOverlay").classList.remove("active");
    });

  document.getElementById("visibilityOverlay").addEventListener("click", () => {
    document.getElementById("visibilityManager").classList.remove("active");
    document.getElementById("visibilityOverlay").classList.remove("active");
  });
});
