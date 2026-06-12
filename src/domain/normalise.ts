import type { SeriesPosition } from "./audiobook";

/**
 * Purpose: Normalise human-entered text so titles, subtitles, names, and series
 * labels can be compared consistently.
 *
 * @param value - Raw text value from Audiobookshelf or a metadata provider.
 * @returns Lowercase text with diacritics, punctuation, symbols, and duplicate
 * whitespace removed.
 */
export function normaliseText(value: string | null | undefined): string {
  return (value ?? "")
    .toString()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Purpose: Normalise identifier-like values such as ASINs, SKUs, and SKU
 * groups.
 *
 * @param value - Raw identifier value from Audiobookshelf or a metadata
 * provider.
 * @returns Trimmed uppercase identifier text, or an empty string for missing
 * values.
 */
export function normaliseIdentifier(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

/**
 * Purpose: Normalise ISBN values so hyphenated and compact forms compare as the
 * same catalogue identifier.
 *
 * @param value - Raw ISBN value from Audiobookshelf or a metadata provider.
 * @returns Uppercase ISBN text containing only digits and a possible final X.
 */
export function normaliseIsbn(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

/**
 * Purpose: Convert raw series-position metadata into a comparable structure.
 *
 * @param value - Series position supplied as text, a number, or an empty value.
 * @returns Both the original trimmed position text and a parsed numeric value
 * when one can be extracted.
 */
export function parseSeriesPosition(value: string | number | null | undefined): SeriesPosition {
  if (value === null || value === undefined || value === "") {
    return { raw: null, numeric: null };
  }

  const raw = String(value).trim();
  const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));

  return {
    raw,
    numeric: Number.isFinite(numeric) ? numeric : null,
  };
}

/**
 * Purpose: Estimate how similar two text values are by comparing normalised
 * word tokens.
 *
 * @param firstValue - First text value to compare.
 * @param secondValue - Second text value to compare.
 * @returns A value from `0` to `1`, where `1` means both values have the same
 * normalised token set.
 */
export function textSimilarity(firstValue: string, secondValue: string): number {
  const firstTokens = new Set(normaliseText(firstValue).split(" ").filter(Boolean));
  const secondTokens = new Set(normaliseText(secondValue).split(" ").filter(Boolean));

  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) intersectionCount += 1;
  }

  const unionCount = new Set([...firstTokens, ...secondTokens]).size;
  return intersectionCount / unionCount;
}

/**
 * Purpose: Check whether two lists share at least one normalised text value.
 *
 * @param firstValues - First list of author, narrator, or similar names.
 * @param secondValues - Second list of author, narrator, or similar names.
 * @returns `true` when at least one normalised value appears in both lists.
 */
export function valuesOverlap(firstValues: string[], secondValues: string[]): boolean {
  const secondValueIndex = new Set(secondValues.map(normaliseText).filter(Boolean));
  return firstValues.some((value) => secondValueIndex.has(normaliseText(value)));
}
