const HTML_ENTITY_VALUES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "*",
  gt: ">",
  hellip: "...",
  laquo: '"',
  ldquo: '"',
  lsquo: "'",
  lt: "<",
  mdash: "-",
  ndash: "-",
  nbsp: " ",
  quot: '"',
  raquo: '"',
  rdquo: '"',
  rsquo: "'",
};

/**
 * Purpose: Convert provider HTML snippets into plain text that is safe to show
 * in React text nodes.
 *
 * @param value - Raw provider text, which may include tags or HTML entities.
 * @returns Plain decoded text, or `null` when the value is empty.
 */
export function cleanProviderText(value: string | null | undefined): string | null {
  const cleanedValue = decodeHtmlEntities(value?.replace(/<[^>]*>/g, " ") ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedValue || null;
}

/**
 * Purpose: Decode named and numeric HTML entities commonly returned by
 * metadata providers.
 *
 * @param value - Text that may contain encoded entities such as `&quot;`,
 * `&amp;`, `&#39;`, or `&#x2019;`.
 * @returns Text with supported entities decoded.
 */
export function decodeHtmlEntities(value: string): string {
  let decodedValue = value;

  for (let pass = 0; pass < 2; pass += 1) {
    const nextValue = decodedValue.replace(
      /&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi,
      (entity, entityName: string) => decodeHtmlEntity(entity, entityName)
    );

    if (nextValue === decodedValue) break;
    decodedValue = nextValue;
  }

  return normaliseDecodedCharacters(decodedValue);
}

/**
 * Purpose: Decode one HTML entity token while preserving unknown entities.
 *
 * @param entity - Full original entity text.
 * @param entityName - Entity name or numeric code without surrounding `&` and
 * `;`.
 * @returns Decoded character, or the original entity when unsupported.
 */
function decodeHtmlEntity(entity: string, entityName: string): string {
  if (entityName.startsWith("#x") || entityName.startsWith("#X")) {
    return decodeNumericEntity(entity, entityName.slice(2), 16);
  }

  if (entityName.startsWith("#")) {
    return decodeNumericEntity(entity, entityName.slice(1), 10);
  }

  return HTML_ENTITY_VALUES[entityName.toLowerCase()] ?? entity;
}

/**
 * Purpose: Decode one numeric entity into a Unicode character.
 *
 * @param entity - Full original entity text.
 * @param value - Numeric code point text.
 * @param radix - Number base used by the entity.
 * @returns Decoded character, or the original entity when invalid.
 */
function decodeNumericEntity(entity: string, value: string, radix: number): string {
  const codePoint = Number.parseInt(value, radix);

  if (!Number.isFinite(codePoint)) return entity;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return entity;
  }
}

/**
 * Purpose: Normalise common typographic characters after numeric entities are
 * decoded.
 *
 * @param value - Decoded provider text.
 * @returns Text using consistent display characters for quotes, spaces, and
 * dashes.
 */
function normaliseDecodedCharacters(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[\u2013\u2014]/g, "-");
}
