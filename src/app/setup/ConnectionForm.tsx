import { FormEvent, useState, type ReactNode } from "react";
import {
  defaultConnectionFormValues,
  type AuthMode,
  type ConnectionFormValues,
  validateConnectionValues,
} from "./scanFormTypes";

type ConnectionFormProps = {
  actions?: ReactNode;
  error?: string;
  initialValues?: ConnectionFormValues;
  isSubmitting: boolean;
  onSubmit: (values: ConnectionFormValues) => Promise<void>;
  status?: string;
  submitLabel: string;
  submittingLabel: string;
};

/**
 * Purpose: Render the Audiobookshelf connection form shared by the home page
 * and results-page server drawer.
 *
 * @param props - Connection form inputs.
 * @param props.actions - Optional secondary controls to render before submit.
 * @param props.error - Error message from the parent workflow.
 * @param props.initialValues - Optional initial connection values.
 * @param props.isSubmitting - Whether a connection request is in progress.
 * @param props.onSubmit - Callback that authenticates the entered server.
 * @param props.status - Optional status message from the parent workflow.
 * @param props.submitLabel - Submit button label when idle.
 * @param props.submittingLabel - Submit button label while submitting.
 * @returns A reusable Audiobookshelf connection form.
 */
export function ConnectionForm({
  actions,
  error = "",
  initialValues = defaultConnectionFormValues,
  isSubmitting,
  onSubmit,
  status = "",
  submitLabel,
  submittingLabel,
}: ConnectionFormProps) {
  const [values, setValues] = useState<ConnectionFormValues>(initialValues);
  const [formError, setFormError] = useState("");

  /**
   * Purpose: Validate and submit the connection form.
   *
   * @param event - Browser form submit event.
   * @returns A promise that resolves after the submit callback finishes.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationError = validateConnectionValues(values);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    await onSubmit(values);
  }

  /**
   * Purpose: Update the selected login method in form state.
   *
   * @param authMode - Login method selected by the user.
   * @returns Nothing. Form state is updated in place.
   */
  function updateAuthMode(authMode: AuthMode): void {
    setValues({ ...values, authMode });
  }

  return (
    <form className="connection-form" noValidate onSubmit={handleSubmit}>
      <label htmlFor="serverUrl">Audiobookshelf Server URL</label>
      <input
        id="serverUrl"
        name="serverUrl"
        placeholder="https://example.com"
        value={values.serverUrl}
        onChange={(event) => setValues({ ...values, serverUrl: event.target.value })}
        required
      />

      <fieldset className="auth-panel auth-panel--segmented">
        <legend>Login Method</legend>
        <label className="auth-choice">
          <input
            type="radio"
            name="authMode"
            value="password"
            checked={values.authMode === "password"}
            onChange={() => updateAuthMode("password")}
          />
          <span>Password</span>
        </label>
        <label className="auth-choice">
          <input
            type="radio"
            name="authMode"
            value="apiKey"
            checked={values.authMode === "apiKey"}
            onChange={() => updateAuthMode("apiKey")}
          />
          <span>API key</span>
        </label>
      </fieldset>

      {values.authMode === "apiKey" ? (
        <>
          <label htmlFor="apiKey">API Key</label>
          <input
            id="apiKey"
            name="apiKey"
            placeholder="API Key"
            type="password"
            value={values.apiKey}
            onChange={(event) => setValues({ ...values, apiKey: event.target.value })}
            required
          />
        </>
      ) : (
        <>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            placeholder="Username"
            value={values.username}
            onChange={(event) => setValues({ ...values, username: event.target.value })}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            placeholder="Password"
            type="password"
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            required
          />
        </>
      )}

      {actions}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </button>

      {status ? <div className="message">{status}</div> : null}
      {formError || error ? <div className="error-message">{formError || error}</div> : null}
    </form>
  );
}
