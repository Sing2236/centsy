type InsightsViewProps = {
  aiGuidance: string[]
  allocationSortMode: 'due' | 'custom'
  bankBalance: number
  bankCoverageLabel: string
  billsPerPaycheck: number
  creditCardBalance: number
  creditCardPlan: {
    basePayment: number
    items: string[]
    monthsToClear: number
    perPaycheck: number
  }
  formatCurrency: (value: number) => string
  leftToBudget: number
  moveAllocation: (billId: string, direction: 'up' | 'down') => void
  nextPayDateDisplay: string
  nextPaycheckAfterBills: number
  nextPaycheckTotal: number
  orderedAllocations: Array<{
    allocation: number
    amount: number
    dueLabel: string
    id: string
    name: string
  }>
  plannedBillsDisplayTotal: number
  riskLabel: string
  riskScore: number
  setAllocationSortMode: (value: 'due' | 'custom') => void
  setCreditCardBalance: (value: number) => void
  weeklyFlexTarget: number
}

export default function InsightsView({
  aiGuidance,
  allocationSortMode,
  bankBalance,
  bankCoverageLabel,
  billsPerPaycheck,
  creditCardBalance,
  creditCardPlan,
  formatCurrency,
  leftToBudget,
  moveAllocation,
  nextPayDateDisplay,
  nextPaycheckAfterBills,
  nextPaycheckTotal,
  orderedAllocations,
  plannedBillsDisplayTotal,
  riskLabel,
  riskScore,
  setAllocationSortMode,
  setCreditCardBalance,
  weeklyFlexTarget,
}: InsightsViewProps) {
  return (
    <section className="ai-insights">
      <div className="section-head">
        <div>
          <h2>AI Insights</h2>
          <p>Bill-by-bill allocations, risk score, and paycheck guidance.</p>
        </div>
        <span className="tag">Live</span>
      </div>
      <div className="ai-grid">
        <div className="ai-card">
          <div className="card-head">
            <h3>Risk score</h3>
            <span className={`risk-pill ${riskScore < 60 ? 'high' : ''}`}>{riskLabel}</span>
          </div>
          <div className="risk-score">
            <strong>{riskScore}</strong>
            <span>/ 100</span>
          </div>
          <p className="risk-explain">
            Starts at 100, then subtracts for bills above income, over-budget plan,
            bank balance short of bills, low bill coverage, and overspending vs plan.
          </p>
          <div className="risk-stats">
            <span>
              <strong>{formatCurrency(bankBalance)}</strong>
              <small>Bank balance</small>
            </span>
            <span>
              <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
              <small>Monthly bills</small>
            </span>
            <span>
              <strong>{bankCoverageLabel}</strong>
              <small>Bills covered</small>
            </span>
            <span>
              <strong>{formatCurrency(leftToBudget)}</strong>
              <small>Left to budget</small>
            </span>
          </div>
        </div>
        <div className="ai-card">
          <div className="card-head">
            <h3>Paycheck guidance</h3>
            <span className="tag">Actionable</span>
          </div>
          <div className="ai-guidance">
            {aiGuidance.map((item, index) => (
              <p key={`ai-guidance-${index}`}>{item}</p>
            ))}
          </div>
          <div className="ai-metrics">
            <span>
              <strong>{formatCurrency(nextPaycheckTotal)}</strong>
              <small>Next paycheck</small>
            </span>
            <span>
              <strong>{nextPayDateDisplay}</strong>
              <small>Next pay date</small>
            </span>
            <span>
              <strong>{formatCurrency(billsPerPaycheck)}</strong>
              <small>Set aside for bills</small>
            </span>
            <span>
              <strong>{formatCurrency(nextPaycheckAfterBills)}</strong>
              <small>After bills</small>
            </span>
            <span>
              <strong>{formatCurrency(weeklyFlexTarget)}</strong>
              <small>Weekly flex</small>
            </span>
          </div>
        </div>
        <div className="ai-card">
          <div className="card-head">
            <h3>Credit card payoff</h3>
            <span className="tag">Personalized</span>
          </div>
          <div className="summary-editor">
            <label>
              Current credit card balance
              <input
                type="number"
                value={creditCardBalance}
                onChange={(event) => setCreditCardBalance(Number(event.target.value || 0))}
              />
            </label>
          </div>
          <div className="ai-guidance">
            {creditCardPlan.items.map((item, index) => (
              <p key={`credit-guidance-${index}`}>{item}</p>
            ))}
          </div>
          <div className="ai-metrics">
            <span>
              <strong>{formatCurrency(creditCardPlan.basePayment)}</strong>
              <small>Monthly target</small>
            </span>
            <span>
              <strong>
                {creditCardPlan.monthsToClear
                  ? `${creditCardPlan.monthsToClear} ${
                      creditCardPlan.monthsToClear === 1 ? 'month' : 'months'
                    }`
                  : '—'}
              </strong>
              <small>Estimated payoff</small>
            </span>
            <span>
              <strong>{formatCurrency(creditCardPlan.perPaycheck)}</strong>
              <small>Per paycheck</small>
            </span>
          </div>
        </div>
        <div className="ai-card">
          <div className="card-head">
            <h3>Bill-by-bill allocation</h3>
            <div className="allocation-controls">
              <span className="tag">Next paycheck</span>
              <div className="allocation-toggle">
                <button
                  className={allocationSortMode === 'due' ? 'solid small' : 'ghost small'}
                  type="button"
                  onClick={() => setAllocationSortMode('due')}
                >
                  Due date
                </button>
                <button
                  className={allocationSortMode === 'custom' ? 'solid small' : 'ghost small'}
                  type="button"
                  onClick={() => setAllocationSortMode('custom')}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>
          <div className="allocation-table">
            <div className="allocation-row header">
              <span>Bill</span>
              <span>Due</span>
              <span>Planned</span>
              <span>Allocation</span>
              <span>Order</span>
            </div>
            {orderedAllocations.length ? (
              orderedAllocations.map((bill, index) => (
                <div className="allocation-row" key={`alloc-${bill.id}`}>
                  <span>{bill.name || 'Untitled bill'}</span>
                  <span>{bill.dueLabel || 'Unscheduled'}</span>
                  <span>{formatCurrency(bill.amount)}</span>
                  <span>{formatCurrency(bill.allocation)}</span>
                  <div className="allocation-actions">
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => moveAllocation(bill.id, 'up')}
                      disabled={allocationSortMode !== 'custom' || index === 0}
                    >
                      Up
                    </button>
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => moveAllocation(bill.id, 'down')}
                      disabled={
                        allocationSortMode !== 'custom' || index === orderedAllocations.length - 1
                      }
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Add bills to see allocations.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
