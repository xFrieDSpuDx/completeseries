import type { RegionCode } from "../../domain/audiobook";
import { normaliseText } from "../../domain/normalise";

type LanguageProfileKey =
  | "english"
  | "french"
  | "german"
  | "italian"
  | "japanese"
  | "portuguese"
  | "spanish";

type LanguageProfile = {
  openLibraryCodes: string[];
  words: string[];
};

const regionLanguages: Record<RegionCode, LanguageProfileKey[]> = {
  au: ["english"],
  br: ["portuguese"],
  ca: ["english", "french"],
  de: ["german"],
  es: ["spanish"],
  fr: ["french"],
  in: ["english"],
  it: ["italian"],
  jp: ["japanese"],
  uk: ["english"],
  us: ["english"],
};

const languageProfiles: Record<LanguageProfileKey, LanguageProfile> = {
  english: {
    openLibraryCodes: ["eng", "en"],
    words: [
      "and",
      "author",
      "book",
      "from",
      "her",
      "his",
      "in",
      "novel",
      "read",
      "series",
      "story",
      "the",
      "this",
      "with",
    ],
  },
  french: {
    openLibraryCodes: ["fre", "fra", "fr"],
    words: [
      "avec",
      "dans",
      "des",
      "du",
      "elle",
      "est",
      "et",
      "le",
      "les",
      "livre",
      "pour",
      "que",
      "roman",
      "une",
    ],
  },
  german: {
    openLibraryCodes: ["ger", "deu", "de"],
    words: [
      "als",
      "das",
      "dem",
      "den",
      "der",
      "die",
      "ein",
      "eine",
      "horbuch",
      "ist",
      "mit",
      "nicht",
      "roman",
      "und",
      "von",
    ],
  },
  italian: {
    openLibraryCodes: ["ita", "it"],
    words: [
      "che",
      "con",
      "del",
      "della",
      "di",
      "e",
      "il",
      "la",
      "libro",
      "nel",
      "per",
      "romanzo",
      "una",
    ],
  },
  japanese: {
    openLibraryCodes: ["jpn", "ja"],
    words: [],
  },
  portuguese: {
    openLibraryCodes: ["por", "pt"],
    words: [
      "com",
      "da",
      "de",
      "do",
      "e",
      "em",
      "livro",
      "na",
      "no",
      "os",
      "para",
      "que",
      "romance",
      "uma",
    ],
  },
  spanish: {
    openLibraryCodes: ["spa", "es"],
    words: ["con", "de", "del", "el", "en", "es", "la", "libro", "los", "para", "que", "una"],
  },
};

/**
 * Purpose: Decide whether explicit Open Library language evidence is compatible
 * with the selected marketplace region.
 *
 * @param languages - Open Library language codes from a search document.
 * @param region - User-selected provider region.
 * @returns `true` when language evidence is missing or includes a region
 * language.
 */
export function hasRegionLanguageCode(
  languages: string[] | null | undefined,
  region: RegionCode
): boolean {
  const languageCodes = (languages ?? []).map((language) => language.trim().toLowerCase());
  if (languageCodes.length === 0) return true;

  const expectedCodes = new Set(
    getRegionLanguageProfiles(region).flatMap((profile) => profile.openLibraryCodes)
  );

  return languageCodes.some((languageCode) => expectedCodes.has(languageCode));
}

/**
 * Purpose: Get one ISO-639-1 language code for provider APIs that only accept
 * a single language restriction.
 *
 * @param region - User-selected provider region.
 * @returns Two-letter language code when the region maps to one language, or
 * `null` when the region should keep broader language handling.
 */
export function getSingleRegionLanguageCode(region: RegionCode): string | null {
  const languageCodes = new Set(
    getRegionLanguageProfiles(region)
      .flatMap((profile) => profile.openLibraryCodes)
      .filter((languageCode) => languageCode.length === 2)
  );

  return languageCodes.size === 1 ? [...languageCodes][0] : null;
}

/**
 * Purpose: Decide whether provider text strongly appears to be in a language
 * compatible with the selected marketplace region.
 *
 * @param text - Provider title, description, and contributor text.
 * @param region - User-selected provider region.
 * @returns `true` unless the text has stronger evidence for another supported
 * language than the region language.
 */
export function isLikelyRegionLanguage(text: string, region: RegionCode): boolean {
  if (region === "jp") return hasJapaneseScript(text) || !hasAnyLanguageSignal(text);

  const normalisedText = normaliseText(text);
  if (normalisedText.length < 80) return true;

  const expectedLanguages = new Set(regionLanguages[region]);
  const scores = Object.entries(languageProfiles).map(([language, profile]) => ({
    language: language as LanguageProfileKey,
    score: scoreProfile(normalisedText, profile),
  }));
  const expectedScore = Math.max(
    ...scores
      .filter((entry) => expectedLanguages.has(entry.language))
      .map((entry) => entry.score),
    0
  );
  const otherScore = Math.max(
    ...scores
      .filter((entry) => !expectedLanguages.has(entry.language))
      .map((entry) => entry.score),
    0
  );

  if (expectedScore >= 3) return true;

  return !(otherScore >= 5 && otherScore >= expectedScore + 3);
}

/**
 * Purpose: Get language profiles allowed for a selected region.
 *
 * @param region - User-selected provider region.
 * @returns Language profiles associated with the region.
 */
function getRegionLanguageProfiles(region: RegionCode): LanguageProfile[] {
  return regionLanguages[region].map((language) => languageProfiles[language]);
}

/**
 * Purpose: Score one language profile against normalised provider text.
 *
 * @param text - Normalised provider text.
 * @param profile - Language profile to compare.
 * @returns Count of profile words present in the text.
 */
function scoreProfile(text: string, profile: LanguageProfile): number {
  const tokens = new Set(text.split(" ").filter(Boolean));
  return profile.words.reduce((score, word) => score + (tokens.has(word) ? 1 : 0), 0);
}

/**
 * Purpose: Check for Japanese scripts that survive normal text normalisation.
 *
 * @param text - Raw provider text.
 * @returns `true` when hiragana, katakana, or CJK ideographs are present.
 */
function hasJapaneseScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

/**
 * Purpose: Check whether provider text has any language signal we know how to
 * inspect.
 *
 * @param text - Raw provider text.
 * @returns `true` when any supported language signal is visible.
 */
function hasAnyLanguageSignal(text: string): boolean {
  const normalisedText = normaliseText(text);
  if (!normalisedText) return false;

  return Object.values(languageProfiles).some(
    (profile) => scoreProfile(normalisedText, profile) > 0
  );
}
