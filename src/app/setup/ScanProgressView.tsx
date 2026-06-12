import { BrandMark } from "../components/BrandMark";

type ScanProgressViewProps = {
  progressLog: string[];
  status: string;
};

/**
 * Purpose: Render scanning progress as a dedicated app stage instead of a
 * small status line beneath setup controls.
 *
 * @param props - Progress display inputs.
 * @param props.progressLog - Recent progress messages from the active scan.
 * @param props.status - Current progress message.
 * @returns A focused scan progress screen.
 */
export function ScanProgressView({ progressLog, status }: ScanProgressViewProps) {
  return (
    <section className="stage-shell stage-shell--centred stage-shell--progress">
      <div className="scan-progress-panel">
        <BrandMark />
        <div className="scan-spinner" aria-hidden="true" />
        <h1>Scanning your library</h1>
        <p className="scan-progress-status">{status || "Preparing scan..."}</p>

        {progressLog.length > 0 ? (
          <ol className="progress-log" aria-label="Recent scan activity">
            {progressLog.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
