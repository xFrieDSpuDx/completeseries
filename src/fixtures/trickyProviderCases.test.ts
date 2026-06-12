import { describe, expect, it } from "vitest";
import { matchLocalSeriesToProviderSeries } from "../domain/matching";
import { getTrickyProviderFixture } from "./trickyProviderCases";

describe("tricky provider matching fixtures", () => {
  it("keeps alternate narrator editions below the confident-match threshold", () => {
    const fixture = getTrickyProviderFixture("Alternate narrator edition");
    const match = matchLocalSeriesToProviderSeries(fixture.localSeries, fixture.candidates);

    expect(match.status).toBe("unresolved");
    expect(match.signals.titleMatches).toBe(1);
    expect(match.signals.positionMatches).toBe(1);
    expect(match.signals.asinMatches).toBe(0);
  });

  it("keeps review-only providers unresolved even with strong ISBN evidence", () => {
    const fixture = getTrickyProviderFixture("Review-only ISBN evidence");
    const match = matchLocalSeriesToProviderSeries(fixture.localSeries, fixture.candidates);

    expect(match.status).toBe("unresolved");
    expect(match.score).toBeGreaterThanOrEqual(55);
    expect(match.signals.isbnMatches).toBe(1);
  });
});
