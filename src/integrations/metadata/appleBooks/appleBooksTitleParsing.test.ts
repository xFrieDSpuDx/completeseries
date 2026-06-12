import { describe, expect, it } from "vitest";
import {
  inferAppleBooksFormat,
  splitAppleBooksTitle,
} from "./appleBooksTitleParsing";

describe("appleBooksTitleParsing", () => {
  it("splits title suffixes that look like series metadata", () => {
    expect(splitAppleBooksTitle("First Book: Known Series, Book 1", "Known Series")).toEqual({
      title: "First Book",
      subtitle: "Known Series, Book 1",
      position: "1",
    });
  });

  it("extracts positions from parenthetical book metadata", () => {
    expect(splitAppleBooksTitle("Side Story (Book 3.5)", "Known Series")).toEqual({
      title: "Side Story",
      subtitle: "Book 3.5",
      position: "3.5",
    });
  });

  it("infers abridgement only when Apple exposes it in visible text", () => {
    expect(inferAppleBooksFormat("A Tale (Unabridged)")).toBe("unabridged");
    expect(inferAppleBooksFormat("A Tale (Abridged)")).toBe("abridged");
    expect(inferAppleBooksFormat("A Tale")).toBeNull();
  });
});
