import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChangeLogPanel } from "./ChangeLogPanel";

describe("ChangeLogPanel", () => {
  it("renders the V2 public build notes", () => {
    const html = renderToStaticMarkup(<ChangeLogPanel />);

    expect(html).toContain("Complete Series V2 first public build");
    expect(html).toContain("Replaced the PHP flow");
    expect(html).toContain("Added Apple Books, Google Books, and Open Library");
  });
});
