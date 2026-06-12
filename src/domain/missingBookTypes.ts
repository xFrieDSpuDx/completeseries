import type { ProviderSeriesBook, RegionCode } from "./audiobook";
import type { ManualBookMatch } from "./manualBookMatches";

export type MissingBookOptions = {
  region: RegionCode;
  onlyUnabridged: boolean;
  ignoreMultiBooks: boolean;
  ignoreNoPositionBooks: boolean;
  ignoreSubPositionBooks: boolean;
  ignoreFutureDateBooks: boolean;
  ignoreFuturePlaceholders: boolean;
  ignorePastDateBooks: boolean;
  ignoreTitleSubtitle: boolean;
  ignoreSameSeriesPosition: boolean;
  ignoreTitleSubtitleInMissingArray: boolean;
  ignoreSameSeriesPositionInMissingArray: boolean;
  matchNarratorEditions: boolean;
  manualBookMatches?: ManualBookMatch[];
};

export type MissingBookDiagnostic = {
  asin: string;
  title: string;
  shownBecause: string[];
  checks: string[];
  providerEvidence: string[];
};

export type MissingBookDebugDecision = {
  action: "show" | "skip";
  diagnostic: MissingBookDiagnostic;
};

export type MissingBookConfidence = {
  score: number;
  label: string;
  reason: string;
};

export type MergedSeriesSource = {
  seriesName: string;
  seriesAsin: string;
  providerId?: string;
  providerName?: string;
  missingBookCount: number;
};

export type MissingBookGroup = {
  seriesName: string;
  seriesAsin: string;
  providerId?: string;
  providerName?: string;
  confidence?: MissingBookConfidence;
  mergedFrom?: MergedSeriesSource[];
  books: ProviderSeriesBook[];
  diagnosticsByAsin: Record<string, MissingBookDiagnostic>;
  debugDecisions: MissingBookDebugDecision[];
};
