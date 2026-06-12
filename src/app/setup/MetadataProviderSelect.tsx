import type { MetadataProviderId } from "../../features/scan/runLibraryScan";
import {
  getMetadataProviderSelectionLabel,
  metadataProviderOptions,
} from "../../integrations/metadata/metadataProviderRegistry";
import { isGoogleBooksApiKeyConfigured } from "../../integrations/metadata/googleBooksApi";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";

type MetadataProviderSelectProps = {
  googleBooksApiKey?: string;
  id: string;
  label: string;
  onGoogleBooksApiKeyChange?: (apiKey: string) => void;
  onChange: (providerIds: MetadataProviderId[]) => void;
  providerIds: MetadataProviderId[];
};

/**
 * Purpose: Render a dropdown-style multi-select for metadata providers while
 * keeping at least one provider selected.
 *
 * @param props - Provider select inputs.
 * @param props.id - Stable id prefix used for accessible labels and controls.
 * @param props.label - Visible label for the provider selector.
 * @param props.onChange - Callback receiving the updated provider id list.
 * @param props.providerIds - Currently selected metadata provider ids.
 * @returns A compact provider selector that can be shared by setup and filter
 * panels.
 */
export function MetadataProviderSelect({
  googleBooksApiKey = "",
  id,
  label,
  onGoogleBooksApiKeyChange,
  onChange,
  providerIds,
}: MetadataProviderSelectProps) {
  const hasAppleBooksSelected = providerIds.includes("appleBooks");
  const hasGoogleBooksSelected = providerIds.includes("googleBooks");
  const hasGoogleBooksApiKey = isGoogleBooksApiKeyConfigured(googleBooksApiKey);
  const hasOpenLibrarySelected = providerIds.includes("openLibrary");
  const googleBooksApiKeyInputId = `${id}GoogleBooksApiKey`;

  return (
    <>
      <MultiSelectDropdown
        id={id}
        keepOneSelected
        label={label}
        options={metadataProviderOptions.map((provider) => ({
          label: provider.label,
          value: provider.id,
        }))}
        selectedValues={providerIds}
        summary={getMetadataProviderSelectionLabel(providerIds)}
        onChange={onChange}
      />
      {hasAppleBooksSelected ? (
        <p className="provider-limitation-warning">
          Apple Books is search-only. Matching is limited to title, author, series-name text, and
          ISBN when Apple resolves it, so reliability and some filters are limited.
        </p>
      ) : null}
      {hasGoogleBooksSelected ? (
        <>
          {onGoogleBooksApiKeyChange ? (
            <div className="provider-api-key-field">
              <div className="filter-label-with-help">
                <label htmlFor={googleBooksApiKeyInputId}>Google Books API key</label>
              </div>
              <input
                autoComplete="off"
                id={googleBooksApiKeyInputId}
                placeholder="Google Books API key"
                type="password"
                value={googleBooksApiKey}
                onChange={(event) => onGoogleBooksApiKeyChange(event.target.value)}
              />
            </div>
          ) : null}
          <p className="provider-limitation-warning">
            Google Books searches Google's general book catalogue. It can help with title, author,
            edition, and ISBN evidence, but availability, format, and series completeness are
            limited.
            {!hasGoogleBooksApiKey
              ? " Add a Google Books API key to use Google Books results."
              : " Google requests will use this API key."}
          </p>
        </>
      ) : null}
      {hasOpenLibrarySelected ? (
        <p className="provider-limitation-warning">
          Open Library is not audiobook-specific. It can help with title, author, work, edition,
          and ISBN evidence, but availability, format, and series completeness are limited.
        </p>
      ) : null}
    </>
  );
}
