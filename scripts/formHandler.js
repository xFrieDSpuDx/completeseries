// formHandler.js

/**
 * Collects and returns form data from login inputs.
 * @returns {Object} formData - Contains serverUrl, username, password, region, and checkbox options.
 */
export function getFormData() {
  return {
    serverUrl: document.getElementById("serverUrl").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    region: document.getElementById("audibleRegion").value,
    onlyUnabridged: document.getElementById("filterUnabridged").checked,
    includeSubSeries: document.getElementById("includeSubSeries").checked,
    ignoreMultiBooks: document.getElementById("ignoreMultiBooks").checked,
    ignoreNoPositionBooks: document.getElementById("ignoreNoPositionBooks").checked,
    ignoreSubPositionBooks: document.getElementById("ignoreSubPositionBooks").checked,
    ignoreFutureDateBooks: document.getElementById("ignoreFutureDateBooks").checked,
    ignorePastDateBooks: document.getElementById("ignorePastDateBooks").checked,
    ignoreTitleSubtitle: document.getElementById("ignoreTitleSubtitle").checked,
    ignoreSameSeriesPosition: document.getElementById("ignoreSameSeriesPosition").checked,
    ignoreTitleSubtitleInMissingArray: document.getElementById("ignoreTitleSubtitleInMissingArray").checked,
    ignoreSameSeriesPositionInMissingArray: document.getElementById("ignoreSameSeriesPositionInMissingArray").checked,
  };
}

/**
 * Validates form input and shows inline error messages if needed.
 * @param {Object} data - Form data object.
 * @returns {boolean} Whether the form is valid.
 */
export function validateForm(data) {
  let isValid = true;

  if (!data.serverUrl) {
    document.getElementById("urlError").textContent = "Server URL is required.";
    isValid = false;
  }
  if (!data.username) {
    document.getElementById("usernameError").textContent = "Username is required.";
    isValid = false;
  }
  if (!data.password) {
    document.getElementById("passwordError").textContent = "Password is required.";
    isValid = false;
  }

  return isValid;
}

/**
 * Clears all error messages in the login form.
 */
export function clearErrors() {
  document.getElementById("urlError").textContent = "";
  document.getElementById("usernameError").textContent = "";
  document.getElementById("passwordError").textContent = "";
}