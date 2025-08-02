/**
 * Creates a text-based HTML element (e.g., h2, div) and appends it to a parent.
 * 
 * @param {string} textContent - The textual content to insert.
 * @param {string} tagName - The tag name to create (e.g., 'h2', 'div').
 * @param {HTMLElement} parentElement - The parent node to append to.
 */
export function addTextElement(textContent, tagName, parentElement) {
  const textElement = document.createElement(tagName);
  textElement.textContent = textContent;
  parentElement.appendChild(textElement);
}

/**
 * Creates a <div> element with the specified attributes and appends it to a parent element.
 *
 * @param {Object} divAttributes - Attributes to assign to the div (e.g. className, textContent).
 * @param {HTMLElement} parentElement - The element to append the new div to.
 * @returns {HTMLDivElement} The created and appended div element.
 */
export function addDivElement(divAttributes, parentElement) {
  const divElement = document.createElement("div");
  Object.assign(divElement, divAttributes);
  parentElement.appendChild(divElement);
  return divElement;
}

/**
 * Creates a checkbox input with a label, appends both to a container, and adds it to the parent.
 *
 * @param {Object} options
 * @param {string} options.id - The ID of the checkbox.
 * @param {string} options.labelText - The text content for the label.
 * @param {boolean} [options.checked=false] - Whether the checkbox is initially checked.
 * @param {HTMLElement} parentElement - The element to append the checkbox container to.
 * @returns {HTMLInputElement} The created checkbox input element.
 */
export function addLabeledCheckbox({ id, labelText, checked = false }, parentElement) {
   const container = document.createElement("label");
  container.className = "library-toggle";
  
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  checkbox.checked = checked;

  const span = document.createElement("span");
  span.textContent = labelText;

  container.appendChild(checkbox);
  container.appendChild(span);
  parentElement.appendChild(container);

  return checkbox;
}

/**
 * Creates an <img> element with the given attributes and appends it to a parent element.
 *
 * @param {Object} imageObject - Attributes to assign to the image (e.g. src, alt, className).
 * @param {HTMLElement} parentElement - The parent element to append the image to.
 * @returns {HTMLImageElement} The created image element.
 */
export function addImageElement(imageObject, parentElement) {
  const imageElement = document.createElement("img");
  Object.assign(imageElement, imageObject);
  parentElement.appendChild(imageElement);
  return imageElement;
}

/**
 * Removes all child content from a given HTML element.
 *
 * @param {HTMLElement} divElement - The element to be cleared.
 */
export function emptyDivContent(divElement) {
  divElement.innerHTML = "";
}