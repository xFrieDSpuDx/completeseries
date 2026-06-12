import type { LocalSeriesEvidence, ProviderSeriesCandidate } from "../domain/audiobook";
import { parseSeriesPosition } from "../domain/normalise";

export type ProviderMatchingFixture = {
  candidates: ProviderSeriesCandidate[];
  description: string;
  localSeries: LocalSeriesEvidence;
  name: string;
};

export const trickyProviderMatchingFixtures: ProviderMatchingFixture[] = [
  {
    name: "Alternate narrator edition",
    description:
      "A provider returns an older edition of a book the user owns in a newer Audible edition.",
    localSeries: {
      id: "fixture-discworld-local",
      name: "Discworld",
      books: [
        {
          id: "fixture-monstrous-regiment-local",
          title: "Monstrous Regiment",
          asin: "B09MDKHZV5",
          authors: ["Terry Pratchett"],
          narrators: ["Katherine Parkinson", "Bill Nighy", "Peter Serafinowicz"],
          position: parseSeriesPosition("31"),
        },
      ],
    },
    candidates: [
      {
        seriesAsin: "fixture-discworld-provider",
        name: "Discworld",
        providerId: "audible",
        providerName: "Audible catalogue",
        evidenceLevel: "trusted",
        books: [
          {
            asin: "B07HS46RRD",
            title: "Monstrous Regiment",
            authors: ["Terry Pratchett"],
            narrators: ["Stephen Briggs"],
            series: [{ asin: "fixture-discworld-provider", name: "Discworld", position: "31" }],
          },
        ],
      },
    ],
  },
  {
    name: "Review-only ISBN evidence",
    description:
      "A non-audiobook catalogue provider finds matching ISBN/title evidence but must still ask for user review.",
    localSeries: {
      id: "fixture-google-local",
      name: "Dungeon Crawler Carl",
      books: [
        {
          id: "fixture-dungeon-crawler-carl-local",
          title: "Dungeon Crawler Carl",
          isbn: "978-1-954891-16-2",
          authors: ["Matt Dinniman"],
          narrators: ["Jeff Hays"],
          position: parseSeriesPosition("1"),
        },
      ],
    },
    candidates: [
      {
        automaticMatch: false,
        seriesAsin: "google-books:search:Dungeon%20Crawler%20Carl",
        name: "Dungeon Crawler Carl",
        providerId: "googleBooks",
        providerName: "Google Books",
        evidenceLevel: "review",
        matchingRules: {
          includeFormat: false,
          includeSeriesPosition: false,
          includeSubtitle: false,
        },
        books: [
          {
            asin: "google-books:volume:dungeon-crawler-carl",
            title: "Dungeon Crawler Carl",
            isbn: "9781954891162",
            authors: ["Matt Dinniman"],
            narrators: [],
            series: [
              {
                asin: "google-books:search:Dungeon%20Crawler%20Carl",
                name: "Dungeon Crawler Carl",
                position: null,
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Purpose: Load a named tricky provider fixture for focused regression tests.
 *
 * @param name - Fixture name to find.
 * @returns Matching fixture.
 */
export function getTrickyProviderFixture(name: string): ProviderMatchingFixture {
  const fixture = trickyProviderMatchingFixtures.find((candidate) => candidate.name === name);
  if (!fixture) throw new Error(`Unknown tricky provider fixture: ${name}`);

  return fixture;
}
