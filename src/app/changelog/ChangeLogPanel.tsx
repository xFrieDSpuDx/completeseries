import { changeLogEntries } from "./changeLogEntries";

/**
 * Purpose: Render public release notes from the landing-page change log
 * drawer.
 *
 * @returns A compact change log panel suitable for users checking what has
 * changed before connecting to Audiobookshelf.
 */
export function ChangeLogPanel() {
  return (
    <section className="utility-panel change-log-panel">
      <header className="utility-panel__header">
        <div>
          <h2>Change log</h2>
          <p>Recent Complete Series changes and release notes.</p>
        </div>
      </header>

      <div className="change-log-list">
        {changeLogEntries.map((entry) => (
          <article className="change-log-entry" key={`${entry.date}-${entry.title}`}>
            <header className="change-log-entry__header">
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.summary}</p>
              </div>
              <time dateTime={entry.date}>{entry.date}</time>
            </header>

            {entry.sections.map((section) => (
              <section className="change-log-section" key={section.heading}>
                <h4>{section.heading}</h4>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
