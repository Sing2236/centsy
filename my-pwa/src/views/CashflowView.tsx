import type { ReactNode } from 'react'
import type { BudgetBill } from '../types/app'

type CashflowViewProps = {
  averageWeekly: number
  budgetBills: BudgetBill[]
  cashflowCarousel: ReactNode
  cashflowTrendBox: ReactNode
  formatCurrency: (value: number) => string
  leftToBudget: number
  maxWeekly: number
  monthlyIncome: number
  multiplier: number
  onAdjustBillTiming: () => void
  onOpenScheduleEditor: () => void
  payFrequencyLabel: string
  plannedBillsDisplayCount: number
  plannedBillsDisplayTotal: number
  plannedBillsTotal: number
  scheduleBias: number
  setScheduleBias: (value: number) => void
  stressWeeks: Array<{ label: string }>
  weeklyAmounts: number[]
}

export default function CashflowView({
  averageWeekly,
  budgetBills,
  cashflowCarousel,
  cashflowTrendBox,
  formatCurrency,
  leftToBudget,
  maxWeekly,
  monthlyIncome,
  multiplier,
  onAdjustBillTiming,
  onOpenScheduleEditor,
  payFrequencyLabel,
  plannedBillsDisplayCount,
  plannedBillsDisplayTotal,
  plannedBillsTotal,
  scheduleBias,
  setScheduleBias,
  stressWeeks,
  weeklyAmounts,
}: CashflowViewProps) {
  return (
    <section className="cashflow-view">
      <div className="section-head">
        <div>
          <h2>Cash flow view</h2>
          <p>See which weeks are tight and adjust before the month starts.</p>
        </div>
        <button className="ghost" onClick={onAdjustBillTiming}>
          Adjust bill timing
        </button>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span>Monthly income</span>
          <strong>{formatCurrency(monthlyIncome)}</strong>
          <small>
            {payFrequencyLabel} pay x{multiplier}
          </small>
        </div>
        <div className="summary-card">
          <span>Planned monthly bills</span>
          <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
          <small>{plannedBillsDisplayCount} upcoming bills</small>
        </div>
        <div className="summary-card">
          <span>Scheduled bills</span>
          <strong>{formatCurrency(plannedBillsTotal)}</strong>
          <small>{budgetBills.length} scheduled</small>
        </div>
        <div className={`summary-card highlight ${leftToBudget < 0 ? 'negative' : ''}`}>
          <span>Left to budget</span>
          <strong>{formatCurrency(leftToBudget)}</strong>
          <small>{leftToBudget < 0 ? 'Over budget this month' : 'Assignable to bills'}</small>
        </div>
      </div>
      <div className="cashflow-grid">
        <div className="cashflow-panel">
          <div className="card-head">
            <h3>Weekly cash flow</h3>
            <span className="tag">Next 4 weeks</span>
          </div>
          <div className="cashflow">
            {weeklyAmounts.map((amount, index) => (
              <div className="flow-row" key={`cashflow-week-${index}`}>
                <span>Week {index + 1}</span>
                <div className={`flow-bar ${amount < 0 ? 'negative' : ''}`}>
                  <span
                    style={{
                      width: `${Math.max((Math.abs(amount) / maxWeekly) * 100, 8)}%`,
                    }}
                  />
                </div>
                <strong>{formatCurrency(amount)}</strong>
              </div>
            ))}
          </div>
          {cashflowTrendBox}
          <div className="cashflow-controls">
            <label>
              Shift bill schedule
              <input
                type="range"
                min="0"
                max="3"
                value={scheduleBias}
                onChange={(event) => setScheduleBias(Number(event.target.value || 0))}
              />
            </label>
            <div className="range-labels">
              <span>Even</span>
              <span>Front</span>
              <span>Mid</span>
              <span>End</span>
            </div>
          </div>
        </div>
        <div className="cashflow-panel">
          <div className="card-head">
            <h3>Cash flow health</h3>
            <span className="tag">At a glance</span>
          </div>
          <div className="health-list">
            <div className="health-row">
              <span>Average weekly cash</span>
              <strong>{formatCurrency(averageWeekly)}</strong>
            </div>
            <div className="health-row">
              <span>Lowest week</span>
              <strong>{formatCurrency(Math.min(...weeklyAmounts))}</strong>
            </div>
            <div className="health-row">
              <span>Tight weeks</span>
              <strong>{stressWeeks.length}</strong>
            </div>
          </div>
          <div className="stress-note">
            {stressWeeks.length ? (
              <p>
                Tight in {stressWeeks.map((week) => week.label).join(', ')}. Consider shifting
                scheduled bills or trimming one bill.
              </p>
            ) : (
              <p>You have a smooth month with no cash flow dips flagged.</p>
            )}
          </div>
          <button className="solid small" onClick={onOpenScheduleEditor}>
            Smooth this month
          </button>
        </div>
      </div>
      <section className="cashflow-carousel-strip">
        <div className="card-head">
          <h3>Cash flow highlights</h3>
          <span className="tag">Use arrows</span>
        </div>
        {cashflowCarousel}
      </section>
      <div className="cashflow-help">
        <div className="card-head">
          <h3>How to read this view</h3>
          <span className="tag">Cash flow basics</span>
        </div>
        <div className="help-grid">
          <div>
            <h4>Weekly cash flow</h4>
            <p>
              Each bar shows how much money is left that week. Taller bars mean more
              room. Shorter bars mean tighter weeks.
            </p>
          </div>
          <div>
            <h4>Shift bill schedule</h4>
            <p>
              This slider moves bills earlier or later in the month. "Even" spreads
              cash out. "Front" or "End" shifts it to one side.
            </p>
          </div>
          <div>
            <h4>Cash flow health</h4>
            <p>
              Average weekly cash is your usual weekly balance. Lowest week is your
              tightest week. Tight weeks show when you dip low.
            </p>
          </div>
          <div>
            <h4>Smooth this month</h4>
            <p>Jump to the schedule editor to move bill dates and smooth dips.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
