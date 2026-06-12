import type { LocalBookEvidence, LocalSeriesEvidence } from "../../domain/audiobook";
import { normaliseIsbn, normaliseText, parseSeriesPosition } from "../../domain/normalise";
import type {
  AudiobookshelfBookMetadata,
  AudiobookshelfLibraryItem,
  AudiobookshelfNamedValue,
  AudiobookshelfSeriesResponse,
  AudiobookshelfSeriesSequence,
} from "./audiobookshelfTypes";

/**
 * Purpose: Convert the raw Audiobookshelf series response into the local
 * evidence structure used by the matching engine.
 *
 * @param response - Raw `/api/libraries/{id}/series` response from
 * Audiobookshelf.
 * @param libraryId - Optional library id used to trace each mapped series back
 * to the source library.
 * @returns Local series records with normalised book metadata fields.
 */
export function mapAudiobookshelfSeriesResponse(
  response: AudiobookshelfSeriesResponse,
  libraryId?: string
): LocalSeriesEvidence[] {
  return (response.results ?? []).map((series, seriesIndex) => ({
    id: series.id ?? `series-${seriesIndex}`,
    name: series.name ?? "Unknown Series",
    libraryId,
    books: (series.books ?? []).map((book, bookIndex): LocalBookEvidence => {
      return mapBookMetadataToLocalBook(
        book.id ?? `${series.id ?? seriesIndex}-${bookIndex}`,
        book.media?.metadata ?? {},
        series.name
      );
    }),
  }));
}

/**
 * Purpose: Convert one Audiobookshelf library item into local book evidence.
 *
 * @param item - Raw library item from `/api/libraries/{id}/items`.
 * @param itemIndex - Index fallback used when the item has no id.
 * @returns Local book evidence used by ownership matching.
 */
export function mapLibraryItemToLocalBook(
  item: AudiobookshelfLibraryItem,
  itemIndex: number
): LocalBookEvidence {
  const metadata = item.media?.metadata ?? {};
  return mapBookMetadataToLocalBook(item.id ?? `library-item-${itemIndex}`, metadata);
}

/**
 * Purpose: Convert Audiobookshelf book metadata into local matching evidence.
 *
 * @param id - Stable local item id or fallback id.
 * @param metadata - Raw Audiobookshelf book metadata.
 * @param currentSeriesName - Optional series name from a series response.
 * @returns Local book evidence with normalised contributor and position data.
 */
function mapBookMetadataToLocalBook(
  id: string,
  metadata: AudiobookshelfBookMetadata,
  currentSeriesName?: string | null
): LocalBookEvidence {
  return {
    id,
    title: metadata.title ?? "Unknown Title",
    subtitle: metadata.subtitle ?? null,
    asin: metadata.asin ?? null,
    isbn: extractIsbn(metadata),
    sku: metadata.sku ?? null,
    skuGroup: metadata.skuGroup ?? null,
    authors: mapNameList(metadata.authors, metadata.authorName),
    narrators: mapNameList(metadata.narrators, metadata.narratorName),
    genres: mapNameList(metadata.genres, null),
    publisher: metadata.publisher ?? null,
    publishedDate: metadata.publishedDate ?? metadata.publishedYear ?? null,
    releaseDate: metadata.releaseDate ?? null,
    seriesNames: extractSeriesNames(metadata.series, currentSeriesName, metadata.seriesName),
    position: parseSeriesPosition(
      extractSeriesPosition(metadata.series, currentSeriesName, metadata.seriesName)
    ),
  };
}

/**
 * Purpose: Extract ISBN metadata from Audiobookshelf, accepting common field
 * variants and normalising the value for matching.
 *
 * @param metadata - Raw Audiobookshelf book metadata.
 * @returns Normalised ISBN text, or `null` when no ISBN is present.
 */
function extractIsbn(metadata: AudiobookshelfBookMetadata): string | null {
  const isbn = [
    metadata.isbn,
    metadata.isbn13,
    metadata.isbn10,
    metadata.isbn_13,
    metadata.isbn_10,
  ]
    .map(normaliseIsbn)
    .find(Boolean);

  return isbn ?? null;
}

/**
 * Purpose: Pull the series position from Audiobookshelf's current `series`
 * metadata shape, falling back to the legacy combined series name shape.
 *
 * @param seriesMetadata - Raw Audiobookshelf series metadata for a book.
 * @param currentSeriesName - Name of the series being mapped.
 * @param legacySeriesName - Legacy raw series name value, commonly including a
 * trailing `#position` segment.
 * @returns The matching series sequence value, or a legacy extracted position
 * when only `seriesName` is available.
 */
