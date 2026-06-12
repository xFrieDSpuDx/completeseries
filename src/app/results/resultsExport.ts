import type { ScanResult } from "../../features/scan/runLibraryScan";

/**
 * Purpose: Download the current missing-book results as a CSV file.
 *
 * @param result - Completed scan result to export.
 * @returns Nothing. The browser receives a generated CSV download.
 */
export function exportMissingBooksCsv(result: ScanResult): void {
  downloadTextFile("complete-series-missing-books.csv", buildMissingBooksCsv(result), "text/csv");
}

/**
 * Purpose: Download the current missing-book results as a JSON file.
 *
 * @param result - Completed scan result to export.
 * @returns Nothing. The browser receives a generated JSON download.
 */
export function exportMissingBooksJson(result: ScanResult): void {
  downloadTextFile(
    "complete-series-missing-books.json",
    JSON.stringify(result.missingGroups, null, 2),
    "application/json"
  );
}

/**
 * Purpose: Build a CSV representation of every visible missing book.
 *
 * @param result - Completed scan result to export.
 * @returns CSV text with one row per visible missing book.
 */
export function buildMissingBooksCsv(result: ScanResult): string {
  const rows = [
    [
      "Series",
      "Series ASIN",
      "Title",
      "Subtitle",
      "ASIN",
      "Authors",
      "Narrators",
      "Position",
      "Release Date",
      "Region",
      "Link",
      "Merged From",
      "Why Shown",
    ],
  ];

  for (const group of result.missingGroups) {
    for (const book of group.books) {
      const diagnostic = group.diagnosticsByAsin[book.asin];

      rows.push([
        group.seriesName,
        group.seriesAsin,
        book.title,
        book.subtitle ?? "",
        book.asin,
        book.authors.join("; "),
        book.narrators.join("; "),
        book.series.map((series) => `${series.name} #${series.position ?? ""}`).join("; "),
        book.releaseDate ?? "",
        book.region ?? "",
        book.link ?? "",
        group.mergedFrom?.map((source) => source.seriesName).join(" | ") ?? "",
        diagnostic?.shownBecause.join(" | ") ?? "",
      ]);
    }
  }

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/**
 * Purpose: Escape one CSV cell according to common spreadsheet import rules.
 *
 * @param value - Raw cell value.
 * @returns A safely escaped CSV cell.
 */
function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Purpose: Trigger a browser download for generated text content.
 *
 * @param filename - Download filename.
 * @param text - File body text.
 * @param mimeType - Browser MIME type for the generated file.
 * @returns Nothing. A temporary object URL is created and revoked.
 */
function downloadTextFile(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);

  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
