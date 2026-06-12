import type { DebugHistoryEntry } from "./debugHistory";
import { formatScanLabel } from "./debugPanelRows";

/**
 * Purpose: Render expandable history rows for recent scans.
 *
 * @param props - History list inputs.
 * @param props.history - Recent completed scans in this app session.
 * @returns A compact scan-history section with per-run debug counts.
 */
export function DebugHistoryList({ history }: { history: DebugHistoryEntry[] }) {
  return (
    <details className="debug-history">
      <summary>Recent scan history ({history.length})</summary>
      <ul>
        {history.map((entry, index) => (
          <li key={entry.id}>
            <strong>{formatScanLabel(entry, index)}</strong>
            <span>
              {entry.metadataLookupMode}, {entry.region.toUpperCase()} · {entry.missingBookCount}{" "}
              missing · {entry.matchedSeriesCount}/{entry.localSeriesCount} matched ·{" "}
              {entry.unresolvedSeriesCount} unresolved · {entry.debugRows.length} checks
            </span>
            <small>{entry.activeFilters.join(", ") || "No active filters"}</small>
          </li>
        ))}
      </ul>
    </details>
  );
}
