import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("starts on the Audiobookshelf login screen", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Audiobookshelf Server URL");
    expect(html).toContain("Login Method");
    expect(html).toContain("Password");
    expect(html).toContain("Change log");
  });
});
