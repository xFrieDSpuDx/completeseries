// --- Imports ---
import {
  isCurrentlyHidden,
  toggleHiddenItem,
  getHiddenItems,
  toggleHiddenItemVisibilityMenu,
  totalHiddenInSeries,
} from "./visibility.js";
import {
  showBooksModal,
  adjustModalWidth,
  toggleElementVisibilityFullEntity,
} from "../utils/uiFeedback.js";

// --- Modal Anchor State ---
let bookDetailModalAnchor = null;

/**
 * Returns the current modal anchor transform string.
 * @returns {string|null}
 */
export function getBookModalAnchor() {
  return bookDetailModalAnchor;
}

// ================== SERIES & BOOK TILE RENDERING ==================

/**
 * Entry point to render all series and book tiles.
 * @param {Array} groupedMissingBooks - Array of series objects with missing books.
 */
export function renderSeriesAndBookTiles(groupedMissingBooks) {
  const outputElement = getHTMLElement("seriesOutput");
  const titleContent = getTitleContent(groupedMissingBooks);

  addTextElement(titleContent, "h2", outputElement);
  const gridContainer = addSeriesGridContainer(outputElement);

  for (const seriesContent of groupedMissingBooks) {
    generateSeriesTiles(seriesContent, gridContainer);
  }
}

/**
 * Renders all book tiles for a given series in the modal.
 * @param {Object} seriesContent - Series object with books.
 */
function generateBookTiles(seriesContent) {
  let booksModalContainer = document.getElementById("modalContent");
  emptyDivContent(booksModalContainer);

  const seriesTitle = seriesContent.series;
  addTextElement(seriesTitle, "h3", booksModalContainer);

  const gridContainer = addSeriesGridContainer(booksModalContainer);

  for (const bookContent of seriesContent.books) {
    const bookTitle = bookContent.title;
    const hideItemObject = hideItemObjectBuilder(
      bookContent,
      seriesTitle,
      "book"
    );
    const seriesArray = bookContent.series;
    const isHidden = isCurrentlyHidden(hideItemObject);
    if (isHidden) continue;

    const tileWrapper = addTileWrapper(bookContent, gridContainer);
    const tileContainer = addSeriesTile(tileWrapper);

    const seriesPositionValue = getPositionBySeriesName(
      seriesArray,
      seriesTitle
    );

    addSeriesBadge(tileContainer, seriesPositionValue);
    addSeriesImage(tileContainer, bookContent, bookTitle);
    addSeriesTitle(tileContainer, bookTitle);
    const eyeBadge = addEyeBadge(tileContainer);
    addEyeIcon(eyeBadge, tileWrapper, hideItemObject, isHidden);
  }
}

/**
 * Generates and appends the full structure for a single series tile.
 * @param {Object} seriesContent - Contains series title and book metadata.
 * @param {HTMLElement} outputElement - Where to place the tile.
 */
function generateSeriesTiles(seriesContent, outputElement) {
  const missingBooks = seriesContent.books.length;
  const seriesTitle = seriesContent.series;
  const bookMetadata = seriesContent.books[0];
  const hideItemObject = hideItemObjectBuilder(
    bookMetadata,
    seriesTitle,
    "series"
  );
  const isHidden = isCurrentlyHidden(hideItemObject);

  const tileWrapper = addTileWrapper(seriesContent, outputElement);
  const tileContainer = addSeriesTile(tileWrapper);

  const totalHiddenBooks = totalHiddenInSeries(seriesTitle);
  addSeriesBadge(tileContainer, missingBooks - totalHiddenBooks);
  addSeriesImage(tileContainer, bookMetadata, seriesTitle);
  addSeriesTitle(tileContainer, seriesTitle);

  const eyeBadge = addEyeBadge(tileContainer);
  addEyeIcon(eyeBadge, tileWrapper, hideItemObject, isHidden);
}

// ================== DOM UTILITY FUNCTIONS ==================

/**
 * Gets an HTML element by ID.
 * @param {string} elementId
 * @returns {HTMLElement}
 */
