import './LandingPage.css'
import type { ModuleId } from './SidebarNav'

type LandingPageProps = {
  onNavigateAbout: () => void
  onNavigateChangelog: () => void
  onEnterApp: (module: ModuleId) => void
  onOpenAuth: () => void
}

const highlights = [
  {
    title: 'Weekly cash clarity',
    body: 'See what each paycheck needs to cover before you spend a dollar.',
  },
  {
    title: 'One living plan',
    body: 'Bills, goals, and spending all update against the same budget.',
  },
  {
    title: 'Calm guidance',
    body: 'Know when you are safe, tight, or drifting off plan without spreadsheet work.',
  },
]

const featureCards = [
  {
    eyebrow: 'Plan',
    title: 'Build around your actual pay cycle',
    body: 'Set take-home pay, cadence, and priorities once. Centsy translates that into a usable monthly and weekly plan.',
  },
  {
    eyebrow: 'Track',
    title: 'See what is already spoken for',
    body: 'Separate fixed bills from flexible spending so you know what is still safe to use.',
  },
  {
    eyebrow: 'Adjust',
    title: 'Stay steady when life changes',
    body: 'Move money, update income, and refine your plan without rebuilding the whole budget from scratch.',
  },
]

const workflowSteps = [
  {
    number: '01',
    title: 'Add your income',
    detail: 'Start with one paycheck, not an intimidating financial overhaul.',
  },
  {
    number: '02',
    title: 'Generate your plan',
    detail: 'Centsy maps bills, timing, and goals into a clearer weekly picture.',
  },
  {
    number: '03',
    title: 'Keep it current',
    detail: 'Spending, alerts, and next actions stay tied to the same plan.',
  },
]

export function LandingPage({
  onEnterApp,
  onNavigateAbout,
  onNavigateChangelog,
  onOpenAuth,
}: LandingPageProps) {
  return (
    <div className="centsy-landing">
      <div className="centsy-landing-shell">
        <header className="centsy-landing-header">
          <button
            className="centsy-brand"
            type="button"
            onClick={() => onEnterApp('home')}
            aria-label="Open Centsy app"
          >
            <span className="centsy-brand-mark">¢</span>
            <span className="centsy-brand-copy">
              <strong>Centsy</strong>
              <small>Budgeting with cash-flow clarity</small>
            </span>
          </button>

          <nav className="centsy-landing-nav" aria-label="Homepage">
            <button type="button" onClick={onNavigateAbout}>
              About
            </button>
            <button type="button" onClick={onNavigateChangelog}>
              Changelog
            </button>
          </nav>

          <div className="centsy-landing-actions">
            <button className="centsy-button centsy-button-ghost" type="button" onClick={onOpenAuth}>
              Log in
            </button>
            <button className="centsy-button centsy-button-solid" type="button" onClick={() => onEnterApp('home')}>
              Open app
            </button>
          </div>
        </header>

        <main className="centsy-landing-main">
          <section className="centsy-hero">
            <div className="centsy-hero-copy">
              <span className="centsy-eyebrow">Cash-flow budgeting that feels calm</span>
              <h1>Know what this paycheck needs to do before you spend it.</h1>
              <p className="centsy-hero-lead">
                Centsy turns income timing, bills, and everyday spending into one
                clear plan. No bloated dashboard. No guesswork about what is safe.
                Just a cleaner way to budget around real life.
              </p>

              <div className="centsy-hero-actions">
                <button className="centsy-button centsy-button-solid" type="button" onClick={() => onEnterApp('home')}>
                  Start budgeting
                </button>
                <button className="centsy-button centsy-button-ghost" type="button" onClick={onNavigateChangelog}>
                  See product updates
                </button>
              </div>

              <div className="centsy-trust-row" aria-label="Product qualities">
                <span>Private by default</span>
                <span>Built around paychecks</span>
                <span>Flexible when plans change</span>
              </div>

              <div className="centsy-highlight-grid">
                {highlights.map((item) => (
                  <article className="centsy-highlight-card" key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="centsy-hero-visual" aria-hidden="true">
              <div className="centsy-glow centsy-glow-top" />
              <div className="centsy-glow centsy-glow-bottom" />

              <div className="centsy-dashboard-card centsy-dashboard-primary">
                <div className="centsy-card-topline">
                  <span>This paycheck</span>
                  <strong>$2,100</strong>
                </div>
                <div className="centsy-meter">
                  <span style={{ width: '72%' }} />
                </div>
                <div className="centsy-split-row">
                  <div>
                    <small>Already assigned</small>
                    <strong>$1,510</strong>
                  </div>
                  <div>
                    <small>Still flexible</small>
                    <strong>$590</strong>
                  </div>
                </div>
              </div>

              <div className="centsy-dashboard-card centsy-dashboard-secondary">
                <div className="centsy-mini-label">Weekly view</div>
                <div className="centsy-week-bars">
                  <div>
                    <span>Week 1</span>
                    <i style={{ width: '88%' }} />
                  </div>
                  <div>
                    <span>Week 2</span>
                    <i style={{ width: '61%' }} />
                  </div>
                  <div>
                    <span>Week 3</span>
                    <i style={{ width: '74%' }} />
                  </div>
                  <div>
                    <span>Week 4</span>
                    <i style={{ width: '53%' }} />
                  </div>
                </div>
              </div>

              <div className="centsy-dashboard-card centsy-dashboard-note">
                <span className="centsy-mini-label">AI cue</span>
                <p>
                  Rent and insurance are covered. Grocery spending is pacing slightly
                  high, so next week is the one to watch.
                </p>
              </div>

              <div className="centsy-dashboard-card centsy-dashboard-goals">
                <span className="centsy-mini-label">Goals</span>
                <div className="centsy-goal-stack">
                  <div>
                    <span>Emergency fund</span>
                    <b>65%</b>
                  </div>
                  <div>
                    <span>Debt payoff</span>
                    <b>41%</b>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="centsy-story-band">
            <div className="centsy-story-copy">
              <span className="centsy-eyebrow muted">Why it works</span>
              <h2>A budgeting homepage that feels like a decision tool, not a brochure.</h2>
              <p>
                The experience is designed to answer three questions fast: what money
                came in, what it needs to cover, and what you can still do next.
              </p>
            </div>

            <div className="centsy-step-grid">
              {workflowSteps.map((step) => (
                <article className="centsy-step-card" key={step.number}>
                  <span>{step.number}</span>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="centsy-feature-grid">
            {featureCards.map((card) => (
              <article className="centsy-feature-card" key={card.title}>
                <span>{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </section>

          <section className="centsy-bottom-cta">
            <div>
              <span className="centsy-eyebrow muted">Start simple</span>
              <h2>Open the app and build your first plan around one paycheck.</h2>
            </div>
            <div className="centsy-bottom-actions">
              <button className="centsy-button centsy-button-solid" type="button" onClick={() => onEnterApp('home')}>
                Open Budget Space
              </button>
              <button className="centsy-button centsy-button-ghost" type="button" onClick={onOpenAuth}>
                Create account
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
