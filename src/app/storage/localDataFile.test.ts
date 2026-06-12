import { describe, expect, it } from "vitest";
import { buildImportMessage } from "./localDataFile";

describe("buildImportMessage", () => {
  it("mentions imported provider response cache records", () => {
    expect(buildImportMessage(1, 1, 1, true, true, 1)).toBe(
      "1 hidden item, 1 owned-book match, 1 series override, saved filters, result display settings, 1 provider response cache record imported."
    );
  });
});