function getHTMLElement(elementId) {
  return document.getElementById(elementId);
}

/**
 * Adds a text element like <h2>, <div>, etc. to the DOM.
 * @param {string} textContent
 * @param {string} textStyle
 * @param {HTMLElement} parentElement
 */
function addTextElement(textContent, textStyle, parentElement) {
  const textElement = document.createElement(textStyle);
  textElement.textContent = textContent;
  parentElement.appendChild(textElement);
}

/**
 * Creates a <div> element and sets properties from a given object.
 * @param {Object} divObject
 * @param {HTMLElement} parentElement
 * @returns {HTMLDivElement}
 */
function addDivElement(divObject, parentElement) {
  const divElement = document.createElement("div");
  Object.assign(divElement, divObject);
  parentElement.appendChild(divElement);
  return divElement;
}

/**
 * Creates an <img> element with given attributes.
 * @param {Object} imageObject
 * @param {HTMLElement} parentElement
 * @returns {HTMLImageElement}
 */
function addImageElement(imageObject, parentElement) {
  const imageElement = document.createElement("img");
  Object.assign(imageElement, imageObject);
  parentElement.appendChild(imageElement);
  return imageElement;
}

// ================== TILE STRUCTURE HELPERS ==================

function addSeriesGridContainer(parentElement) {
  return addDivElement({ className: "series-grid" }, parentElement);
}

function addTileWrapper(metaData, parentElement) {
  const tileWrapper = addDivElement(
    { className: "tile-wrapper" },
    parentElement
  );
  tileWrapper.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    if (metaData.hasOwnProperty("books")) {
      generateBookTiles(metaData);
      adjustModalWidth(metaData.books.length);
      showBooksModal();
    } else {
      openBookModal(metaData, tileWrapper);
    }
  });
  return tileWrapper;
}

function addSeriesTile(parentElement) {
  return addDivElement({ className: "series-tile" }, parentElement);
}

function addSeriesBadge(parentElement, textValue) {
  return addDivElement(
    { className: "series-badge", textContent: textValue },
    parentElement
  );
}

function addSeriesImage(parentElement, bookMetadata, altText) {
  return addImageElement(
    {
      className: "series-image",
      src: bookMetadata.imageUrl,
      alt: altText,
    },
    parentElement
  );
}

function addSeriesTitle(parentElement, textValue) {
  return addDivElement(
    { className: "series-title", textContent: textValue },
    parentElement
  );
}

function addEyeBadge(parentElement) {
  return addDivElement({ className: "eye-badge" }, parentElement);
}

// ================== EYE ICON & VISIBILITY ==================

function addEyeIcon(
  parentElement,
  maskParent,
  hideItemObject,
  isHidden,
  isVisibilityMenu
) {
  const eyeIconStatus = isHidden
    ? "../assets/eye-closed.svg"
    : "../assets/eye-open.svg";
  let eyeIcon = addImageElement(
    {
      className: "eye-icon",
      src: eyeIconStatus,
      alt: "Toggle visibility",
      title: "Click to hide / unhide this series",
    },
    parentElement
  );

  eyeIcon.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    toggleHiddenItem(hideItemObject, eyeIcon);
    const isClosed = eyeIcon.src.includes("eye-closed.svg");
    eyeIcon.src = isClosed
      ? "../assets/eye-open.svg"
      : "../assets/eye-closed.svg";
    toggleTileMask(eyeIcon, maskParent);

    const parentTile = getItemSeries(hideItemObject);

    if (isVisibilityMenu && hideItemObject.type === "series") {
      if (parentTile) {
        parentTile.querySelector(".eye-icon").click();
      } else {
        toggleHiddenItemVisibilityMenu(eyeIcon);
      }
    } else {
      updateSeriesMissingBookNumber(hideItemObject, isClosed);
    }
  });

  if (isHidden) {
    toggleTileMask(eyeIcon, maskParent);
  }

  return eyeIcon;
}

function toggleTileMask(eyeIcon, maskParent) {
  eyeIcon.classList.toggle("eyeClosed");
  if (maskParent) {
    maskParent.classList.toggle("series-mask");
  }
}

