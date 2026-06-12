import type { MetadataProviderEvidenceLevel } from "../../integrations/metadata/metadataProvider";
import type { MetadataProvider } from "../../integrations/metadata/metadataProvider";

export type ProviderDiscoveryStepStatus = "empty" | "failed" | "skipped" | "success";

export type ProviderDiscoveryStep = {
  candidateCount?: number;
  detail?: string;
  label: string;
  requestCount?: number;
  status: ProviderDiscoveryStepStatus;
};

export type ProviderDiscoveryTrace = {
  evidenceLevel: MetadataProviderEvidenceLevel;
  providerId: string;
  providerName: string;
  steps: ProviderDiscoveryStep[];
};

/**
 * Purpose: Create the scan trace used to explain how one metadata provider was
 * queried for a local series.
 *
 * @param metadataProvider - Provider being queried during discovery.
 * @returns Empty provider trace ready to receive discovery steps.
 */
export function createProviderDiscoveryTrace(
  metadataProvider: MetadataProvider
): ProviderDiscoveryTrace {
  return {
    evidenceLevel: metadataProvider.evidenceLevel,
    providerId: metadataProvider.id,
    providerName: metadataProvider.displayName,
    steps: [],
  };
}

/**
 * Purpose: Append one provider discovery step when a trace is available.
 *
 * @param trace - Optional trace for the provider currently being queried.
 * @param step - Step summary to append.
 * @returns Nothing. The trace is updated in place.
 */
export function appendProviderDiscoveryStep(
  trace: ProviderDiscoveryTrace | undefined,
  step: ProviderDiscoveryStep
): void {
  trace?.steps.push(step);
}

/**
 * Purpose: Convert a candidate count into a provider trace status.
 *
 * @param candidateCount - Number of candidates or identifiers found.
 * @returns Success when at least one candidate was found, otherwise empty.
 */
export function getCandidateTraceStatus(candidateCount: number): ProviderDiscoveryStepStatus {
  return candidateCount > 0 ? "success" : "empty";
}
