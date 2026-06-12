import { useEffect, useRef } from "react";

export type MultiSelectDropdownOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type MultiSelectDropdownProps<TValue extends string> = {
  id: string;
  keepOneSelected?: boolean;
  label: string;
  onChange: (selectedValues: TValue[]) => void;
  options: Array<MultiSelectDropdownOption<TValue>>;
  selectedValues: TValue[];
  summary: string;
};

/**
 * Purpose: Render a dropdown-style multi-select control so related setup
 * choices share one visual and interaction pattern.
 *
 * @param props - Multi-select control inputs.
 * @param props.id - Stable id prefix used for accessible labels and control
 * names.
 * @param props.keepOneSelected - Whether the control should prevent removing
 * the last selected option.
 * @param props.label - Visible label for the collapsed selector.
 * @param props.onChange - Callback receiving the updated selected values.
 * @param props.options - Selectable options shown in the dropdown panel.
 * @param props.selectedValues - Currently selected option values.
 * @param props.summary - Text shown while the dropdown is closed.
 * @returns A labelled dropdown with checkbox options.
 */
export function MultiSelectDropdown<TValue extends string>({
  id,
  keepOneSelected = false,
  label,
  onChange,
  options,
  selectedValues,
  summary,
}: MultiSelectDropdownProps<TValue>) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      closeDropdownOnOutsidePointerDown(dropdownRef.current, event);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, []);

  return (
    <div className="selection-field">
      <label htmlFor={`${id}Summary`}>{label}</label>
      <details className="selection-dropdown" ref={dropdownRef}>
        <summary className="selection-control" id={`${id}Summary`}>
          <span>{summary}</span>
        </summary>
        <div
          aria-labelledby={`${id}Summary`}
          aria-multiselectable="true"
          className="selection-dropdown__panel"
          role="listbox"
        >
          {options.map((option) => (
            <label className="selection-option" key={option.value}>
              <input
                checked={selectedValues.includes(option.value)}
                type="checkbox"
                onChange={(event) =>
                  onChange(
                    toggleSelectedValue(
                      selectedValues,
                      option.value,
                      event.target.checked,
                      keepOneSelected
                    )
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

/**
 * Purpose: Close an open dropdown when the user clicks or taps outside it.
 *
 * @param dropdown - Dropdown element being monitored.
 * @param event - Document-level pointer event that may have happened outside
 * the dropdown.
 * @returns Nothing.
 */
function closeDropdownOnOutsidePointerDown(
  dropdown: HTMLDetailsElement | null,
  event: PointerEvent
): void {
  if (!dropdown?.open) return;
  if (event.target instanceof Node && dropdown.contains(event.target)) return;

  dropdown.open = false;
}

/**
 * Purpose: Add or remove a selected option while optionally preventing an empty
 * selection.
 *
 * @param selectedValues - Currently selected values.
 * @param value - Option value being toggled.
 * @param shouldInclude - Whether the value should be selected.
 * @param keepOneSelected - Whether removing the last value should be blocked.
 * @returns Updated selected values, or the original values when the removal is
 * blocked.
 */
function toggleSelectedValue<TValue extends string>(
  selectedValues: TValue[],
  value: TValue,
  shouldInclude: boolean,
  keepOneSelected: boolean
): TValue[] {
  if (shouldInclude) {
    return selectedValues.includes(value) ? selectedValues : [...selectedValues, value];
  }

  const nextSelectedValues = selectedValues.filter((selectedValue) => selectedValue !== value);

  return keepOneSelected && nextSelectedValues.length === 0 ? selectedValues : nextSelectedValues;
}
