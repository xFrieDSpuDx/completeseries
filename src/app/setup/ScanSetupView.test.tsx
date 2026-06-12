import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanProgressView } from "./ScanProgressView";
import { ScanSetupView } from "./ScanSetupView";

describe("scan setup views", () => {
  it("renders library, region, provider, and filter controls after login", () => {
    const html = renderToStaticMarkup(
      <ScanSetupView
        error=""
        isScanning={false}
        onStartScan={async () => undefined}
        session={{
          serverUrl: "https://abs.example.test",
          apiKey: "test-key",
          libraries: [
            { id: "fiction", name: "Fiction" },
            { id: "non-fiction", name: "Non-fiction" },
          ],
        }}
      />
    );

    expect(html).toContain("Select libraries");
    expect(html).toContain("audiobook libraries selected");
    expect(html).toContain("Catalogue Region");
    expect(html).toContain("Metadata Providers");
    expect(html).toContain("Scan filters");
    expect(html).toContain("Scan selected libraries");
  });

  it("renders scan progress with recent activity", () => {
    const html = renderToStaticMarkup(
      <ScanProgressView
        status="Checking metadata 2 / 4: Discworld"
        progressLog={["Fetching Audiobookshelf books...", "Checking metadata 1 / 4: Rivers"]}
      />
    );

    expect(html).toContain("Scanning your library");
    expect(html).toContain("Checking metadata 2 / 4: Discworld");
    expect(html).toContain("Fetching Audiobookshelf books...");
    expect(html).toContain("Checking metadata 1 / 4: Rivers");
  });
});
