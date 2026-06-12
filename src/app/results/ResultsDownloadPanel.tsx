type ResultsDownloadPanelProps = {
  onExportCsv: () => void;
  onExportDebugCsv: () => void;
  onExportDebugJson: () => void;
  onExportJson: () => void;
  onExportLocalData: () => void;
};

/**
 * Purpose: Render result download actions in one focused drawer instead of
 * leaving raw file-type buttons in the main results toolbar.
 *
 * @param props - Download callbacks.
 * @param props.onExportCsv - Callback that downloads the current missing-book
 * results as CSV.
 * @param props.onExportDebugCsv - Callback that downloads full debug checks as
 * CSV.
 * @param props.onExportDebugJson - Callback that downloads full debug checks as
 * JSON.
 * @param props.onExportJson - Callback that downloads the current missing-book
 * results as JSON.
 * @param props.onExportLocalData - Callback that downloads local app data,
 * preferences, manual matches, hidden items, and cached Audible responses.
 * @returns A compact download panel for current scan results.
 */
export function ResultsDownloadPanel({
  onExportCsv,
  onExportDebugCsv,
  onExportDebugJson,
  onExportJson,
  onExportLocalData,
}: ResultsDownloadPanelProps) {
  return (
    <section className="utility-panel download-panel">
      <header className="utility-panel__header">
        <div>
          <h2>Download</h2>
          <p>Export the current missing-book results.</p>
        </div>
      </header>

      <div className="download-panel__list">
        <h3>Results</h3>
        <DownloadRow
          actionLabel="Download CSV"
          description="Spreadsheet-friendly list of visible missing books."
          name="Missing books CSV"
          onDownload={onExportCsv}
        />
        <DownloadRow
          actionLabel="Download JSON"
          description="Structured result data for backup, scripting, or issue reports."
          name="Missing books JSON"
          onDownload={onExportJson}
        />
        <h3>Debug</h3>
        <DownloadRow
          actionLabel="Download CSV"
          description="Full debug checks for the current scan history."
          name="Debug checks CSV"
          onDownload={onExportDebugCsv}
        />
        <DownloadRow
          actionLabel="Download JSON"
          description="Structured debug rows, scan history, and series reports."
          name="Debug checks JSON"
          onDownload={onExportDebugJson}
        />
        <h3>Local data</h3>
        <DownloadRow
          actionLabel="Download backup"
          description="Hidden items, manual matches, saved filters, display settings, and provider response cache."
          name="Local data backup"
          onDownload={onExportLocalData}
        />
      </div>
    </section>
  );
}

/**
 * Purpose: Render one downloadable result format with context and an action.
 *
 * @param props - Download row inputs.
 * @param props.actionLabel - Button text for the download action.
 * @param props.description - Short description of the file contents.
 * @param props.name - Human-readable file type name.
 * @param props.onDownload - Callback that triggers the browser download.
 * @returns A compact download option row.
 */
function DownloadRow({
  actionLabel,
  description,
  name,
  onDownload,
}: {
  actionLabel: string;
  description: string;
  name: string;
  onDownload: () => void;
}) {
  return (
    <article className="download-panel__row">
      <div>
        <strong>{name}</strong>
        <span>{description}</span>
      </div>
      <button className="button-secondary" type="button" onClick={onDownload}>
        {actionLabel}
      </button>
    </article>
  );
}
