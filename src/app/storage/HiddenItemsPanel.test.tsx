import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HiddenItemsPanel } from "./HiddenItemsPanel";
import type { HiddenItem } from "./hiddenItemsStore";

function buildHiddenBook(index: number): HiddenItem {
  return {
    type: "book",
    seriesName: `Series ${index}`,
    seriesAsin: `SERIES-${index}`,
    title: `Hidden Book ${index}`,
    asin: `B000${index.toString().padStart(4, "0")}`,
    hiddenAt: "2026-06-12T09:00:00.000Z",
  };
}

describe("HiddenItemsPanel", () => {
  it("renders an empty state and disables clear when nothing is hidden", () => {
    const html = renderToStaticMarkup(
      <HiddenItemsPanel
        hiddenItems={[]}
        onClear={() => undefined}
        onUnhide={() => undefined}
        onShowHiddenChange={() => undefined}
        showHidden={false}
      />
    );

    expect(html).toContain("Hidden items");
    expect(html).toContain("0 series, 0 books");
    expect(html).toContain("Show hidden items");
    expect(html).toContain("disabled");
    expect(html).toContain("No hidden series");
    expect(html).toContain("No hidden books");
  });

  it("renders search and overflow guidance for large hidden lists", () => {
    const hiddenItems = [
      {
        type: "series" as const,
        seriesName: "Hidden Series",
        seriesAsin: "SERIES-HIDDEN",
        hiddenAt: "2026-06-12T09:00:00.000Z",
      },
      ...Array.from({ length: 151 }, (_, index) => buildHiddenBook(index + 1)),
    ];
    const html = renderToStaticMarkup(
      <HiddenItemsPanel
        hiddenItems={hiddenItems}
        onClear={() => undefined}
        onUnhide={() => undefined}
        showHidden
      />
    );

    expect(html).toContain("1 series, 151 books");
    expect(html).toContain("Search hidden items");
    expect(html).toContain("Hidden Series");
    expect(html).toContain("Series 1: Hidden Book 1");
    expect(html).toContain("Showing first 150 of 151");
    expect(html).not.toContain("Show hidden items");
  });
});