export function emptyDivContent(divElement) {
  divElement.innerHTML = "";
}

function hideItemObjectBuilder(metaData, seriesTitle, itemType) {
  return {
    type: itemType,
    series: seriesTitle,
    asin: metaData.seriesAsin,
    title: metaData.title,
  };
}

// ================== HIDDEN ITEMS MENU ==================

/**
 * Populates the hidden items menu with series and books.
 */
export function populateHiddenItemsMenu() {
  const hiddenSeriesHTMLContainer = document.getElementById("hiddenSeries");
  const hiddenBooksHTMLContainer = document.getElementById("hiddenBooks");
  hiddenSeriesHTMLContainer.innerHTML = "";
  hiddenBooksHTMLContainer.innerHTML = "";
  const hiddenItems = getHiddenItems();

  for (const item of hiddenItems) {
    const type = item.type;
    let hiddenItemDivContainer;
    if (type === "series") {
      hiddenItemDivContainer = addDivElement(
        { className: "visibility-item" },
        hiddenSeriesHTMLContainer
      );
      addTextElement(item.series, "span", hiddenItemDivContainer);
    } else {
      hiddenItemDivContainer = addDivElement(
        { className: "visibility-item" },
        hiddenBooksHTMLContainer
      );
      const hiddenBookText = item.series + " - " + item.title;
      addTextElement(hiddenBookText, "span", hiddenItemDivContainer);
    }
    addEyeIcon(hiddenItemDivContainer, false, item, true, true);
  }
}

// ================== SERIES UTILITY ==================

/**
 * Finds the position value for a given series name.
 * Returns "N/A" if not available.
 * @param {Array<Object>} seriesArray
 * @param {string} seriesName
 * @returns {string}
 */
function getPositionBySeriesName(seriesArray, seriesName) {
  const match = seriesArray.find((series) => series.name === seriesName);
  return match && match.position != null ? match.position : "N/A";
}

/**
 * Generates a user-friendly title based on how many series exist.
 * @param {Array} groupedMissingBooks
 * @returns {string}
 */
function getTitleContent(groupedMissingBooks) {
  return `You have ${groupedMissingBooks.length} series with missing books.`;
}

function getItemSeries(hideItemObject) {
  const seriesTiles = document.querySelectorAll(".series-tile");
  let foundTile = false;
  seriesTiles.forEach((tile) => {
    const title = tile.querySelector(".series-title")?.textContent;

    if (title === hideItemObject.series) {
      foundTile = tile;
      return;
    }
  });

  return foundTile;
}

function updateSeriesMissingBookNumber(hideItemObject, isClosed) {
  if (hideItemObject.type === "series") {
    return;
  }

  const parentTile = getItemSeries(hideItemObject);

  if (!parentTile) {
    return; // No parent tile found, nothing to update
  }

  let missingBooksBadge = parentTile.querySelector(".series-badge");
  let visibleMissingBooks = parentTile.querySelector(".series-badge").innerHTML;

  if (isClosed) {
    missingBooksBadge.innerHTML = Number(visibleMissingBooks) + 1;
    toggleElementVisibilityFullEntity(parentTile.parentElement, true);
  } else {
    missingBooksBadge.innerHTML = Number(visibleMissingBooks) - 1;

    if (Number(visibleMissingBooks) === 1) {
      toggleElementVisibilityFullEntity(parentTile.parentElement, false);
    }
  }
}

// ================== MODAL LOGIC ==================

/**
 * Opens the book detail modal with transition from the clicked tile.
 * @param {Object} metaData - Book metadata object.
 * @param {HTMLElement} originElement - The tile element that was clicked.
 */
