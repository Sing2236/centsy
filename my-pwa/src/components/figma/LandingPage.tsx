import type { ModuleId } from './SidebarNav'

type LandingPageProps = {
  onEnterApp: (module: ModuleId) => void
  onOpenAuth: () => void
}

const productAreas = [
  {
    id: 'home' as const,
    label: 'Home',
    detail: 'See what changed, what is left, and what to do next.',
  },
  {
    id: 'plan' as const,
    label: 'Plan',
    detail: 'Build a budget with AI suggestions instead of spreadsheets.',
  },
  {
    id: 'activity' as const,
    label: 'Activity',
    detail: 'Keep transactions clean, categorized, and easy to edit.',
  },
  {
    id: 'insights' as const,
    label: 'Insights',
    detail: 'Spot overspending, subscriptions, and cash flow risk.',
  },
  {
    id: 'ask-ai' as const,
    label: 'Ask AI',
    detail: 'Ask direct questions like “Can I afford this?” and get answers.',
  },
]

export function LandingPage({ onEnterApp, onOpenAuth }: LandingPageProps) {
  return (
    <div className="figma-landing">
      <header className="figma-landing-header">
        <div className="figma-sidebar-brand landing">
          <div className="figma-sidebar-logo">¢</div>
          <div>
            <h1>Centsy</h1>
            <p>Budgeting for real life</p>
          </div>
        </div>
        <div className="figma-inline-actions">
          <button className="figma-secondary-button" type="button" onClick={() => onEnterApp('home')}>
            Preview app
          </button>
          <button className="figma-primary-button" type="button" onClick={onOpenAuth}>
            Log in
          </button>
        </div>
      </header>

      <main className="figma-landing-content">
        <section className="figma-grid figma-grid-2">
          <article className="figma-panel landing-hero">
            <span className="figma-pill">AI-first budgeting</span>
            <h2>Know what you can spend, where money went, and what to do next.</h2>
            <p>
              Centsy gives you one calm place to plan the month, review activity,
              understand changes, and ask direct money questions without wrestling
              with a finance dashboard.
            </p>
            <div className="figma-inline-actions">
              <button className="figma-primary-button" type="button" onClick={() => onEnterApp('home')}>
                Enter Home
              </button>
              <button className="figma-secondary-button" type="button" onClick={() => onEnterApp('plan')}>
                Start planning
              </button>
            </div>
          </article>

          <article className="figma-panel">
            <div className="figma-panel-head">
              <h3>What the product does</h3>
            </div>
            <div className="figma-list">
              <div className="figma-guidance-row">
                <span>Shows how much is left to spend right now</span>
              </div>
              <div className="figma-guidance-row">
                <span>Builds realistic budgets with AI suggestions</span>
              </div>
              <div className="figma-guidance-row">
                <span>Explains overspending, subscriptions, and unusual activity</span>
              </div>
              <div className="figma-guidance-row">
                <span>Answers natural-language money questions with real numbers</span>
              </div>
            </div>
          </article>
        </section>

        <section className="figma-panel">
          <div className="figma-panel-head">
            <h3>Core product areas</h3>
          </div>
          <div className="figma-grid figma-grid-3">
            {productAreas.map((area) => (
              <button className="figma-action-card compact" key={area.id} type="button" onClick={() => onEnterApp(area.id)}>
                <strong>{area.label}</strong>
                <span>{area.detail}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
