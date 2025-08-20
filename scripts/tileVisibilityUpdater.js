import { addTextElement, addDivElement, emptyDivContent } from "./elementFactory.js";
import { getHTMLElement } from "./tileElementFactory.js";
import { getItemSeries } from "./metadataUtils.js";
import { toggleHiddenItem, getHiddenItems, toggleHiddenItemVisibilityMenu } from "./visibility.js";
import { toggleElementVisibilityFullEntity, updateSeriesHeaderText } from "./uiFeedback.js";
import { addEyeIcon } from "./eyeFactory.js";
import { groupedMissingBooks } from "./main.js";
import { renderSeriesAndBookTiles } from "./seriesTileBuilder.js";

/**
 * Attaches a click event handler to toggle visibility state, update icons, and adjust badges.
 *
 * @param {HTMLImageElement} eyeIcon - The eye icon image element.
 * @param {HTMLElement|false} maskParent - The element to apply/remove the visual mask.
 * @param {Object} hiddenItem - The hidden item metadata object.
 * @param {boolean} isInVisibilityMenu - Whether this icon is rendered in the visibility panel.
 */
export function handleEyeIconClick(eyeIcon, maskParent, hiddenItem, isInVisibilityMenu) {
  eyeIcon.addEventListener("click", (event) => {
    event.stopPropagation();

    toggleHiddenItem(hiddenItem, eyeIcon);

    const isNowHidden = eyeIcon.src.includes("eye-closed.svg");
    eyeIcon.src = isNowHidden
      ? "../assets/eye-open.svg"
      : "../assets/eye-closed.svg";

    toggleTileMask(eyeIcon, maskParent);

    const parentTile = getItemSeries(hiddenItem);

    if (isInVisibilityMenu && hiddenItem.type === "series") {
      if (parentTile)
        parentTile.querySelector(".eye-icon")?.click();
      else 
        toggleHiddenItemVisibilityMenu(eyeIcon);
    } else if (hiddenItem.type === "series" && !isInVisibilityMenu) toggleElementVisibilityFullEntity(maskParent, isNowHidden);
    else updateSeriesMissingBookNumber(hiddenItem, isNowHidden);
    
    updateSeriesHeaderText();
  });
}

/**
 * Toggles the visual mask on a tile when its visibility is changed.
 * This includes toggling the eye icon style and optionally the tile background mask.
 *
 * @param {HTMLElement} eyeIcon - The eye icon element whose class indicates open/closed state.
 * @param {HTMLElement|false} maskParent - The parent tile element to apply/remove the mask class.
 */
export function toggleTileMask(eyeIcon, maskParent) {
  eyeIcon.classList.toggle("eyeClosed");

  if (maskParent) 
    maskParent.classList.toggle("series-mask");
}

/**
 * Constructs a standardized object used to represent a hidden book or series.
 * This object is used for tracking visibility state (e.g., in cookies).
 *
 * @param {Object} bookMetadata - Metadata for the book or series anchor item.
 * @param {string} seriesTitle - The title of the series the item belongs to.
 * @param {string} itemType - Either "book" or "series".
 * @returns {Object} A normalised hidden item object with type, series, ASIN, and title.
 */
export function hideItemObjectBuilder(bookMetadata, seriesTitle, itemType) {
  const objectToHide =  {
    type: itemType,
    series: seriesTitle,
    // Use book ASIN for book items, series ASIN for series items
    asin: itemType === "series"
      ? (bookMetadata.seriesAsin ?? bookMetadata.asin)   // series toggle gets series ASIN
      : (bookMetadata.asin ?? bookMetadata.seriesAsin),  // book toggle gets book ASIN
    title: bookMetadata.title,
  };

  return objectToHide;
}

/**
 * Adjusts the numeric content of a badge by a given delta.
 *
 * @param {HTMLElement} badgeElement - The badge DOM element whose number to change.
 * @param {number} delta - The amount to increment or decrement by.
 */
function adjustBadgeCount(badgeElement, delta) {
  const currentValue = Number(badgeElement.innerHTML);
  badgeElement.innerHTML = currentValue + delta;
}

/**
 * Updates the badge count and visibility for a series tile when a book is hidden/unhidden.
 *
 * @param {Object} hideItemObject - Object describing the book (not series) that was toggled.
 * @param {boolean} isClosed - True if the book was just hidden, false if unhidden.
 */
function updateSeriesMissingBookNumber(hideItemObject, isClosed) {
  if (hideItemObject.type === "series")
    return; // Series-level items are not affected

  const parentTile = getItemSeries(hideItemObject);
  if (!parentTile) return;

  const badgeElement = parentTile.querySelector(".series-badge");
  const currentCount = Number(badgeElement.innerHTML);

  if (isClosed) {
    adjustBadgeCount(badgeElement, +1);
    toggleElementVisibilityFullEntity(parentTile.parentElement, true);
  } else {
    if (currentCount === 1) 
      toggleElementVisibilityFullEntity(parentTile.parentElement, false);
    
    adjustBadgeCount(badgeElement, -1);
  }
}

/**
 * Renders the visibility panel listing all hidden series and books.
 * Clears and repopulates the #hiddenSeries and #hiddenBooks containers.
 * Each hidden item includes a name label and a clickable eye icon to toggle visibility.
 */
export function populateHiddenItemsMenu() {
  const hiddenSeriesContainer = document.getElementById("hiddenSeries");
  const hiddenBooksContainer = document.getElementById("hiddenBooks");

  // Clear existing content
  hiddenSeriesContainer.innerHTML = "";
  hiddenBooksContainer.innerHTML = "";

  const hiddenItems = getHiddenItems();

  for (const item of hiddenItems) {
    const isSeries = item.type === "series";
    const container = isSeries ? hiddenSeriesContainer : hiddenBooksContainer;

    const itemWrapper = addDivElement(
      { className: "visibility-item" },
      container
    );

    const labelText = isSeries ? item.series : `${item.series} - ${item.title}`;
    addTextElement(labelText, "span", itemWrapper);

    // Add eye icon with visibility toggling behavior
    addEyeIcon(itemWrapper, false, item, true, true);
  }
}

/**
 * Rebuilds the seriesOutput grid and header when hidden items 
 * are changed. Forces all elements to reset
 */
export function showAllHiddenItems() {
  emptyDivContent(getHTMLElement("seriesOutput"));
  renderSeriesAndBookTiles(groupedMissingBooks);
}