function openBookModal(metaData, originElement) {
  const modal = document.getElementById("bookDetailModal");
  const overlay = document.getElementById("bookDetailModalOverlay");
  const content = document.getElementById("bookDetailModalContent");

  // Authors
  const authorsHTML =
    metaData.authors && metaData.authors.length
      ? metaData.authors.map((a) => a.name).join(", ")
      : "Unknown";
  // Genres
  const genresHTML =
    metaData.genres && metaData.genres.length
      ? metaData.genres.map((g) => g.name || g).join(", ")
      : "Unknown";
  // Narrators
  const narratorsHTML =
    metaData.narrators && metaData.narrators.length
      ? metaData.narrators.map((n) => n.name || n).join(", ")
      : "Unknown";
  // Publisher
  const publisherHTML = metaData.publisher || "Unknown";
  // Release date
  const releaseDate = metaData.releaseDate
    ? new Date(metaData.releaseDate).toLocaleDateString()
    : "Unknown";
  // Length
  const lengthHTML = metaData.lengthMinutes
    ? Math.round(metaData.lengthMinutes / 60) + " hrs"
    : "Unknown";
  // Rating
  const ratingHTML = metaData.rating ? metaData.rating.toFixed(2) : "N/A";
  // Summary
  const summaryHTML = metaData.summary
    ? metaData.summary
    : `${metaData.description || "No description available."}`;

  // Set modal content
  content.innerHTML = `
    <div class="book-modal-header">
      <a class="audible-btn" href="${
        metaData.link
      }" target="_blank" rel="noopener">View on Audible</a>
    </div>
    <div class="book-modal-main">
      <div class="book-modal-image">
        <img src="${metaData.imageUrl}" alt="${metaData.title}" />
      </div>
      <div class="book-modal-info">
        <div class="book-modal-title">
          <h2>${metaData.title}</h2>
          ${
            metaData.subtitle
              ? `<h3 class="subtitle">${metaData.subtitle}</h3>`
              : ""
          }
        </div>
        <div class="book-modal-info-stacked">
          <div><span class="section-header">Authors:</span> <span class="section-content">${authorsHTML}</span></div>
          <div><span class="section-header">Narrator:</span> <span class="section-content">${narratorsHTML}</span></div>
          <div><span class="section-header">Genres:</span> <span class="section-content">${genresHTML}</span></div>
          <div><span class="section-header">Publisher:</span> <span class="section-content">${publisherHTML}</span></div>
        </div>
        <div class="book-modal-info-inline">
          <span>
            <span class="section-header">Release Date:</span>
            <span class="section-content">${releaseDate}</span>
            <span class="info-separator">|</span>
          </span>
          <span>
            <span class="section-header">Length:</span>
            <span class="section-content">${lengthHTML}</span>
            <span class="info-separator">|</span>
          </span>
          <span>
            <span class="section-header">Rating:</span>
            <span class="section-content">${ratingHTML}</span>
          </span>
        </div>
      </div>
    </div>
    <div class="book-modal-summary">
      <div class="section-header">Summary:</div>
      <div class="section-content">${summaryHTML}</div>
    </div>
  `;

  // --- Transition effect ---
  // Get tile center relative to viewport
  const rect = originElement.getBoundingClientRect();
  const tileCenterX = rect.left + rect.width / 2;
  const tileCenterY = rect.top + rect.height / 2;

  // Get modal center (final position)
  const modalCenterX = window.innerWidth / 2;
  const modalCenterY = window.innerHeight * 0.05 + modal.offsetHeight / 2;

  // Calculate offset from modal center to tile center
  const offsetX = tileCenterX - modalCenterX;
  const offsetY = tileCenterY - modalCenterY;

  // Set initial transform: modal starts at tile center, scaled down
  modal.style.transition = "none";
  modal.style.transform = `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(0)`;
  bookDetailModalAnchor = `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(0)`;
  modal.style.opacity = "0";
  modal.style.pointerEvents = "auto";
  modal.classList.remove("active");

  // Force reflow for transition
  void modal.offsetWidth;

  // Animate to center and scale up
  modal.style.transition =
    "transform 0.5s cubic-bezier(0.77,0,0.175,1), opacity 0.5s cubic-bezier(0.77,0,0.175,1)";
  requestAnimationFrame(() => {
    modal.classList.add("active");
    overlay.classList.add("active");
    modal.style.transform = "translateX(-50%) scale(1)";
    modal.style.opacity = "0.95";
  });
}
