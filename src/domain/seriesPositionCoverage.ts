import type { SeriesPosition } from "./audiobook";
import { normaliseText } from "./normalise";

type ComparableSeriesPosition =
  | { kind: "missing"; raw: null }
  | { kind: "single"; raw: string; value: number }
  | { kind: "decimal"; raw: string; value: number }
  | { kind: "range"; raw: string; start: number; end: number }
  | { kind: "unknown"; raw: string };

const RANGE_CONNECTOR_PATTERN =
  /[-\u2010-\u2015\u2212]|\bto\b|\bthrough\b|\bthru\b|\band\b|&/i;
const WHOLE_NUMBER_RANGE_PATTERN = new RegExp(
  [
    String.raw`(?:^|\b)(?:books?\s*)?#?\s*(\d+)`,
    String.raw`\s*(?:[-\u2010-\u2015\u2212]|\bto\b|\bthrough\b|\bthru\b|\band\b|&)\s*`,
    String.raw`(?:books?\s*)?#?\s*(\d+)(?:\b|$)`,
  ].join(""),
  "i"
);
const DECIMAL_POSITION_PATTERN = /^(?:books?\s*)?#?\s*(\d+\.\d+)$/i;
const WHOLE_NUMBER_POSITION_PATTERN = /^(?:books?\s*)?#?\s*(\d+)$/i;

/**
 * Purpose: Decide whether a local series position fully covers a provider
 * series position.
 *
 * @param localPosition - Series position from the local Audiobookshelf book.
 * @param providerPosition - Series position from the provider book being
 * checked.
 * @returns `true` when the local position is the same as the provider position,
 * or when a local whole-number range such as `1-8` covers the provider
 * whole-number position or range.
 */
export function seriesPositionCovers(
  localPosition: SeriesPosition,
  providerPosition: SeriesPosition
): boolean {
  const localComparable = parseComparableSeriesPosition(localPosition);
  const providerComparable = parseComparableSeriesPosition(providerPosition);

  if (localComparable.kind === "missing" || providerComparable.kind === "missing") {
    return false;
  }

  if (areEquivalentPositions(localComparable, providerComparable)) return true;

  if (localComparable.kind !== "range") return false;
  if (providerComparable.kind === "single") {
    return isWholeNumberInsideRange(providerComparable.value, localComparable);
  }
  if (providerComparable.kind === "range") {
    return (
      providerComparable.start >= localComparable.start &&
      providerComparable.end <= localComparable.end
    );
  }

  return false;
}

/**
 * Purpose: Check whether a position contains any comparable evidence.
 *
 * @param position - Parsed series-position evidence.
 * @returns `true` when raw or numeric position evidence is available.
 */
export function hasSeriesPositionEvidence(position: SeriesPosition): boolean {
  return position.raw !== null || position.numeric !== null;
}

/**
 * Purpose: Decide whether a position is a whole-number range, such as `1-8` or
 * `Book 1 to Book 8`.
 *
 * @param position - Parsed series-position evidence.
 * @returns `true` when the position is a conservative whole-number range.
 */
export function isWholeNumberSeriesPositionRange(position: SeriesPosition): boolean {
  return parseComparableSeriesPosition(position).kind === "range";
}

/**
 * Purpose: Format parsed position evidence for debug and review messages.
 *
 * @param position - Parsed series-position evidence.
 * @returns The raw position when available, otherwise the numeric position as
 * text.
 */
export function formatSeriesPosition(position: SeriesPosition): string {
  return position.raw ?? String(position.numeric ?? "");
}

/**
 * Purpose: Convert existing raw/numeric position evidence into a safer shape
 * for ownership checks.
 *
 * @param position - Parsed series-position evidence.
 * @returns A comparable position that separates single values, decimal values,
 * and whole-number ranges.
 */
function parseComparableSeriesPosition(position: SeriesPosition): ComparableSeriesPosition {
  if (!hasSeriesPositionEvidence(position)) return { kind: "missing", raw: null };

  const raw = position.raw?.trim() ?? String(position.numeric);
  if (hasDecimalNumber(raw) && RANGE_CONNECTOR_PATTERN.test(raw)) {
    return { kind: "unknown", raw };
  }

  const rangeMatch = WHOLE_NUMBER_RANGE_PATTERN.exec(raw);
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10);
    const end = Number.parseInt(rangeMatch[2], 10);
    if (Number.isInteger(start) && Number.isInteger(end) && start <= end) {
      return { kind: "range", raw, start, end };
    }
  }

  const decimalMatch = DECIMAL_POSITION_PATTERN.exec(raw);
  if (decimalMatch) return { kind: "decimal", raw, value: Number.parseFloat(decimalMatch[1]) };

  const singleMatch = WHOLE_NUMBER_POSITION_PATTERN.exec(raw);
  if (singleMatch) return { kind: "single", raw, value: Number.parseInt(singleMatch[1], 10) };

  if (position.numeric !== null) {
    return Number.isInteger(position.numeric)
      ? { kind: "single", raw, value: position.numeric }
      : { kind: "decimal", raw, value: position.numeric };
  }

  return { kind: "unknown", raw };
}

/**
 * Purpose: Compare two parsed positions without allowing a single local book to
 * stand in for a provider range.
 *
 * @param firstPosition - First comparable position.
 * @param secondPosition - Second comparable position.
 * @returns `true` when both positions describe the same single value, decimal
 * value, whole-number range, or exact raw text.
 */
function areEquivalentPositions(
  firstPosition: ComparableSeriesPosition,
  secondPosition: ComparableSeriesPosition
): boolean {
  if (firstPosition.raw && secondPosition.raw) {
    if (normaliseText(firstPosition.raw) === normaliseText(secondPosition.raw)) return true;
  }

  if (firstPosition.kind === "range" && secondPosition.kind === "range") {
    return firstPosition.start === secondPosition.start && firstPosition.end === secondPosition.end;
  }

  if (
    (firstPosition.kind === "single" || firstPosition.kind === "decimal") &&
    (secondPosition.kind === "single" || secondPosition.kind === "decimal")
  ) {
    return firstPosition.value === secondPosition.value;
  }

  return false;
}

/**
 * Purpose: Check whether a whole-number provider position is inside a local
 * omnibus range.
 *
 * @param value - Whole-number provider position.
 * @param range - Local whole-number range.
 * @returns `true` when the value sits inside the inclusive range.
 */
function isWholeNumberInsideRange(
  value: number,
  range: Extract<ComparableSeriesPosition, { kind: "range" }>
): boolean {
  return Number.isInteger(value) && value >= range.start && value <= range.end;
}

/**
 * Purpose: Detect decimal position evidence before range parsing so decimal
 * omnibus-like values are not treated as owned ranges.
 *
 * @param value - Raw series-position text.
 * @returns `true` when the text contains a decimal number.
 */
function hasDecimalNumber(value: string): boolean {
  return /\d+\.\d+/.test(value);
}
