import type { RegionCode } from "../../domain/audiobook";
import type {
  MetadataLookupMode,
  MetadataProviderId,
  MetadataProviderSearchMode,
  ScanConnectionOptions,
  ScanOptions,
} from "../../features/scan/runLibraryScan";
import {
  defaultMetadataProviderIds,
  defaultMetadataProviderSearchMode,
} from "../../integrations/metadata/metadataProviderRegistry";

export type AuthMode = "apiKey" | "password";

export type ConnectionFormValues = {
  serverUrl: string;
  authMode: AuthMode;
  apiKey: string;
  username: string;
  password: string;
};

export type ScanFilters = Pick<
  ScanOptions,
  | "includeSubSeries"
  | "metadataLookupMode"
  | "metadataProviderIds"
  | "metadataProviderSearchMode"
  | "googleBooksApiKey"
  | "onlyUnabridged"
  | "ignoreMultiBooks"
  | "ignoreNoPositionBooks"
  | "ignoreSubPositionBooks"
  | "ignoreFutureDateBooks"
  | "ignoreFuturePlaceholders"
  | "ignorePastDateBooks"
  | "ignoreTitleSubtitle"
  | "ignoreSameSeriesPosition"
  | "ignoreTitleSubtitleInMissingArray"
  | "ignoreSameSeriesPositionInMissingArray"
  | "matchNarratorEditions"
  | "cacheMetadata"
>;

export const defaultScanFilters: ScanFilters = {
  includeSubSeries: false,
  metadataLookupMode: "balanced" satisfies MetadataLookupMode,
  metadataProviderIds: defaultMetadataProviderIds satisfies MetadataProviderId[],
  metadataProviderSearchMode:
    defaultMetadataProviderSearchMode satisfies MetadataProviderSearchMode,
  googleBooksApiKey: "",
  onlyUnabridged: true,
  ignoreMultiBooks: true,
  ignoreNoPositionBooks: true,
  ignoreSubPositionBooks: false,
  ignoreFutureDateBooks: false,
  ignoreFuturePlaceholders: true,
  ignorePastDateBooks: false,
  ignoreTitleSubtitle: true,
  ignoreSameSeriesPosition: true,
  ignoreTitleSubtitleInMissingArray: false,
  ignoreSameSeriesPositionInMissingArray: false,
  matchNarratorEditions: false,
  cacheMetadata: true,
};

export const defaultConnectionFormValues: ConnectionFormValues = {
  serverUrl: "",
  authMode: "password",
  apiKey: "",
  username: "",
  password: "",
};

export const regions: Array<{ value: RegionCode; label: string }> = [
  { value: "uk", label: "United Kingdom" },
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "jp", label: "Japan" },
  { value: "it", label: "Italy" },
  { value: "in", label: "India" },
  { value: "es", label: "Spain" },
  { value: "br", label: "Brazil" },
];

/**
 * Purpose: Convert login-form values into the scan feature's Audiobookshelf
 * connection options.
 *
 * @param values - Current login form values, including the chosen auth mode.
 * @returns Connection options using either API-key auth or username/password
 * auth.
 */
export function buildConnectionOptions(values: ConnectionFormValues): ScanConnectionOptions {
  return {
    serverUrl: values.serverUrl,
    ...(values.authMode === "apiKey"
      ? { mode: "apiKey" as const, apiKey: values.apiKey }
      : { mode: "password" as const, username: values.username, password: values.password }),
  };
}

/**
 * Purpose: Validate the Audiobookshelf connection values before attempting to
 * login.
 *
 * @param values - Current login form values.
 * @returns An error message when validation fails, otherwise an empty string.
 */
export function validateConnectionValues(values: ConnectionFormValues): string {
  if (!values.serverUrl.trim()) return "Audiobookshelf URL is required.";
  if (values.authMode === "apiKey" && !values.apiKey.trim()) return "API key is required.";
  if (values.authMode === "password" && (!values.username.trim() || !values.password)) {
    return "Username and password are required.";
  }

  return "";
}
