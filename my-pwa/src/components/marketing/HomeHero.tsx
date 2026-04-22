import type { FormEvent, RefObject } from 'react'

type HomeStep = {
  detail: string
  label: string
  title: string
}

type HomeHeroProps = {
  autoSuggest: boolean
  budgetGenerated: boolean
  builderRef: RefObject<HTMLDivElement | null>
  formatCurrency: (value: number) => string
  handleGenerateBudget: () => void
  homeSteps: HomeStep[]
  includePartner: boolean
  incomePerPaycheck: number
  monthlyIncome: number
  onShowLogin: () => void
  onAutoSuggestChange: (value: boolean) => void
  openBudgetSpace: () => void
  partnerIncome: number
  payFrequency: string
  primaryGoal: string
  scrollToBuilder: () => void
  setAuthMode: (mode: 'login' | 'signup') => void
  setIncludePartner: (value: boolean) => void
  setIncomePerPaycheck: (value: number) => void
  setPartnerIncome: (value: number) => void
  setPayFrequency: (value: string) => void
  setPrimaryGoal: (value: string) => void
  showToast: (message: string) => void
  userEmail: string | null
  waitlistEmail: string
  waitlistLoading: boolean
  waitlistMessage: string
  waitlistStatus: 'idle' | 'success' | 'error'
  onWaitlistSubmit: (event: FormEvent<HTMLFormElement>) => void
  setWaitlistEmail: (value: string) => void
}

