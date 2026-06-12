import { normaliseText } from "../../../domain/normalise";

export type AppleBooksTitleParts = {
  position: string | null;
  subtitle: string | null;
  title: string;
};

/**
 * Purpose: Split common Apple audiobook titles such as
 * `Title: Series, Book 1` into comparable title and title-derived position
 * evidence.
 *
 * @param rawTitle - Cleaned Apple Books title.
 * @param seriesName - Local series query that produced this result.
 * @returns Title parts suitable for matching and position filters. Subtitle is
 * retained only inside this helper so title parsing stays understandable; Apple
 * subtitle text is not exposed as matching evidence.
 */
export function splitAppleBooksTitle(
  rawTitle: string,
  seriesName: string
): AppleBooksTitleParts {
  const colonSplit = rawTitle.split(/\s*:\s*/);
  const possibleSubtitle = colonSplit.length > 1 ? colonSplit.slice(1).join(": ") : null;

  if (possibleSubtitle && isLikelySeriesSubtitle(possibleSubtitle, seriesName)) {
    return {
      title: colonSplit[0].trim(),
      subtitle: possibleSubtitle,
      position: inferSeriesPosition(possibleSubtitle),
    };
  }

  const parentheticalMatch = /^(.*?)\s*\(([^)]*(?:book|unabridged|abridged)[^)]*)\)\s*$/i.exec(
    rawTitle
  );
  if (parentheticalMatch) {
    const [, title, subtitle] = parentheticalMatch;
    return {
      title: title.trim(),
      subtitle,
      position: inferSeriesPosition(subtitle),
    };
  }

  return {
    title: rawTitle,
    subtitle: null,
    position: inferSeriesPosition(rawTitle),
  };
}

/**
 * Purpose: Infer abridgement information when Apple includes it in visible
 * audiobook text.
 *
 * @param values - Text values from the Apple result.
 * @returns `unabridged`, `abridged`, or `null` when Apple did not say.
 */
export function inferAppleBooksFormat(
  ...values: Array<string | null | undefined>
): string | null {
  const text = normaliseText(values.filter(Boolean).join(" "));
  if (text.includes("unabridged")) return "unabridged";
  if (/\babridged\b/.test(text)) return "abridged";

  return null;
}

/**
 * Purpose: Check whether a title suffix looks like series metadata rather than
 * part of the book title.
 *
 * @param subtitle - Candidate subtitle text.
 * @param seriesName - Local series query.
 * @returns `true` when the suffix includes the series name or a book number.
 */
function isLikelySeriesSubtitle(subtitle: string, seriesName: string): boolean {
  const subtitleText = normaliseText(subtitle);
  const seriesText = normaliseText(seriesName);

  return (
    subtitleText.includes("book") ||
    subtitleText.includes("series") ||
    (seriesText.length > 0 && subtitleText.includes(seriesText))
  );
}

/**
 * Purpose: Infer a series position from common audiobook title phrases.
 *
 * @param text - Title or subtitle text to inspect.
 * @returns A position string, or `null` when no position can be inferred.
 */
function inferSeriesPosition(text: string): string | null {
  const bookMatch = /\bbook\s+(\d+(?:\.\d+)?)/i.exec(text);
  if (bookMatch) return bookMatch[1];

  const hashMatch = /#\s*(\d+(?:\.\d+)?)/.exec(text);
  if (hashMatch) return hashMatch[1];

  const ordinalMatch = new RegExp(`\\b(${Object.keys(ordinalWords).join("|")})\\s+book\\b`, "i")
    .exec(text);
  return ordinalMatch ? ordinalWords[normaliseText(ordinalMatch[1])] ?? null : null;
}

const ordinalWords: Record<string, string> = {
  first: "1",
  second: "2",
  third: "3",
  fourth: "4",
  fifth: "5",
  sixth: "6",
  seventh: "7",
  eighth: "8",
  ninth: "9",
  tenth: "10",
  eleventh: "11",
  twelfth: "12",
  thirteenth: "13",
  fourteenth: "14",
  fifteenth: "15",
  sixteenth: "16",
  seventeenth: "17",
  eighteenth: "18",
  nineteenth: "19",
  twentieth: "20",
};
