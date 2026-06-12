import { useState } from "react";
import { ConnectionForm } from "../setup/ConnectionForm";
import type { ConnectionFormValues } from "../setup/scanFormTypes";

type ResultsServerPanelProps = {
  onConnect: (values: ConnectionFormValues) => Promise<void>;
};

/**
 * Purpose: Connect to another Audiobookshelf server from the results page while
 * keeping the current debug history available until the new session is ready.
 *
 * @param props - Server panel inputs.
 * @param props.onConnect - Callback that authenticates the entered server.
 * @returns A connection form for switching Audiobookshelf servers.
 */
export function ResultsServerPanel({ onConnect }: ResultsServerPanelProps) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Purpose: Attempt to connect to the entered server and show local errors
   * without closing the drawer.
   *
   * @param values - Connection form values.
   * @returns A promise that resolves after the connection attempt completes.
   */
  async function connect(values: ConnectionFormValues): Promise<void> {
    setError("");
    setStatus("Connecting...");
    setIsConnecting(true);

    try {
      await onConnect(values);
    } catch (connectError) {
      setStatus("");
      setError(connectError instanceof Error ? connectError.message : "Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="results-filter-panel">
      <ConnectionForm
        error={error}
        isSubmitting={isConnecting}
        onSubmit={connect}
        status={status}
        submitLabel="Connect"
        submittingLabel="Connecting..."
      />
    </div>
  );
}
