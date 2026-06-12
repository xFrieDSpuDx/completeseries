import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookDiagnosticDetails } from "./BookDiagnosticDetails";

describe("BookDiagnosticDetails", () => {
  it("renders shown reasons and provider evidence", () => {
    const html = renderToStaticMarkup(
      <BookDiagnosticDetails
        diagnostic={{
          asin: "B123",
          title: "Shown Book",
          checks: [],
          shownBecause: ["Title/subtitle not owned."],
          providerEvidence: ["Provider: Audible catalogue."],
        }}
      />
    );

    expect(html).toContain("Why listed?");
    expect(html).toContain("Title/subtitle not owned.");
    expect(html).toContain("Provider: Audible catalogue.");
  });
});
