import type { ReactNode } from "react";

type NativeSelectFieldProps<TValue extends string> = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  help?: ReactNode;
  id: string;
  label: string;
  labelMode?: "visible" | "hidden";
  onChange: (value: TValue) => void;
  value: TValue;
  variant?: "default" | "compact";
};

/**
 * Purpose: Render native select controls with the shared Complete Series
 * selection styling.
 *
 * @param props - Native select inputs.
 * @param props.ariaLabel - Optional accessible label when the visible label is
 * hidden.
 * @param props.children - Select option elements.
 * @param props.className - Optional wrapper class for layout-specific sizing.
 * @param props.help - Optional help content rendered beside the visible label.
 * @param props.id - Stable id used to connect the label and select.
 * @param props.label - Visible or screen-reader label text.
 * @param props.labelMode - Whether the label should be visible or visually
 * hidden.
 * @param props.onChange - Callback receiving the selected value.
 * @param props.value - Current selected value.
 * @param props.variant - Size variant for dense areas such as the results
 * toolbar.
 * @returns A labelled native select with shared shell and arrow styling.
 */
export function NativeSelectField<TValue extends string>({
  ariaLabel,
  children,
  className,
  help,
  id,
  label,
  labelMode = "visible",
  onChange,
  value,
  variant = "default",
}: NativeSelectFieldProps<TValue>) {
  const labelClassName = labelMode === "hidden" ? "visually-hidden" : undefined;

  return (
    <div className={`selection-field ${className ?? ""}`.trim()}>
      {help && labelMode === "visible" ? (
        <div className="filter-label-with-help">
          <label htmlFor={id}>{label}</label>
          {help}
        </div>
      ) : (
        <label className={labelClassName} htmlFor={id}>
          {label}
        </label>
      )}
      <div className="selection-native-select">
        <select
          aria-label={labelMode === "hidden" ? (ariaLabel ?? label) : undefined}
          className={`selection-control selection-control--native selection-control--${variant}`}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as TValue)}
        >
          {children}
        </select>
      </div>
    </div>
  );
}
