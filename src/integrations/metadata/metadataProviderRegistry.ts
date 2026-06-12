import { appleBooksProvider } from "./appleBooksProvider";
import { audibleProvider } from "./audibleProvider";
import { googleBooksProvider } from "./googleBooksProvider";
import { openLibraryProvider } from "./openLibraryProvider";
import type {
  MetadataProvider,
  MetadataProviderCapabilities,
  MetadataProviderEvidenceLevel,
  MetadataProviderId,
  MetadataProviderSearchMode,
} from "./metadataProvider";

export type { MetadataProviderId, MetadataProviderSearchMode } from "./metadataProvider";

export type MetadataProviderLifecycle = "primary" | "experimental";

export type MetadataProviderRegistryEntry = {
  defaultSelected: boolean;
  description: string;
  evidenceLevel: MetadataProviderEvidenceLevel;
  lifecycle: MetadataProviderLifecycle;
  provider: MetadataProvider;
};

export type MetadataProviderOption = {
  capabilities: MetadataProviderCapabilities;
  defaultSelected: boolean;
  description: string;
  evidenceLevel: MetadataProviderEvidenceLevel;
  id: MetadataProviderId;
  label: string;
  lifecycle: MetadataProviderLifecycle;
};

export const metadataProviderRegistry: MetadataProviderRegistryEntry[] = [
  {
    defaultSelected: true,
    description: "Direct public Audible catalogue lookups.",
    evidenceLevel: "trusted",
    lifecycle: "primary",
    provider: audibleProvider,
  },
  {
    defaultSelected: false,
    description: "Limited Apple Books search evidence for review workflows.",
    evidenceLevel: "review",
    lifecycle: "experimental",
    provider: appleBooksProvider,
  },
  {
    defaultSelected: false,
    description: "Book catalogue evidence for review workflows.",
    evidenceLevel: "review",
    lifecycle: "experimental",
    provider: googleBooksProvider,
  },
  {
    defaultSelected: false,
    description: "Open book catalogue evidence for review workflows.",
    evidenceLevel: "review",
    lifecycle: "experimental",
    provider: openLibraryProvider,
  },
];

export const metadataProviders: MetadataProvider[] = metadataProviderRegistry.map(
  (entry) => entry.provider
);

export const defaultMetadataProviderIds: MetadataProviderId[] = metadataProviderRegistry
  .filter((entry) => entry.defaultSelected)
  .map((entry) => entry.provider.id);

export const defaultMetadataProviderSearchMode: MetadataProviderSearchMode = "firstMatch";

export const metadataProviderOptions: MetadataProviderOption[] = metadataProviderRegistry.map(
  (entry) => ({
    capabilities: entry.provider.capabilities,
    defaultSelected: entry.defaultSelected,
    description: entry.description,
    evidenceLevel: entry.evidenceLevel,
    id: entry.provider.id,
    label: entry.provider.displayName,
    lifecycle: entry.lifecycle,
  })
);

/**
 * Purpose: Convert saved or user-selected provider ids into valid provider ids
 * while preserving registry order.
 *
 * @param providerIds - Provider ids from saved preferences or current UI state.
 * @returns Valid provider ids, defaulting to the configured primary providers
 * when nothing usable is selected.
 */
export function normaliseMetadataProviderIds(
  providerIds: readonly string[] | undefined
): MetadataProviderId[] {
  const selectedIds = new Set(providerIds ?? []);
  const validIds = metadataProviderRegistry
    .map((entry) => entry.provider.id)
    .filter((providerId) => selectedIds.has(providerId));

  return validIds.length > 0 ? validIds : defaultMetadataProviderIds;
}

/**
 * Purpose: Resolve selected provider ids to provider adapters in registry
 * order.
 *
 * @param providerIds - Provider ids selected for the scan.
 * @returns Metadata providers to query during discovery and enrichment.
 */
export function getMetadataProvidersById(
  providerIds: readonly string[] | undefined
): MetadataProvider[] {
  const validIds = new Set(normaliseMetadataProviderIds(providerIds));

  return metadataProviderRegistry
    .filter((entry) => validIds.has(entry.provider.id))
    .map((entry) => entry.provider);
}

/**
 * Purpose: Build a compact label for the selected metadata providers.
 *
 * @param providerIds - Provider ids selected for the scan.
 * @returns Human-readable provider selection label.
 */
export function getMetadataProviderSelectionLabel(
  providerIds: readonly string[] | undefined
): string {
  const selectedProviders = getMetadataProvidersById(providerIds);

  if (selectedProviders.length === 1) return selectedProviders[0].displayName;
  return `${selectedProviders.length} metadata providers`;
}

/**
 * Purpose: Convert provider search mode into a compact label for scan
 * summaries.
 *
 * @param searchMode - Provider search strategy used during discovery.
 * @returns Human-readable search mode label.
 */
export function getMetadataProviderSearchModeLabel(
  searchMode: MetadataProviderSearchMode
): string {
  return searchMode === "deep" ? "Deep provider search" : "First provider match";
}
