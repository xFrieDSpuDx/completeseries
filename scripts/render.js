// render.js
import {
  isCurrentlyHidden,
  toggleHiddenItem,
  getHiddenItems,
  toggleHiddenItemVisibilityMenu,
  totalHiddenInSeries,
} from "./visibility.js";
import { showBooksModal, adjustModalWidth, toggleElementVisibilityFullEntity } from "../utils/uiFeedback.js";
/**
 * Entry point to render all series and book tiles.
 * @param {Array} groupedMissingBooks - Array of series objects with missing books.
 */
export function renderSeriesAndBookTiles(groupedMissingBooks) {
  const outputElement = getHTMLElement("seriesOutput");
  const titleContent = getTitleContent(groupedMissingBooks);

  // Add a title header
  addTextElement(titleContent, "h2", outputElement);

  // Create the grid container for the series tiles
  const gridContainer = addSeriesGridContainer(outputElement);

  // Render each series tile
  for (const seriesContent of groupedMissingBooks) {
    generateSeriesTiles(seriesContent, gridContainer);
  }
}

/**
 * Gets an HTML element by ID.
 * @param {string} elementId - The ID of the element to retrieve.
 * @returns {HTMLElement}
 */
function getHTMLElement(elementId) {
  return document.getElementById(elementId);
}

/**
 * Adds a text element like <h2>, <div>, etc. to the DOM.
 * @param {string} textContent - The content to insert.
 * @param {string} textStyle - The tag name (e.g. 'h2', 'div').
 * @param {HTMLElement} parentElement - The parent to append to.
 */
function addTextElement(textContent, textStyle, parentElement) {
  const textElement = document.createElement(textStyle);
  textElement.textContent = textContent;
  parentElement.appendChild(textElement);
}

/**
 * Creates a <div> element and sets properties from a given object.
 * @param {Object} divObject - Object with property names and values.
 * @param {HTMLElement} parentElement - Where to append the div.
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
 * @param {Object} imageObject - Object of attributes (e.g. src, alt).
 * @param {HTMLElement} parentElement - Where to append the image.
 * @returns {HTMLImageElement}
 */
function addImageElement(imageObject, parentElement) {
  const imageElement = document.createElement("img");
  Object.assign(imageElement, imageObject);
  parentElement.appendChild(imageElement);
  return imageElement;
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

function generateBookTiles(seriesContent) {
  let booksModalContainer = document.getElementById("modalContent");
  // Empty books modal content
  emptyDivContent(booksModalContainer);
  const seriesTitle = seriesContent.series;
  // Add a series header
  addTextElement(seriesTitle, "h3", booksModalContainer);
  // Create the grid container for the book tiles
  const gridContainer = addSeriesGridContainer(booksModalContainer);
  // Render each book tile
  for (const bookContent of seriesContent.books) {
    const bookTitle = bookContent.title;
    const hideItemObject = hideItemObjectBuilder(
      bookContent,
      seriesTitle,
      "book"
    );
    const seriesArray = bookContent.series;
    const isHidden = isCurrentlyHidden(hideItemObject);
    if (isHidden) {
      continue;
    }
    const tileWrapper = addTileWrapper(bookContent, gridContainer);
    const tileContainer = addSeriesTile(tileWrapper);

    const seriesPositionValue = getPositionBySeriesName(seriesArray, seriesTitle);

    addSeriesBadge(tileContainer, seriesPositionValue);
    addSeriesImage(tileContainer, bookContent, bookTitle);
    addSeriesTitle(tileContainer, bookTitle);
    const eyeBadge = addEyeBadge(tileContainer);
    addEyeIcon(eyeBadge, tileWrapper, hideItemObject, isHidden);
  }
}

/**
 * Finds the position value for a given series name.
 * Returns "N/A" if the value is null, undefined, or the series is not found.
 *
 * @param {Array<Object>} seriesArray - The array of series objects.
 * @param {string} seriesName - The name of the series to match.
 * @returns {string} - The position value or "N/A" if not available.
 */
function getPositionBySeriesName(seriesArray, seriesName) {
  const match = seriesArray.find(series => series.name === seriesName);
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
      //window.open(metaData.link, "_blank").focus();
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

function emptyDivContent(divElement) {
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
  let missingBooksBadge = parentTile.querySelector(".series-badge");
  let visibleMissingBooks = parentTile.querySelector(".series-badge").innerHTML;

  if (isClosed) {
    missingBooksBadge.innerHTML = Number(visibleMissingBooks) + 1;
    toggleElementVisibilityFullEntity(parentTile.parentElement, true);
  } else {
    missingBooksBadge.innerHTML = Number(visibleMissingBooks) - 1;
    toggleElementVisibilityFullEntity(parentTile.parentElement, false);
  }
}

function openBookModal(metaData, originElement) {
  const modal = document.getElementById("bookDetailModal");
  const overlay = document.getElementById("bookDetailModalOverlay");
  const content = document.getElementById("bookDetailModalContent");

  // Populate modal with metadata content
  content.innerHTML = `
    <h2>${metaData.title}</h2>
    <p>${metaData.author}</p>
    <p>${metaData.description || "No description available."}</p>
    <a href="${metaData.link}" target="_blank">View on Audible</a>
  `;

  // Get origin position
  const rect = originElement.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  modal.style.transform = `translate(${rect.left}px, ${rect.top + scrollTop}px) scale(0.2)`;
  modal.style.opacity = "0";
  modal.classList.add("active");

  // Force reflow before animating
  requestAnimationFrame(() => {
    modal.style.transition = "transform 0.4s ease, opacity 0.4s ease";
    modal.style.transform = "translate(0, 0) scale(1)";
    modal.style.opacity = "1";
  });
}

export function closeBookModal() {
  const modal = document.getElementById("bookDetailModal");
  modal.classList.remove("active");
  modal.style.transition = "none";
}
