import type { Dispatch, RefObject, SetStateAction } from 'react'

type PlannerViewProps = {
  budgetGoals: Array<{ amount: number; name: string; target: number }>
  formatBillDateLabel: (bill: { date: string; recurringDay?: number | null }) => string
  formatCurrency: (value: number) => string
  goalPace: (amount: number, target: number) => string
  handleAddGoal: () => void
  handleQuickAdd: (name: string) => void
  newGoal: { name: string; target: string }
  plannerRef: RefObject<HTMLDivElement | null>
  scheduledBills: Array<{ amount: number; date: string; name: string; recurringDay?: number | null }>
  setNewGoal: Dispatch<SetStateAction<{ name: string; target: string }>>
  setShowGoalForm: Dispatch<SetStateAction<boolean>>
  showGoalForm: boolean
}

export default function PlannerView({
  budgetGoals,
  formatBillDateLabel,
  formatCurrency,
  goalPace,
  handleAddGoal,
  handleQuickAdd,
  newGoal,
  plannerRef,
  scheduledBills,
  setNewGoal,
  setShowGoalForm,
  showGoalForm,
}: PlannerViewProps) {
  return (
    <section className="planner" ref={plannerRef}>
      <div className="section-head">
        <div>
          <h2>Plan bills, goals, and extras</h2>
          <p>Set dates and keep goals on track.</p>
        </div>
      </div>
      <div className="planner-grid">
        <div className="planner-card">
          <h3>Upcoming bills</h3>
          <ul>
            {scheduledBills.map((bill) => (
              <li key={bill.name}>
                <span>{bill.name}</span>
                <strong>{formatCurrency(bill.amount)}</strong>
                <em>{formatBillDateLabel(bill)}</em>
              </li>
            ))}
          </ul>
        </div>
        <div className="planner-card">
          <h3>Goals at a glance</h3>
          <div className="goal-list">
            {budgetGoals.map((goal) => (
              <div className="goal-row" key={goal.name}>
                <div>
                  <p>{goal.name}</p>
                  <span>
                    {formatCurrency(goal.amount)} of {formatCurrency(goal.target)}
                  </span>
                </div>
                <strong>{goalPace(goal.amount, goal.target)}</strong>
              </div>
            ))}
          </div>
          {showGoalForm ? (
            <div className="inline-form compact">
              <input
                type="text"
                placeholder="Goal name"
                value={newGoal.name}
                onChange={(event) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
              <input
                type="number"
                placeholder="Target $"
                value={newGoal.target}
                onChange={(event) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    target: event.target.value,
                  }))
                }
              />
              <div className="inline-actions">
                <button className="solid small" onClick={handleAddGoal}>
                  Save goal
                </button>
                <button className="ghost small" onClick={() => setShowGoalForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="ghost small" onClick={() => setShowGoalForm(true)}>
              Add a goal
            </button>
          )}
        </div>
        <div className="planner-card">
          <h3>Quick add</h3>
          <div className="chip-grid">
            <button onClick={() => handleQuickAdd('Utilities')}>Utilities</button>
            <button onClick={() => handleQuickAdd('Subscriptions')}>Subscriptions</button>
            <button onClick={() => handleQuickAdd('Kids')}>Kids</button>
            <button onClick={() => handleQuickAdd('Health')}>Health</button>
            <button onClick={() => handleQuickAdd('Pets')}>Pets</button>
            <button onClick={() => handleQuickAdd('Gifts')}>Gifts</button>
          </div>
          <p className="muted">Tap once to add a bill with basic defaults.</p>
        </div>
      </div>
    </section>
  )
}
