type AboutPageProps = {
  onNavigateHome: () => void
  onNavigateChangelog: () => void
  onOpenAuth: () => void
}

export function AboutPage({
  onNavigateHome,
  onNavigateChangelog,
  onOpenAuth,
}: AboutPageProps) {
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
          <button className="figma-secondary-button" type="button" onClick={onNavigateChangelog}>
            Change log
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
              <span className="figma-pill">About Centsy</span>
              <h2>Budgeting that stays human.</h2>
            </div>
          </div>
          <p className="figma-public-lead">
            Centsy is built for people who want a calmer, clearer relationship with
            money. We turn everyday spending, bill timing, and paychecks into a plan
            that feels usable instead of overwhelming.
          </p>
        </section>

        <section className="figma-grid figma-grid-3">
          <article className="figma-panel">
            <h3>Human-first budgeting</h3>
            <p>
              Budgets should guide you, not punish you. The product is designed to
              reduce stress, surface what matters, and keep next steps obvious.
            </p>
          </article>
          <article className="figma-panel">
            <h3>Built for real life</h3>
            <p>
              Tiny purchases, recurring bills, and uneven cash flow all belong in
              the same system. Centsy is designed around that reality.
            </p>
          </article>
          <article className="figma-panel">
            <h3>Aligned with your goals</h3>
            <p>
              Whether the goal is stability, debt payoff, or savings, the product
              keeps that target visible while you make day-to-day decisions.
            </p>
          </article>
        </section>

        <section className="figma-grid figma-grid-2 about-team">
          <article className="figma-panel about-image-panel">
            <img className="about-team-image" src="/team-ethan.png" alt="Ethan Huynh, creator of Centsy" />
          </article>
          <article className="figma-panel">
            <div className="figma-panel-head">
              <h3>Team</h3>
            </div>
            <p>
              Centsy is a one-person team led by Ethan Huynh, a full-stack builder
              working across product, design, and infrastructure. The focus is to
              make budgeting feel approachable, intelligent, and useful every day.
            </p>
            <p>
              The product direction is simple: help people understand what changed,
              what is safe to spend, and what they should do next without needing to
              become spreadsheet people.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}
