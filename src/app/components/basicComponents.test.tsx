import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoverImage } from "./CoverImage";
import { InfoPopover } from "./InfoPopover";
import { ReadMoreText } from "./ReadMoreText";

describe("basic app components", () => {
  it("renders an accessible info popover", () => {
    const html = renderToStaticMarkup(
      <InfoPopover ariaLabel="Explain search depth">Balanced scans a few anchors.</InfoPopover>
    );

    expect(html).toContain("aria-label=\"Explain search depth\"");
    expect(html).toContain("Balanced scans a few anchors.");
  });

  it("collapses long read-more text and leaves short text alone", () => {
    const longHtml = renderToStaticMarkup(
      <ReadMoreText maxLength={12} text="This overview is deliberately long." />
    );
    const shortHtml = renderToStaticMarkup(<ReadMoreText maxLength={50} text="Short overview." />);

    expect(longHtml).toContain("This overvie...");
    expect(longHtml).toContain("Read full overview");
    expect(shortHtml).toContain("Short overview.");
    expect(shortHtml).not.toContain("Read full overview");
  });

  it("requests provider cover images without sending a referrer", () => {
    const html = renderToStaticMarkup(<CoverImage src="https://example.com/cover.jpg" />);

    expect(html).toContain("decoding=\"async\"");
    expect(html).toContain("referrerPolicy=\"no-referrer\"");
    expect(html).toContain("https://example.com/cover.jpg");
  });
});
