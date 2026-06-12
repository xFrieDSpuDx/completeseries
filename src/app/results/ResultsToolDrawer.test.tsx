import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultsToolDrawer } from "./ResultsToolDrawer";

describe("ResultsToolDrawer", () => {
  it("renders a labelled fullscreen drawer with a close control", () => {
    const html = renderToStaticMarkup(
      <ResultsToolDrawer
        contentClassName="tool-drawer-content--debug"
        title="Debug checks"
        variant="fullscreen"
        onClose={() => undefined}
      >
        <p>Drawer body</p>
      </ResultsToolDrawer>
    );

    expect(html).toContain("role=\"dialog\"");
    expect(html).toContain("tool-drawer-shell--fullscreen");
    expect(html).toContain("Debug checks");
    expect(html).toContain("Drawer body");
    expect(html).toContain("aria-label=\"Close\"");
  });
});