function extractSeriesPosition(
  seriesMetadata:
    | AudiobookshelfSeriesSequence
    | AudiobookshelfSeriesSequence[]
    | string
    | null
    | undefined,
  currentSeriesName: string | null | undefined,
  legacySeriesName: string | null | undefined
): string | number | null {
  const seriesEntries = normaliseSeriesMetadata(seriesMetadata);
  const matchingEntry = seriesEntries.find(
    (seriesEntry) => normaliseText(seriesEntry.name) === normaliseText(currentSeriesName)
  );

  return (
    matchingEntry?.sequence ??
    extractPositionFromSeriesName(
      typeof seriesMetadata === "string" ? seriesMetadata : legacySeriesName
    )
  );
}

/**
 * Purpose: Preserve local series-name evidence so ownership checks can match
 * provider records even when title subtitles or contributor metadata differ.
 *
 * @param seriesMetadata - Raw Audiobookshelf series metadata for a book.
 * @param currentSeriesName - Series name from the series endpoint currently
 * being mapped.
 * @param legacySeriesName - Legacy raw series name value, often including a
 * trailing `#position` segment.
 * @returns Unique local series names found on the book metadata.
 */
function extractSeriesNames(
  seriesMetadata:
    | AudiobookshelfSeriesSequence
    | AudiobookshelfSeriesSequence[]
    | string
    | null
    | undefined,
  currentSeriesName: string | null | undefined,
  legacySeriesName: string | null | undefined
): string[] {
  const seriesNames = new Map<string, string>();

  addSeriesName(seriesNames, currentSeriesName);
  for (const seriesEntry of normaliseSeriesMetadata(seriesMetadata)) {
    addSeriesName(seriesNames, seriesEntry.name);
  }

  addSeriesName(
    seriesNames,
    stripLegacySeriesPosition(typeof seriesMetadata === "string" ? seriesMetadata : legacySeriesName)
  );

  return [...seriesNames.values()];
}

/**
 * Purpose: Add a series name to a de-duplicating map when it contains useful
 * text.
 *
 * @param seriesNames - Mutable normalised-name map.
 * @param value - Raw series name candidate.
 * @returns Nothing. The map is updated in place.
 */
function addSeriesName(seriesNames: Map<string, string>, value: string | null | undefined): void {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return;

  const key = normaliseText(trimmedValue);
  if (key && !seriesNames.has(key)) seriesNames.set(key, trimmedValue);
}

/**
 * Purpose: Remove the legacy `#position` suffix from Audiobookshelf series
 * labels while keeping the readable series name.
 *
 * @param seriesName - Raw legacy series label.
 * @returns Series name before `#`, or the original value when no suffix exists.
 */
function stripLegacySeriesPosition(seriesName: string | null | undefined): string | null {
  if (!seriesName) return null;
  const hashIndex = seriesName.indexOf("#");
  return (hashIndex === -1 ? seriesName : seriesName.slice(0, hashIndex)).trim();
}

/**
 * Purpose: Normalise Audiobookshelf series metadata into an array so callers
 * can handle both old and new response shapes.
 *
 * @param seriesMetadata - Raw series metadata from Audiobookshelf.
 * @returns Series metadata entries, or an empty array for legacy string values.
 */
function normaliseSeriesMetadata(
  seriesMetadata:
    | AudiobookshelfSeriesSequence
    | AudiobookshelfSeriesSequence[]
    | string
    | null
    | undefined
): AudiobookshelfSeriesSequence[] {
  if (Array.isArray(seriesMetadata)) return seriesMetadata;
  if (typeof seriesMetadata === "object" && seriesMetadata !== null) return [seriesMetadata];
  return [];
}

/**
 * Purpose: Pull a series position from Audiobookshelf's legacy combined series
 * name metadata.
 *
 * @param seriesName - Raw Audiobookshelf series name value, commonly including
 * a trailing `#position` segment.
 * @returns The text after `#`, or `null` when no position is present.
 */
function extractPositionFromSeriesName(seriesName: string | null | undefined): string | null {
  if (!seriesName) return null;
  const hashIndex = seriesName.indexOf("#");
  return hashIndex === -1 ? null : seriesName.slice(hashIndex + 1).trim();
}

/**
 * Purpose: Convert Audiobookshelf name arrays into plain name strings.
 *
 * @param values - Audiobookshelf author/narrator values, either strings or
 * objects with a `name`.
 * @param fallbackCsv - Optional comma-separated fallback name string.
 * @returns Plain contributor names with empty values removed.
 */
function mapNameList(
  values: AudiobookshelfNamedValue[] | undefined,
  fallbackCsv: string | null | undefined
): string[] {
  const mappedValues = (values ?? [])
    .map((value) => (typeof value === "string" ? value : value.name))
    .filter((value): value is string => Boolean(value));

  if (mappedValues.length > 0) return mappedValues;

  return (fallbackCsv ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
