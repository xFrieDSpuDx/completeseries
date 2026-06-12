import type { ScanResult } from "../scan/runLibraryScan";

type DebugUnresolvedListProps = {
  unresolvedSeries: ScanResult["unresolvedSeries"];
};

/**
 * Purpose: Render unresolved series reasons at the bottom of the debug panel.
 *
 * @param props - Unresolved list inputs.
 * @param props.unresolvedSeries - Series that could not be matched to provider
 * metadata.
 * @returns A compact unresolved-series list, or nothing when all series matched.
 */
export function DebugUnresolvedList({ unresolvedSeries }: DebugUnresolvedListProps) {
  if (unresolvedSeries.length === 0) return null;

  return (
    <ul className="debug-unresolved-list">
      {unresolvedSeries.map((series) => (
        <li key={series.localSeries.id}>
          <strong>{series.localSeries.name}</strong>
          <span>{series.reason}</span>
        </li>
      ))}
    </ul>
  );
}
