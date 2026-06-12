type LocalStoreRowProps = {
  actionLabel: string;
  description: string;
  name: string;
  onDelete: () => void;
  storageKey: string;
};

/**
 * Purpose: Render one locally stored data file with an individual delete
 * action.
 *
 * @param props - Storage row inputs.
 * @param props.actionLabel - Text for the delete button.
 * @param props.description - Short description of the stored data.
 * @param props.name - Human-readable store name.
 * @param props.onDelete - Callback that clears this store.
 * @param props.storageKey - Browser storage key for this store.
 * @returns A compact local store row.
 */
export function LocalStoreRow({
  actionLabel,
  description,
  name,
  onDelete,
  storageKey,
}: LocalStoreRowProps) {
  return (
    <article className="local-store-row">
      <div>
        <strong>{name}</strong>
        <span>{description}</span>
        <details className="local-store-row__key">
          <summary>Storage key</summary>
          <code>{storageKey}</code>
        </details>
      </div>
      <button className="button-secondary" type="button" onClick={onDelete}>
        {actionLabel}
      </button>
    </article>
  );
}

/**
 * Purpose: Ask users to confirm a broad local data delete before it removes
 * current V2 and legacy V1 browser data.
 *
 * @returns `true` when the delete should continue.
 */
export function confirmClearAllLocalData(): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") return true;

  return window.confirm(
    "Delete all Complete Series local data from this browser? This cannot be undone."
  );
}
