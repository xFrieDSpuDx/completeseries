import { addImageElement } from "./elementFactory.js";
import { handleEyeIconClick, toggleTileMask } from "./tileVisibilityUpdater.js";
import { toggleElementVisibilityFullEntity } from "./uiFeedback.js";

/**
 * Adds an eye icon to an element, enabling visibility toggle interaction.
 *
 * @param {HTMLElement} parentElement - Where to attach the icon.
 * @param {HTMLElement|false} maskParent - The tile container to mask when hidden.
 * @param {Object} hiddenItem - Metadata describing the item to hide/show.
 * @param {boolean} isHidden - Whether the item is initially hidden.
 * @param {boolean} isInVisibilityMenu - Whether this icon is in the side visibility menu.
 * @returns {HTMLImageElement} The final, interactive eye icon element.
 */
export function addEyeIcon(parentElement, maskParent, hiddenItem, isHidden, isInVisibilityMenu) {
  const eyeIcon = createEyeIconElement(isHidden);
  parentElement.appendChild(eyeIcon);

  handleEyeIconClick(eyeIcon, maskParent, hiddenItem, isInVisibilityMenu);

  if (isHidden) {
    toggleTileMask(eyeIcon, maskParent);
    if (hiddenItem.type === "series" && !isInVisibilityMenu)
      toggleElementVisibilityFullEntity(maskParent, !isHidden);
  }

  return eyeIcon;
}

/**
 * Creates an eye icon <img> element with the appropriate icon and tooltip.
 *
 * @param {boolean} isHidden - Whether the item is initially hidden.
 * @returns {HTMLImageElement} The configured eye icon element.
 */
function createEyeIconElement(isHidden) {
  return addImageElement(
    {
      className: "eye-icon",
      src: isHidden ? "../assets/eye-closed.svg" : "../assets/eye-open.svg",
      alt: "Toggle visibility",
      title: "Click to hide / unhide this series",
    },
    document.createDocumentFragment() // temporarily created, then appended to real parent
  );
}
