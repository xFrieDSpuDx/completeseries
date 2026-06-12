import type { LocalSeriesEvidence, ProviderSeriesCandidate } from "../domain/audiobook";
import { parseSeriesPosition } from "../domain/normalise";

export const demoLocalSeries: LocalSeriesEvidence[] = [
  {
    id: "ciaphas-cain-local",
    name: "Ciaphas Cain: Warhammer 40,000",
    books: [
      {
        id: "ciaphas-1",
        title: "For the Emperor",
        asin: "WRONG_REGION_ASIN",
        authors: ["Sandy Mitchell"],
        narrators: [],
        position: parseSeriesPosition("1"),
      },
      {
        id: "ciaphas-3",
        title: "The Traitor's Hand",
        asin: "B012KNOWN",
        sku: "BK_GAWO_000123UK",
        authors: ["Sandy Mitchell"],
        narrators: [],
        position: parseSeriesPosition("3"),
      },
    ],
  },
  {
    id: "unresolved-local",
    name: "A Local Series Without Provider Evidence",
    books: [
      {
        id: "unresolved-1",
        title: "Unknown Local Book",
        authors: ["Local Author"],
        narrators: [],
        position: parseSeriesPosition("1"),
      },
    ],
  },
];

export const demoProviderSeries: ProviderSeriesCandidate[] = [
  {
    seriesAsin: "B07CN5BG3H",
    name: "Ciaphas Cain: Warhammer 40,000",
    region: "uk",
    books: [
      {
        asin: "B012KNOWN",
        title: "The Traitor's Hand",
        sku: "BK_GAWO_000123UK",
        authors: ["Sandy Mitchell"],
        narrators: [],
        isAvailable: true,
        series: [{ asin: "B07CN5BG3H", name: "Ciaphas Cain: Warhammer 40,000", position: "3" }],
      },
    ],
  },
  {
    seriesAsin: "B000OTHER",
    name: "Unrelated Provider Series",
    region: "uk",
    books: [
      {
        asin: "B000OTHERBOOK",
        title: "Other Title",
        authors: ["Other Author"],
        narrators: [],
        isAvailable: true,
        series: [{ asin: "B000OTHER", name: "Unrelated Provider Series", position: "1" }],
      },
    ],
  },
];
