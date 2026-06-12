import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultsDownloadPanel } from "./ResultsDownloadPanel";

describe("ResultsDownloadPanel", () => {
  it("groups result, debug, and local data downloads together", () => {
    const html = renderToStaticMarkup(
      <ResultsDownloadPanel
        onExportCsv={() => undefined}
        onExportDebugCsv={() => undefined}
        onExportDebugJson={() => undefined}
        onExportJson={() => undefined}
        onExportLocalData={() => undefined}
      />
    );

    expect(html).toContain("Missing books CSV");
    expect(html).toContain("Missing books JSON");
    expect(html).toContain("Debug checks CSV");
    expect(html).toContain("Debug checks JSON");
    expect(html).toContain("Local data backup");
    expect(html).toContain("Hidden items, manual matches, saved filters");
  });
});
