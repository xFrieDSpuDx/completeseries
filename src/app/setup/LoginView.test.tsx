import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginView } from "./LoginView";

describe("LoginView", () => {
  it("keeps the change log as a subtle action after the login form", () => {
    const html = renderToStaticMarkup(
      <LoginView
        error=""
        isLoggingIn={false}
        onImportHiddenItems={() => undefined}
        onImportManualBookMatches={() => undefined}
        onImportManualSeriesMatches={() => undefined}
        onLogin={async () => undefined}
        status=""
      />
    );

    expect(html).not.toContain("Open change log");
    expect(html.indexOf('type="submit"')).toBeLessThan(html.indexOf("Change log"));
  });
});
