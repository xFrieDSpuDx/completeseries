export type MetadataLookupAnchorKind = "ASIN" | "ISBN" | "Provider series" | "Series name";

export type MetadataLookupAnchor = {
  kind: MetadataLookupAnchorKind;
  value: string;
};

/**
 * Purpose: Record one metadata lookup anchor while avoiding repeated entries
 * in scan reports.
 *
 * @param anchors - Mutable lookup-anchor list for the current series.
 * @param kind - Human-readable anchor type, such as ASIN or ISBN.
 * @param value - Raw lookup value used during provider discovery.
 * @returns Nothing. The anchor is appended only when it is useful and unique.
 */
export function appendLookupAnchor(
  anchors: MetadataLookupAnchor[] | undefined,
  kind: MetadataLookupAnchorKind,
  value: string | null | undefined
): void {
  const cleanValue = value?.trim();
  if (!anchors || !cleanValue) return;

  const key = getLookupAnchorKey({ kind, value: cleanValue });
  if (anchors.some((anchor) => getLookupAnchorKey(anchor) === key)) return;

  anchors.push({ kind, value: cleanValue });
}

/**
 * Purpose: Convert legacy ASIN anchor arrays into provider-neutral lookup
 * anchors.
 *
 * @param asins - ASIN values selected for provider discovery.
 * @returns Lookup-anchor records labelled as ASINs.
 */
export function buildAsinLookupAnchors(asins: string[]): MetadataLookupAnchor[] {
  return asins.map((asin) => ({ kind: "ASIN", value: asin }));
}

/**
 * Purpose: Format one lookup anchor for review and debug screens.
 *
 * @param anchor - Lookup anchor recorded during metadata discovery.
 * @returns Human-readable anchor label and value.
 */
export function formatLookupAnchor(anchor: MetadataLookupAnchor): string {
  return `${anchor.kind} ${anchor.value}`;
}

/**
 * Purpose: Build a stable comparison key for lookup anchors.
 *
 * @param anchor - Lookup anchor to compare.
 * @returns Lowercase key combining kind and value.
 */
function getLookupAnchorKey(anchor: MetadataLookupAnchor): string {
  return `${anchor.kind}:${anchor.value}`.toLowerCase();
}
