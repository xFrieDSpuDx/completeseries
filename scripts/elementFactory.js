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
  return textElement;
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

/**
 * Add (or return) an <option> element on a given <select>.
 * @param {HTMLSelectElement} selectElement
 * @param {{ value:string, text:string, selected?:boolean }} option
 * @returns {HTMLOptionElement}
 */
export function addOptionElement(selectElement, { value, text, selected = false }) {
  const optionElement = document.createElement("option");
  optionElement.value = String(value);
  optionElement.textContent = String(text);
  if (selected) optionElement.selected = true;
  selectElement.appendChild(optionElement);
  return optionElement;
}

/**
 * Replace all options on a <select>, preserving the current selection if possible.
 * @param {HTMLSelectElement} selectElement
 * @param {Array<{ value:string, text:string }>} options
 * @param {boolean} [preserveSelection=true]
 * @returns {void}
 */
export function setSelectOptions(selectElement, options, preserveSelection = true) {
  const previousValue = preserveSelection ? selectElement.value : "";
  selectElement.innerHTML = "";
  for (const opt of options) {
    addOptionElement(selectElement, { value: opt.value, text: opt.text, selected: false });
  }
  // restore if still present
  const hasPrev = Array.from(selectElement.options).some(o => o.value === previousValue);
  selectElement.value = hasPrev ? previousValue : (selectElement.options[0]?.value ?? "");
}

/**
 * Create one “chip” with a checkbox and label inside a container.
 * @param {{ id:string, value:string, label:string, checked?:boolean }} params
 * @param {HTMLElement} parentElement
 * @returns {{ wrapper:HTMLElement, input:HTMLInputElement, label:HTMLLabelElement }}
 */
export function addChipCheckbox({ id, value, label, checked = false }, parentElement) {
  const wrapper = addDivElement({ className: "dbg-chip" }, parentElement);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.value = value;
  input.checked = checked;
  wrapper.appendChild(input);

  const textLabel = document.createElement("label");
  textLabel.htmlFor = id;
  textLabel.textContent = label;
  wrapper.appendChild(textLabel);

  return { wrapper, input, label: textLabel };
}

/**
 * Create a <table> element, apply optional attributes, append it to a parent, and return it.
 *
 * Side effects: appends the created table to the provided parent element.
 *
 * @param {{ id?: string, className?: string }} [attributes] - Optional attributes for the table.
 * @param {HTMLElement} parentElement - The element to which the table will be appended.
 * @returns {HTMLTableElement} The created table element.
 */
export function addTableElement(attributes, parentElement) {
  const tableElement = document.createElement("table");
  if (attributes?.id) tableElement.id = attributes.id;
  if (attributes?.className) tableElement.className = attributes.className;
  parentElement.appendChild(tableElement);
  return tableElement;
}

/**
 * Create a table section (<thead> or <tbody>), append it to a parent, and return it.
 *
 * Side effects: appends the created section to the provided parent element.
 *
 * @param {"thead"|"tbody"} sectionTagName - The section tag name to create.
 * @param {HTMLTableElement} parentElement - The table element to append the section to.
 * @returns {HTMLTableSectionElement} The created section element.
 */
export function addTableSection(sectionTagName, parentElement) {
  const sectionElement = document.createElement(sectionTagName); // "thead" or "tbody"
  parentElement.appendChild(sectionElement);
  return sectionElement;
}

/**
 * Create a <tr> row, append it to a parent section, and return it.
 *
 * Side effects: appends the created row to the provided parent element.
 *
 * @param {HTMLTableSectionElement} parentElement - The thead/tbody to append the row to.
 * @returns {HTMLTableRowElement} The created table row element.
 */
export function addTableRow(parentElement) {
  const rowElement = document.createElement("tr");
  parentElement.appendChild(rowElement);
  return rowElement;
}

/**
 * Create a header cell (<th>) with text, append it to a parent row, and return it.
 *
 * Side effects: appends the created header cell to the provided parent row.
 *
 * @param {string} headerText - The text content for the header cell.
 * @param {HTMLTableRowElement} parentElement - The row to append the header cell to.
 * @returns {HTMLTableCellElement} The created header cell element.
 */
export function addHeaderCell(headerText, parentElement) {
  const headerCell = document.createElement("th");
  headerCell.textContent = headerText;
  parentElement.appendChild(headerCell);
  return headerCell;
}

/**
 * Create a data cell (<td>) with text, append it to a parent row, and return it.
 *
 * Side effects: appends the created data cell to the provided parent row.
 *
 * @param {string|number|null|undefined} cellText - The text content for the cell.
 * @param {HTMLTableRowElement} parentElement - The row to append the data cell to.
 * @returns {HTMLTableCellElement} The created data cell element.
 */
export function addCell(cellText, parentElement) {
  const dataCell = document.createElement("td");
  dataCell.textContent = cellText ?? "";
  parentElement.appendChild(dataCell);
  return dataCell;
}