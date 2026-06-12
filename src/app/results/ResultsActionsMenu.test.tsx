import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultsActionsMenu } from "./ResultsActionsMenu";

describe("ResultsActionsMenu", () => {
  it("renders grouped result actions and the low-confidence toggle", () => {
    const html = renderToStaticMarkup(
      <ResultsActionsMenu
        lowConfidenceCount={4}
        showLowConfidenceResults={true}
        sortOrder="seriesAsc"
        onOpenTool={() => undefined}
        onScanAgain={() => undefined}
        onShowLowConfidenceChange={() => undefined}
        onSortOrderChange={() => undefined}
      />
    );

    expect(html).toContain("View");
    expect(html).toContain("Scan");
    expect(html).toContain("Inspect");
    expect(html).toContain("Manage");
    expect(html).toContain("Less confident (4)");
    expect(html).toContain("results-command-toggle--active");
    expect(html).toContain("Download");
  });

  it("disables scan again when no scan callback is available", () => {
    const html = renderToStaticMarkup(
      <ResultsActionsMenu
        lowConfidenceCount={0}
        showLowConfidenceResults={false}
        sortOrder="authorAsc"
        onOpenTool={() => undefined}
        onShowLowConfidenceChange={() => undefined}
        onSortOrderChange={() => undefined}
      />
    );

    expect(html).toContain("Scan again");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Less confident");
  });
});
