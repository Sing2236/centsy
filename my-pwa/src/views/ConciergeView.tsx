type SavingsCandidate = { amount: number; name: string }
type SavingsStep = 'bill' | 'target' | 'plan'

type ConciergeViewProps = {
  applySavings: () => void
  clearSavingsPending: () => void
  formatCurrency: (value: number) => string
  handleGenerateSavingsPlaybook: () => void
  savingsBill: string
  savingsCandidates: SavingsCandidate[]
  savingsError: string
  savingsLoading: boolean
  savingsNotes: string
  savingsPendingSummary: string
  savingsPendingUpdates: unknown
  savingsPlan: string
  savingsProvider: string
  savingsStep: SavingsStep
  savingsTarget: string
  selectedSavingsAmount: number
  setSavingsBill: (value: string) => void
  setSavingsNotes: (value: string) => void
  setSavingsProvider: (value: string) => void
  setSavingsStep: (value: SavingsStep) => void
  setSavingsTarget: (value: string) => void
}

export default function ConciergeView({
  applySavings,
  clearSavingsPending,
  formatCurrency,
  handleGenerateSavingsPlaybook,
  savingsBill,
  savingsCandidates,
  savingsError,
  savingsLoading,
  savingsNotes,
  savingsPendingSummary,
  savingsPendingUpdates,
  savingsPlan,
  savingsProvider,
  savingsStep,
  savingsTarget,
  selectedSavingsAmount,
  setSavingsBill,
  setSavingsNotes,
  setSavingsProvider,
  setSavingsStep,
  setSavingsTarget,
}: ConciergeViewProps) {
  return (
    <section className="copilot concierge">
      <div className="section-head">
        <div>
          <h2>Savings Concierge</h2>
          <p>Build a savings playbook with scripts and next steps.</p>
        </div>
        <span className="tag">Powered by Groq</span>
      </div>
      <div className="copilot-grid playbook-grid">
        <div className="chat-card playbook-card">
          <div className="card-head">
            <h3>Build the playbook</h3>
            <span className="tag">Guided</span>
          </div>
          <div className="playbook-stepper">
            <button
              className={`playbook-step ${savingsStep === 'bill' ? 'active' : ''}`}
              type="button"
              onClick={() => setSavingsStep('bill')}
            >
              1. Pick bill
            </button>
            <button
              className={`playbook-step ${savingsStep === 'target' ? 'active' : ''}`}
              type="button"
              onClick={() => setSavingsStep('target')}
            >
              2. Target + details
            </button>
            <button
              className={`playbook-step ${savingsStep === 'plan' ? 'active' : ''}`}
              type="button"
              onClick={() => setSavingsStep('plan')}
            >
              3. Review plan
            </button>
          </div>
          {savingsStep === 'bill' ? (
            <div className="playbook-section">
              <label>
                Bill to target
                <select value={savingsBill} onChange={(event) => setSavingsBill(event.target.value)}>
                  {savingsCandidates.length ? (
                    savingsCandidates.map((item) => (
                      <option key={`savings-${item.name}`} value={item.name}>
                        {item.name} {item.amount ? `(${formatCurrency(item.amount)})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a bill first</option>
                  )}
                </select>
              </label>
              {savingsCandidates.length ? (
                <>
                  <div className="chip-grid">
                    {savingsCandidates.slice(0, 6).map((item) => (
                      <button
                        key={`savings-chip-${item.name}`}
                        type="button"
                        className={savingsBill === item.name ? 'solid small' : 'ghost small'}
                        onClick={() => setSavingsBill(item.name)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                  <p className="muted">Biggest bills rise to the top. Pick one to focus on first.</p>
                </>
              ) : (
                <p className="muted">Add a monthly bill to unlock savings playbooks.</p>
              )}
              <div className="inline-actions">
                <button
                  className="solid small"
                  type="button"
                  onClick={() => setSavingsStep('target')}
                  disabled={!savingsCandidates.length}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
          {savingsStep === 'target' ? (
            <div className="playbook-section">
              <div className="playbook-fields">
                <label>
                  Target savings per month
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={savingsTarget}
                    onChange={(event) => setSavingsTarget(event.target.value)}
                  />
                </label>
                <label>
                  Provider or company
                  <input
                    type="text"
                    placeholder="AT&T, Verizon, Gym"
                    value={savingsProvider}
                    onChange={(event) => setSavingsProvider(event.target.value)}
                  />
                </label>
                <label>
                  Notes (optional)
                  <input
                    type="text"
                    placeholder="Contract up in 2 months"
                    value={savingsNotes}
                    onChange={(event) => setSavingsNotes(event.target.value)}
                  />
                </label>
              </div>
              <div className="inline-actions">
                <button className="ghost small" type="button" onClick={() => setSavingsStep('bill')}>
                  Back
                </button>
                <button
                  className="solid small"
                  type="button"
                  onClick={handleGenerateSavingsPlaybook}
                  disabled={savingsLoading}
                >
                  Generate playbook
                </button>
              </div>
              {selectedSavingsAmount ? (
                <p className="helper">Current bill: {formatCurrency(selectedSavingsAmount)} per month.</p>
              ) : null}
            </div>
          ) : null}
          {savingsStep === 'plan' ? (
            <div className="playbook-section">
              <p className="muted">Review the plan on the right. Adjust details and regenerate if needed.</p>
              <div className="inline-actions">
                <button className="ghost small" type="button" onClick={() => setSavingsStep('target')}>
                  Edit details
                </button>
                <button
                  className="solid small"
                  type="button"
                  onClick={handleGenerateSavingsPlaybook}
                  disabled={savingsLoading}
                >
                  Regenerate
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="suggestion-card playbook-output">
          <h3>Playbook output</h3>
          {savingsLoading ? (
            <p className="muted">Drafting your savings plan...</p>
          ) : savingsError ? (
            <p className="muted">{savingsError}</p>
          ) : savingsPlan ? (
            <div className="playbook-output-body">{savingsPlan}</div>
          ) : (
            <p className="muted">Fill out the steps to generate a savings playbook.</p>
          )}
          {savingsPendingUpdates ? (
            <div className="playbook-actions">
              <p>{savingsPendingSummary}</p>
              <div className="inline-actions">
                <button className="solid small" onClick={applySavings}>
                  Apply savings
                </button>
                <button className="ghost small" onClick={clearSavingsPending}>
                  Keep current
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
