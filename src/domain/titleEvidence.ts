import type { LocalBookEvidence, ProviderSeriesBook } from "./audiobook";
import { normaliseText } from "./normalise";

/**
 * Purpose: Decide whether a provider book and local book have compatible title
 * evidence, including common title/subtitle storage differences.
 *
 * @param providerBook - Provider book that may otherwise be reported missing.
 * @param localBook - Local Audiobookshelf book to compare against.
 * @returns `true` when normalised title variants overlap strongly enough to
 * treat both records as the same title candidate.
 */
export function hasCompatibleTitleEvidence(
  providerBook: ProviderSeriesBook,
  localBook: LocalBookEvidence
): boolean {
  const providerTitleEvidence = buildTitleEvidence(providerBook.title, providerBook.subtitle);
  const localTitleEvidence = buildTitleEvidence(localBook.title, localBook.subtitle);

  for (const providerTitle of providerTitleEvidence) {
    if (localTitleEvidence.has(providerTitle)) return true;

    for (const localTitle of localTitleEvidence) {
      if (areTitleEvidenceValuesSimilar(providerTitle, localTitle)) return true;
    }
  }

  return false;
}

/**
 * Purpose: Treat subtitle metadata as supporting evidence without requiring
 * perfect Audible/Audiobookshelf formatting.
 *
 * @param localSubtitle - Normalised local subtitle.
 * @param providerSubtitle - Normalised provider subtitle.
 * @returns `true` when either subtitle is missing, both are equal, or one
 * contains the other.
 */
export function areSubtitlesCompatible(
  localSubtitle: string,
  providerSubtitle: string
): boolean {
  if (!localSubtitle || !providerSubtitle) return true;
  return (
    localSubtitle === providerSubtitle ||
    localSubtitle.includes(providerSubtitle) ||
    providerSubtitle.includes(localSubtitle)
  );
}

/**
 * Purpose: Build normalised title variants for matching provider and local
 * records that store subtitles differently.
 *
 * @param title - Raw title from Audiobookshelf or the metadata provider.
 * @param subtitle - Optional raw subtitle from Audiobookshelf or the provider.
 * @returns Normalised title evidence values, including full title/subtitle and
 * safe title-prefix variants.
 */
export function buildTitleEvidence(
  title: string | null | undefined,
  subtitle: string | null | undefined
): Set<string> {
  const evidence = new Set<string>();
  const rawTitle = title?.trim() ?? "";
  const rawSubtitle = subtitle?.trim() ?? "";

  addTitleEvidence(evidence, rawTitle);
  if (rawSubtitle) addTitleEvidence(evidence, `${rawTitle} ${rawSubtitle}`);

  for (const titlePrefix of getTitlePrefixVariants(rawTitle)) {
    addTitleEvidence(evidence, titlePrefix);
    if (rawSubtitle) addTitleEvidence(evidence, `${titlePrefix} ${rawSubtitle}`);
  }

  return evidence;
}

/**
 * Purpose: Add one normalised title value to a title-evidence set when it is
 * meaningful.
 *
 * @param evidence - Mutable set of normalised title evidence values.
 * @param value - Raw title value to normalise and add.
 * @returns Nothing. The evidence set is updated in place.
 */
function addTitleEvidence(evidence: Set<string>, value: string): void {
  const normalisedValue = normaliseText(value);
  if (normalisedValue) evidence.add(normalisedValue);
}

/**
 * Purpose: Extract conservative title-prefix variants from common title formats
 * such as `Title: Subtitle` or `Title (Series, Book 3)`.
 *
 * @param title - Raw title text to inspect.
 * @returns Raw title-prefix variants that can safely participate in exact
 * normalised matching.
 */
function getTitlePrefixVariants(title: string): string[] {
  const variants: string[] = [];
  const separatorMatch = /^(.*?)(?::|\s+-\s+).+$/.exec(title);
  const bracketMatch = /^(.*?)\s+[\[(].+[\])]$/.exec(title);

  for (const match of [separatorMatch, bracketMatch]) {
    const prefix = match?.[1]?.trim();
    if (prefix && normaliseText(prefix).length >= 3) variants.push(prefix);
  }

  return variants;
}

/**
 * Purpose: Allow tiny title spelling differences to match owned books without
 * hiding genuinely different longer titles.
 *
 * @param providerTitle - Normalised provider title evidence.
 * @param localTitle - Normalised local title evidence.
 * @returns `true` when both titles have the same token shape and only minor
 * single-token spelling differences.
 */
function areTitleEvidenceValuesSimilar(providerTitle: string, localTitle: string): boolean {
  if (providerTitle === localTitle) return true;

  const providerTokens = providerTitle.split(" ").filter(Boolean);
  const localTokens = localTitle.split(" ").filter(Boolean);

  if (providerTokens.length === 0 || providerTokens.length !== localTokens.length) return false;

  let changedTokens = 0;
  for (let index = 0; index < providerTokens.length; index += 1) {
    if (providerTokens[index] === localTokens[index]) continue;

    changedTokens += 1;
    if (changedTokens > 1) return false;
    if (levenshteinDistance(providerTokens[index], localTokens[index]) > 1) return false;
  }

  return changedTokens === 1;
}

/**
 * Purpose: Compute edit distance for short normalised title tokens.
 *
 * @param firstValue - First token.
 * @param secondValue - Second token.
 * @returns The number of single-character edits needed to transform one token
 * into the other.
 */
function levenshteinDistance(firstValue: string, secondValue: string): number {
  const previousRow = Array.from({ length: secondValue.length + 1 }, (_, index) => index);

  for (let firstIndex = 0; firstIndex < firstValue.length; firstIndex += 1) {
    const currentRow = [firstIndex + 1];

    for (let secondIndex = 0; secondIndex < secondValue.length; secondIndex += 1) {
      currentRow.push(
        Math.min(
          currentRow[secondIndex] + 1,
          previousRow[secondIndex + 1] + 1,
          previousRow[secondIndex] +
            (firstValue[firstIndex] === secondValue[secondIndex] ? 0 : 1)
        )
      );
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[secondValue.length];
}
