import type {
  LocalBookEvidence,
  LocalSeriesEvidence,
  ProviderSeriesBook,
  ProviderSeriesCandidate,
} from "./audiobook";
import type { MissingBookDiagnostic, MissingBookOptions } from "./missingBookTypes";
import { findManualBookMatch } from "./manualBookMatches";
import {
  buildLocalIdentifierIndex,
  hasLocalIdentifierMatch,
  hasLocalSeriesPositionMatch,
  hasLocalTitleCandidateWithDifferentNarrator,
  hasLocalTitleMatch,
} from "./ownershipMatching";
import {
  describeProviderRegion,
  getProviderSeriesPosition,
  hasMultiBookSeriesPosition,
  hasNoProviderSeriesPosition,
  hasSubSeriesPosition,
  isFutureReleaseDate,
  isFuturePlaceholderRelease,
  isPastReleaseDate,
  isProviderBookContainer,
  isProviderBookInSelectedRegion,
  isProviderBookUnabridged,
} from "./providerBookChecks";

export type ProviderBookDecision = {
  action: "show" | "skip";
  diagnostic: MissingBookDiagnostic;
};

/**
 * Purpose: Build the shared local evidence needed to evaluate every provider
 * book in a matched series.
 *
 * @param localBooks - Every local book found during the scan.
 * @returns Normalised identifier evidence used by provider-book decisions.
 */
export function buildDecisionContext(localBooks: LocalBookEvidence[]) {
  return {
    localIdentifiers: buildLocalIdentifierIndex(localBooks),
  };
}

/**
 * Purpose: Run the provider-book gates used to decide whether a book should be
 * shown as missing, while recording why it survived or was skipped.
 *
 * @param providerBook - Provider book being evaluated.
 * @param localSeries - Local Audiobookshelf series matched to the provider
 * series.
 * @param providerSeries - Provider series selected by the matching step.
 * @param allLocalBooks - Every local book found during the scan.
 * @param options - User-selected missing-book filters.
 * @param localIdentifiers - Normalised ASIN, SKU, and SKU group values from the
 * scanned library.
 * @returns A decision containing either `show` or `skip` plus diagnostics for
 * the decision.
 */
export function evaluateProviderBookForMissingResult(
  providerBook: ProviderSeriesBook,
  localSeries: LocalSeriesEvidence,
  providerSeries: ProviderSeriesCandidate,
  allLocalBooks: LocalBookEvidence[],
  options: MissingBookOptions,
  localIdentifiers: Set<string>
): ProviderBookDecision {
  const diagnostic = buildBaseDiagnostic(providerBook, providerSeries);

  /**
   * Purpose: Return the shared skip result after the calling branch has added
   * its evidence to the diagnostic object.
   *
   * @returns A skip decision with the current diagnostic evidence.
   */
  const skip = () => ({ action: "skip" as const, diagnostic });

  const manualBookMatch = findManualBookMatch(
    providerBook,
    providerSeries,
    options.region,
    options.manualBookMatches
  );
  if (manualBookMatch) {
    diagnostic.checks.push(
      `Skipped because ${manualBookMatch.title} was manually marked as owned in this browser's local storage.`
    );
    return skip();
  }

  if (providerBook.isAvailable === false) {
    diagnostic.checks.push("Skipped because the provider marks this book unavailable.");
    return skip();
  }
  diagnostic.checks.push("Provider marks this book available.");

  if (!isProviderBookInSelectedRegion(providerBook, providerSeries, options.region)) {
    diagnostic.checks.push(`Skipped because it does not match selected region ${options.region}.`);
    return skip();
  }
  diagnostic.checks.push(`Region evidence matches selected region ${options.region}.`);

  if (isProviderBookContainer(providerBook)) {
    diagnostic.checks.push(
      "Skipped because this provider record is a series container, not a standalone edition."
    );
    return skip();
  }

  if (hasLocalIdentifierMatch(providerBook, localIdentifiers)) {
    diagnostic.checks.push("Skipped because ASIN, SKU, or SKU group already exists locally.");
    return skip();
  }
  diagnostic.shownBecause.push("No matching ASIN, SKU, or SKU group was found locally.");

  if (options.onlyUnabridged) {
    if (isProviderBookUnabridged(providerBook)) {
      diagnostic.checks.push("Unabridged-only filter passed.");
    } else if (canIgnoreMissingFormatEvidence(providerBook, providerSeries)) {
      diagnostic.checks.push(
        "Unabridged-only filter not applied because this provider did not supply abridgement evidence."
      );
    } else {
      diagnostic.checks.push("Skipped by the unabridged-only filter.");
      return skip();
    }
  }

  if (options.ignoreNoPositionBooks && hasNoProviderSeriesPosition(providerBook, providerSeries)) {
    if (canIgnoreMissingPositionEvidence(providerSeries)) {
      diagnostic.checks.push(
        "No-position filter not applied because this provider did not supply reliable series positions."
      );
    } else {
      diagnostic.checks.push("Skipped because this book has no matched series position.");
      return skip();
    }
  }

  if (options.ignoreMultiBooks && hasMultiBookSeriesPosition(providerBook, providerSeries)) {
    diagnostic.checks.push("Skipped because this book spans multiple series positions.");
    return skip();
  }

  if (options.ignoreSubPositionBooks && hasSubSeriesPosition(providerBook, providerSeries)) {
    diagnostic.checks.push("Skipped because this book has a decimal sub-position.");
    return skip();
  }

  if (options.ignoreFutureDateBooks && isFutureReleaseDate(providerBook.releaseDate)) {
    diagnostic.checks.push("Skipped because this book has not been released yet.");
    return skip();
  }

  if (options.ignoreFuturePlaceholders && isFuturePlaceholderRelease(providerBook)) {
    diagnostic.checks.push(
      "Skipped because this looks like an empty future placeholder rather than a complete audiobook listing."
    );
    return skip();
  }

  if (options.ignorePastDateBooks && isPastReleaseDate(providerBook.releaseDate)) {
    diagnostic.checks.push("Skipped because this book has already been released.");
    return skip();
  }

  if (
    options.ignoreTitleSubtitle &&
    hasLocalTitleMatch(providerBook, allLocalBooks, {
      matchNarratorEditions: options.matchNarratorEditions,
    })
  ) {
    diagnostic.checks.push("Skipped because title/subtitle evidence matches a local book.");
    return skip();
  }
  if (options.ignoreTitleSubtitle) {
    if (
      options.matchNarratorEditions &&
      hasLocalTitleCandidateWithDifferentNarrator(providerBook, allLocalBooks)
    ) {
      diagnostic.shownBecause.push(
        "Narrator-sensitive matching found a local title, but the narrator did not match."
      );
    } else {
      diagnostic.shownBecause.push("No local title/subtitle evidence matched this provider book.");
    }
  }

  if (
    options.ignoreSameSeriesPosition &&
    hasLocalSeriesPositionMatch(providerBook, localSeries, providerSeries)
  ) {
    diagnostic.checks.push("Skipped because this series position already exists locally.");
    return skip();
  }
  if (options.ignoreSameSeriesPosition) {
    diagnostic.shownBecause.push(describeSeriesPositionMiss(providerBook, providerSeries));
  }

  return { action: "show", diagnostic };
}

