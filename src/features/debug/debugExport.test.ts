import { describe, expect, it } from "vitest";
import type { DebugTableRow } from "./debugPanelRows";
import { buildDebugCsvExport } from "./debugExport";

describe("buildDebugCsvExport", () => {
  it("exports debug rows with decision evidence", () => {
    const csv = buildDebugCsvExport([
      {
        action: "show",
        checkLabels: ["Shown result", "Series position"],
        diagnostic: {
          asin: "B0BOOK",
          checks: ["No local book was found at provider series position #2."],
          providerEvidence: ["Provider series position #2."],
          shownBecause: ["No matching ASIN was found locally."],
          title: "Known Book",
        },
        finishedAt: "2026-05-27T20:00:00.000Z",
        scanId: "scan-1",
        scanLabel: "Current",
        seriesName: "Known Series",
      },
    ] satisfies DebugTableRow[]);

    expect(csv).toContain('"Current","show","Shown result; Series position","B0BOOK"');
    expect(csv).toContain("No matching ASIN was found locally.");
  });
});
