import { useState } from "react";

type ReadMoreTextProps = {
  maxLength?: number;
  text: string;
};

/**
 * Purpose: Render long overview text compactly with an optional expand action.
 *
 * @param props - Read-more text inputs.
 * @param props.maxLength - Character count before the text is collapsed.
 * @param props.text - Full text to render.
 * @returns Collapsed or expanded text with a compact toggle when needed.
 */
export function ReadMoreText({ maxLength = 260, text }: ReadMoreTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldCollapse = text.length > maxLength;
  const visibleText = shouldCollapse && !isExpanded ? `${text.slice(0, maxLength).trim()}...` : text;

  return (
    <>
      <p>{visibleText}</p>
      {shouldCollapse ? (
        <button className="text-button" type="button" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Show less" : "Read full overview"}
        </button>
      ) : null}
    </>
  );
}