/**
 * Purpose: Create the initial diagnostics record for one provider book.
 *
 * @param providerBook - Provider book being explained.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns A diagnostics object ready to receive check results.
 */
function buildBaseDiagnostic(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): MissingBookDiagnostic {
  return {
    asin: providerBook.asin,
    title: providerBook.title,
    shownBecause: [],
    checks: [],
    providerEvidence: [
      describeProviderRegion(providerBook, providerSeries),
      `Available: ${formatBooleanEvidence(providerBook.isAvailable)}`,
      `Buyable: ${formatBooleanEvidence(providerBook.isBuyable)}`,
      `Listenable: ${formatBooleanEvidence(providerBook.isListenable)}`,
      `Format: ${providerBook.bookFormat ?? "not supplied"}`,
      `Delivery type: ${providerBook.deliveryType ?? "not supplied"}`,
      `Has child products: ${formatBooleanEvidence(providerBook.hasChildren)}`,
      `Child relationship types: ${formatListEvidence(providerBook.childRelationshipTypes)}`,
      `Release date: ${providerBook.releaseDate ?? "not supplied"}`,
      `Matched position: ${getProviderSeriesPosition(providerBook, providerSeries) ?? "not supplied"}`,
    ],
  };
}

/**
 * Purpose: Decide whether the unabridged-only filter should tolerate missing
 * format evidence for cautious search providers.
 *
 * @param providerBook - Provider book being evaluated.
 * @param providerSeries - Provider series that supplied the book.
 * @returns `true` when the provider has explicitly marked format evidence as
 * unreliable and the book did not say whether it is abridged.
 */
function canIgnoreMissingFormatEvidence(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): boolean {
  return !providerBook.bookFormat && providerSeries.matchingRules?.includeFormat === false;
}

/**
 * Purpose: Decide whether no-position filtering should tolerate missing
 * position evidence for cautious search providers.
 *
 * @param providerSeries - Provider series that supplied the book.
 * @returns `true` when the provider has explicitly marked series-position
 * evidence as unreliable.
 */
function canIgnoreMissingPositionEvidence(providerSeries: ProviderSeriesCandidate): boolean {
  return providerSeries.matchingRules?.includeSeriesPosition === false;
}

/**
 * Purpose: Format optional boolean evidence for debug output.
 *
 * @param value - Optional boolean provider evidence.
 * @returns Human-readable true, false, or missing evidence text.
 */
function formatBooleanEvidence(value: boolean | undefined): string {
  if (value === undefined) return "not supplied";
  return value ? "yes" : "no";
}

/**
 * Purpose: Format optional list evidence for debug output.
 *
 * @param values - Optional provider evidence values.
 * @returns Comma-separated values, or missing evidence text.
 */
function formatListEvidence(values: string[] | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "not supplied";
}

/**
 * Purpose: Describe why the same-position ownership filter did not hide a
 * provider book.
 *
 * @param providerBook - Provider book that survived the same-position check.
 * @param providerSeries - Provider series selected by the matching step.
 * @returns Human-readable same-position diagnostic text.
 */
function describeSeriesPositionMiss(
  providerBook: ProviderSeriesBook,
  providerSeries: ProviderSeriesCandidate
): string {
  const providerPosition = getProviderSeriesPosition(providerBook, providerSeries);
  if (providerPosition === null) return "No provider series position was available to match.";

  return `No local book was found at provider series position ${providerPosition}.`;
}
