import type { BudgetBill } from '../../../types/app'

type CashflowModuleProps = {
  budgetBills: BudgetBill[]
  formatCurrency: (value: number) => string
  leftToBudget: string
  lowestWeek: string
  monthlyIncome: string
  onBillChange: (index: number, field: 'name' | 'date' | 'amount' | 'recurringDay', value: string) => void
  stressCount: number
  weeks: Array<{ label: string; value: number; width: string }>
}

export function CashflowModule({
  budgetBills,
  formatCurrency,
  leftToBudget,
  lowestWeek,
  monthlyIncome,
  onBillChange,
  stressCount,
  weeks,
}: CashflowModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-4">
        <article className="figma-kpi-card">
          <span>Monthly income</span>
          <strong>{monthlyIncome}</strong>
        </article>
        <article className="figma-kpi-card">
          <span>Left to budget</span>
          <strong>{leftToBudget}</strong>
        </article>
        <article className="figma-kpi-card">
          <span>Lowest week</span>
          <strong>{lowestWeek}</strong>
        </article>
        <article className="figma-kpi-card">
          <span>Tight weeks</span>
          <strong>{stressCount}</strong>
        </article>
      </section>

      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Weekly cash flow</h3>
            <span className="figma-pill">Next 4 weeks</span>
          </div>
          <div className="figma-bar-list">
            {weeks.map((week) => (
              <div className="figma-bar-row" key={week.label}>
                <span>{week.label}</span>
                <div className="figma-bar-track">
                  <div className="figma-bar-fill" style={{ width: week.width }} />
                </div>
                <strong>{week.value < 0 ? `-$${Math.abs(week.value)}` : `$${week.value}`}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Signals</h3>
          </div>
          <div className="figma-kpi-list">
            <div><span>Best week</span><strong>{weeks.slice().sort((a, b) => b.value - a.value)[0]?.label}</strong></div>
            <div><span>Worst week</span><strong>{weeks.slice().sort((a, b) => a.value - b.value)[0]?.label}</strong></div>
            <div><span>Pattern</span><strong>{stressCount ? 'Needs smoothing' : 'Stable'}</strong></div>
          </div>
        </article>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Schedule editor</h3>
          <span className="figma-muted">Edit due dates and amounts inline</span>
        </div>
        <div className="figma-data-grid figma-data-grid-schedule">
          <div className="figma-data-head">
            <span>Bill</span>
            <span>Due date</span>
            <span>Day</span>
            <span>Amount</span>
          </div>
          {budgetBills.map((bill, index) => (
            <div className="figma-data-row" key={`${bill.name}-${index}`}>
              <input
                type="text"
                value={bill.name}
                onChange={(event) => onBillChange(index, 'name', event.target.value)}
              />
              <input
                type="date"
                value={bill.date}
                onChange={(event) => onBillChange(index, 'date', event.target.value)}
              />
              <input
                type="number"
                min="1"
                max="31"
                value={bill.recurringDay ?? ''}
                onChange={(event) => onBillChange(index, 'recurringDay', event.target.value)}
              />
              <input
                type="number"
                value={bill.amount}
                onChange={(event) => onBillChange(index, 'amount', event.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="figma-inline-summary">
          <span>{budgetBills.length} scheduled bills</span>
          <strong>{formatCurrency(budgetBills.reduce((sum, bill) => sum + bill.amount, 0))}</strong>
        </div>
      </section>
    </div>
  )
}
