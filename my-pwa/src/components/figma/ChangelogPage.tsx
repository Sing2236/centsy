type ChangelogPageProps = {
  onNavigateAbout: () => void
  onNavigateHome: () => void
  onOpenAuth: () => void
}

const entries = [
  {
    title: 'AI-first navigation refactor',
    date: 'Apr 2026',
    tag: 'Product',
    summary: 'Collapsed the old dashboard into Home, Plan, Activity, Insights, and Ask AI.',
  },
  {
    title: 'Groq assistant wired live',
    date: 'Apr 2026',
    tag: 'AI',
    summary: 'Ask AI now calls the live Groq-backed Supabase function first.',
  },
  {
    title: 'Cash flow and reports simplified',
    date: 'Apr 2026',
    tag: 'Clarity',
    summary: 'Insights now focus on risk, coverage, and cash flow instead of dashboard bloat.',
  },
]

export function ChangelogPage({
  onNavigateAbout,
  onNavigateHome,
  onOpenAuth,
}: ChangelogPageProps) {
  return (
    <div className="figma-public-page">
      <header className="figma-public-header">
        <button className="weebies-brand public" type="button" onClick={onNavigateHome}>
          <span className="weebies-brand-mark">¢</span>
          <span className="weebies-brand-text">Centsy</span>
        </button>
        <div className="figma-inline-actions">
          <button className="figma-secondary-button" type="button" onClick={onNavigateHome}>
            Home
          </button>
          <button className="figma-secondary-button" type="button" onClick={onNavigateAbout}>
            About
          </button>
          <button className="figma-primary-button" type="button" onClick={onOpenAuth}>
            Log in
          </button>
        </div>
      </header>

      <main className="figma-public-content">
        <section className="figma-panel public-hero">
          <div className="figma-panel-head">
            <div>
              <span className="figma-pill">Change log</span>
              <h2>Recent product updates.</h2>
            </div>
          </div>
          <p className="figma-public-lead">
            The product is being simplified into a calmer, AI-first budgeting
            experience. These are the newest shipping changes.
          </p>
        </section>

        <section className="figma-list changelog-list">
          {entries.map((entry) => (
            <article className="figma-panel" key={entry.title}>
              <div className="figma-panel-head">
                <div className="figma-inline-actions">
                  <span className="figma-pill">{entry.tag}</span>
                  <span className="figma-muted">{entry.date}</span>
                </div>
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.summary}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
