// main.js
import { getFormData, validateForm, clearErrors } from "./formHandler.js";
import { setMessage, showSpinner, hideSpinner, toggleElementVisibility } from "../utils/uiFeedback.js";
import { collectBookMetadata, collectSeriesMetadata } from "../utils/metadataFlow.js";
import { fetchExistingContent } from "./dataFetcher.js";
import { removeHiddenSeries, findMissingBooks, groupBooksBySeries } from "./dataCleaner.js";
import { renderSeriesAndBookTiles, populateHiddenItemsMenu } from "./render.js";
import { initializeUIInteractions } from "./interactions.js";

document.addEventListener("DOMContentLoaded", () => {
  initializeUIInteractions();
  populateHiddenItemsMenu();

  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const formData = getFormData();
    if (!validateForm(formData)) return;

    toggleElementVisibility("form-container", false);
    showSpinner();
    setMessage("Logging in…");

    try {
      // Get the existing series from AudiobookShelf
      let existingContent = await fetchExistingContent(formData);
      // Update user message to show progress
      setMessage("Login successful. Fetching book and series information...");
      // Remove previously hidden books and series
      existingContent = removeHiddenSeries(existingContent);
      // Get book Metadata - Used to get the series ASIN for each book
      const seriesASIN = await collectBookMetadata(
        existingContent.seriesFirstASIN,
        formData.region,
        formData.includeSubSeries
      );
      // Get series Metadata
      const seriesMetadata = await collectSeriesMetadata(
        seriesASIN,
        formData.region
      );
      // Remove existing content from the Audible return
      const missingBooks = findMissingBooks(
        existingContent.seriesAllASIN,
        seriesMetadata
      );
      // Group books by series to make it easier to render
      const groupedMissingBooks = groupBooksBySeries(missingBooks, formData.includeSubSeries);

      renderSeriesAndBookTiles(groupedMissingBooks);

      toggleElementVisibility("form-container", false);
      toggleElementVisibility("message", false);
      hideSpinner();
    } catch (err) {
      console.error(err);
      toggleElementVisibility("form-container", true);
      setMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      hideSpinner();
    }
  });
});
