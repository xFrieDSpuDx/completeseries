import { describe, expect, it } from "vitest";
import type { ScanOptions, ScanResult } from "../scan/runLibraryScan";
import { buildDebugHistoryEntry } from "./debugHistory";

const EMPTY_SCAN_RESULT: ScanResult = {
  librariesScanned: 1,
  localSeriesCount: 0,
  matchedSeriesCount: 0,
  missingBookCount: 0,
  missingGroups: [],
  seriesReports: [],
  unresolvedSeries: [],
};

const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  mode: "password",
  username: "demo",
  password: "demo",
  serverUrl: "http://127.0.0.1:9192",
  region: "uk",
  includeSubSeries: true,
  metadataLookupMode: "balanced",
  metadataProviderIds: ["audible"],
  metadataProviderSearchMode: "firstMatch",
  onlyUnabridged: true,
  ignoreMultiBooks: false,
  ignoreNoPositionBooks: false,
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

describe("buildDebugHistoryEntry", () => {
  it("creates unique scan ids even when scans finish at the same time", () => {
    const finishedAt = new Date("2026-05-26T22:58:00.000Z");
    const firstEntry = buildDebugHistoryEntry(EMPTY_SCAN_RESULT, DEFAULT_SCAN_OPTIONS, finishedAt);
    const secondEntry = buildDebugHistoryEntry(EMPTY_SCAN_RESULT, DEFAULT_SCAN_OPTIONS, finishedAt);

    expect(firstEntry.id).toMatch(/^scan-20260526225800000-[a-z0-9]+$/);
    expect(secondEntry.id).toMatch(/^scan-20260526225800000-[a-z0-9]+$/);
    expect(firstEntry.id).not.toBe(secondEntry.id);
  });
});