export function HomeHero({
  autoSuggest,
  budgetGenerated,
  builderRef,
  formatCurrency,
  handleGenerateBudget,
  homeSteps,
  includePartner,
  incomePerPaycheck,
  monthlyIncome,
  onShowLogin,
  onAutoSuggestChange,
  openBudgetSpace,
  partnerIncome,
  payFrequency,
  primaryGoal,
  scrollToBuilder,
  setAuthMode,
  setIncludePartner,
  setIncomePerPaycheck,
  setPartnerIncome,
  setPayFrequency,
  setPrimaryGoal,
  showToast,
  userEmail,
  waitlistEmail,
  waitlistLoading,
  waitlistMessage,
  waitlistStatus,
  onWaitlistSubmit,
  setWaitlistEmail,
}: HomeHeroProps) {
  return (
    <div className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Cash-flow budgeting for real life</p>
        <h1>Know exactly what to do with this paycheck.</h1>
        <p className="lead">
          Centsy turns your pay cycle, bills, and daily spending into one calm weekly
          plan. You always know what is already spoken for, what is flexible, and what
          to do next.
        </p>
        <div className="hero-actions">
          <button className="solid" type="button" onClick={openBudgetSpace}>
            Open Budget Space
          </button>
          <button className="ghost" type="button" onClick={scrollToBuilder}>
            See the 3-step setup
          </button>
        </div>
        <div className="hero-trust-row">
          <span>Private by default</span>
          <span>Built around paychecks</span>
          <span>Edit everything later</span>
        </div>
        <div className="hero-step-grid">
          {homeSteps.map((step) => (
            <article className="hero-step-card" key={step.title}>
              <span>{step.label}</span>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
        <form className="hero-waitlist compact" onSubmit={onWaitlistSubmit}>
          <div className="waitlist-field">
            <input
              type="email"
              placeholder="you@email.com"
              value={waitlistEmail}
              onChange={(event) => setWaitlistEmail(event.target.value)}
              aria-label="Email address"
            />
            <button className="solid" type="submit" disabled={waitlistLoading}>
              {waitlistLoading ? 'Joining...' : 'Get setup tips'}
            </button>
          </div>
          <p className="hero-note">
            Prefer email first? Get a short setup sequence and early product updates.
          </p>
          {waitlistMessage ? (
            <p
              className={`waitlist-status ${
                waitlistStatus === 'error' ? 'error' : 'success'
              }`}
              role="status"
            >
              {waitlistMessage}
            </p>
          ) : null}
          {waitlistStatus === 'success' ? (
            <div className="confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}
        </form>
        <div className="stat-row">
          <div>
            <strong>1 plan</strong>
            <span>shared across every view</span>
          </div>
          <div>
            <strong>Weekly</strong>
            <span>cash visibility</span>
          </div>
          <div>
            <strong>Private</strong>
            <span>by default</span>
          </div>
        </div>
      </div>

      <div className="hero-panel" ref={builderRef}>
        {userEmail ? (
          <>
            <div className="panel-head">
              <h2>Build your first plan</h2>
              <p>Start small. Add income, choose a goal, and generate a usable budget.</p>
            </div>
            <div className="panel-body">
              <label>
                Take-home per paycheck
                <input
                  type="number"
                  value={incomePerPaycheck}
                  onChange={(event) =>
                    setIncomePerPaycheck(Number(event.target.value || 0))
                  }
                />
                <span className="helper">Monthly total: {formatCurrency(monthlyIncome)}</span>
              </label>
              <label>
                Pay frequency
                <select
                  value={payFrequency}
                  onChange={(event) => {
                    setPayFrequency(event.target.value)
                    showToast('Pay frequency updated.')
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                Primary goal
                <select
                  value={primaryGoal}
                  onChange={(event) => {
                    setPrimaryGoal(event.target.value)
                    showToast(`Primary goal set to ${event.target.value}.`)
                  }}
                >
                  <option value="stability">Stability</option>
                  <option value="debt">Pay off debt</option>
                  <option value="savings">Save more</option>
                  <option value="flex">More flexibility</option>
                </select>
              </label>
              <div className="toggle-row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={autoSuggest}
                    onChange={(event) => {
                      const checked = event.target.checked
                      onAutoSuggestChange(checked)
                      showToast(checked ? 'Bill suggestions enabled.' : 'Bill suggestions off.')
                    }}
                  />
                  <span>Auto-suggest bills</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={includePartner}
                    onChange={(event) => {
                      setIncludePartner(event.target.checked)
                      showToast(
                        event.target.checked
                          ? 'Partner income enabled.'
                          : 'Partner income removed.',
                      )
                    }}
                  />
                  <span>Include partner income</span>
                </label>
              </div>
              {includePartner ? (
                <label>
                  Partner monthly income
                  <input
                    type="number"
                    value={partnerIncome}
                    onChange={(event) =>
                      setPartnerIncome(Number(event.target.value || 0))
                    }
                  />
                </label>
              ) : null}
            </div>
            <div className="panel-footer">
              <button className="solid" onClick={handleGenerateBudget} type="button">
                Generate my budget
              </button>
              {budgetGenerated ? (
                <p className="panel-note success" role="status">
                  Budget ready. Open Budget Space and keep refining it.
                </p>
              ) : (
                <p className="panel-note">
                  Nothing here is locked. You can edit every number later.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="panel-head">
              <h2>Start with one paycheck</h2>
              <p>
                Log in, answer a few questions, and Centsy will build your first weekly
                plan.
              </p>
            </div>
            <div className="panel-footer builder-footer">
              <button className="solid builder-login" onClick={onShowLogin} type="button">
                Log in and start
              </button>
              <p className="panel-note">
                Sign in to save your budget, return on any device, and export whenever
                you want.
              </p>
              <div className="builder-preview-grid">
                <div className="builder-preview-card">
                  <strong>Add your pay cycle</strong>
                  <span>Tell Centsy when money lands and how much is available.</span>
                </div>
                <div className="builder-preview-card">
                  <strong>Generate a plan</strong>
                  <span>See bills, goals, and safe-to-spend money in one place.</span>
                </div>
                <div className="builder-preview-card">
                  <strong>Adjust as life changes</strong>
                  <span>
                    Cash flow, spending, and AI guidance stay synced to the same budget.
                  </span>
                </div>
              </div>
              <div className="panel-actions">
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => {
                    setAuthMode('signup')
                    onShowLogin()
                  }}
                >
                  Create account
                </button>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    onShowLogin()
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="panel-footnote">
                <span>2 minute setup</span>
                <span>Private by default</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
