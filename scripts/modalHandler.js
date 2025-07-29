import { emptyDivContent } from "./elementFactory.js";
import { extractFormattedBookInfo, calculateModalTransform } from "./modalUtils.js";
/**
 * Returns the current transform string used to animate the book modal
 * from its origin (usually a clicked tile) to the center of the screen.
 *
 * @returns {string|null} The transform CSS string used for modal animation.
 */
export let bookDetailModalAnchor = null;

/**
 * Builds the full HTML markup for the book detail modal.
 *
 * @param {Object} bookData - Original book metadata.
 * @param {Object} info - The formatted info object returned by extractFormattedBookInfo().
 * @returns {string} - Complete innerHTML for the modal content.
 */
function buildModalContent(bookData, info) {
  return `
    <div class="book-modal-header">
      <a class="audible-btn" href="${bookData.link}" target="_blank" rel="noopener">View on Audible</a>
    </div>
    <div class="book-modal-main">
      <div class="book-modal-image">
        <img src="${bookData.imageUrl}" alt="${bookData.title}" />
      </div>
      <div class="book-modal-info">
        <div class="book-modal-title">
          <h2>${bookData.title}</h2>
          ${bookData.subtitle ? `<h3 class="subtitle">${bookData.subtitle}</h3>` : ""}
        </div>
        <div class="book-modal-info-stacked">
          <div><span class="section-header">Authors:</span> <span class="section-content">${info.authors}</span></div>
          <div><span class="section-header">Narrator:</span> <span class="section-content">${info.narrators}</span></div>
          <div><span class="section-header">Genres:</span> <span class="section-content">${info.genres}</span></div>
          <div><span class="section-header">Publisher:</span> <span class="section-content">${info.publisher}</span></div>
        </div>
        <div class="book-modal-info-inline">
          <span><span class="section-header">Release Date:</span> <span class="section-content">${info.releaseDate}</span><span class="info-separator">|</span></span>
          <span><span class="section-header">Length:</span> <span class="section-content">${info.length}</span><span class="info-separator">|</span></span>
          <span><span class="section-header">Rating:</span> <span class="section-content">${info.rating}</span></span>
        </div>
      </div>
    </div>
    <div class="book-modal-summary">
      <div class="section-header">Summary:</div>
      <div class="section-content">${info.summary}</div>
    </div>
  `;
}

/**
 * Displays the book detail modal for a given book.
 * Handles content rendering and animated transition from the clicked tile.
 *
 * @param {Object} bookData - The book metadata to display.
 * @param {HTMLElement} sourceTile - The tile element that triggered the modal.
 */
export function openBookModal(bookData, sourceTile) {

  const modalElement = document.getElementById("bookDetailModal");
  const modalOverlay = document.getElementById("bookDetailModalOverlay");
  const modalContentElement = document.getElementById("bookDetailModalContent");

   emptyDivContent(modalContentElement);

  const formatted = extractFormattedBookInfo(bookData);
  modalContentElement.innerHTML = buildModalContent(bookData, formatted);

  const { transform, anchor } = calculateModalTransform(sourceTile, modalElement);
  modalElement.style.transition = "none";
  modalElement.style.transform = transform;
  bookDetailModalAnchor = anchor;

  modalElement.style.opacity = "0";
  modalElement.style.pointerEvents = "auto";
  modalElement.classList.remove("active");

  // Force reflow to enable transition
  void modalElement.offsetWidth;

  // Animate to center
  modalElement.style.transition =
    "transform 0.5s cubic-bezier(0.77,0,0.175,1), opacity 0.5s cubic-bezier(0.77,0,0.175,1)";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("active");
    modalElement.classList.add("active");

    if (window.innerWidth > 950) {
      modalElement.style.transform = "translateX(-50%) scale(1)";
    }

    modalElement.style.opacity = "0.95";
  });
}