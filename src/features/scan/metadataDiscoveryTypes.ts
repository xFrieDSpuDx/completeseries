import type { RegionCode } from "../../domain/audiobook";
import type {
  MetadataProviderId,
  MetadataProviderSearchMode,
} from "../../integrations/metadata/metadataProviderRegistry";
import type { ManualSeriesMatch } from "./manualSeriesMatches";
import type { MetadataLookupMode } from "./metadataLookupAsins";

export type MetadataDiscoveryOptions = {
  cacheMetadata: boolean;
  includeSubSeries: boolean;
  manualSeriesMatches?: ManualSeriesMatch[];
  metadataLookupMode: MetadataLookupMode;
  metadataProviderIds?: MetadataProviderId[];
  metadataProviderSearchMode: MetadataProviderSearchMode;
  googleBooksApiKey?: string;
  region: RegionCode;
};
