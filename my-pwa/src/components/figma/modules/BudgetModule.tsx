import type { BudgetCategory, BudgetGoal } from '../../../types/app'

type CategoryDraft = { actual: string; name: string; planned: string }
type GoalDraft = { amount: string; name: string; target: string }
type SpendDraftInput = {
  amount: string
  category: string
  date: string
  direction: 'expense' | 'refund'
  merchant: string
  note: string
}

type BudgetModuleProps = {
  budgetCategories: BudgetCategory[]
  budgetGoals: BudgetGoal[]
  categoryDraft: CategoryDraft
  formatCurrency: (value: number) => string
  goalDraft: GoalDraft
  incomePerPaycheck: number
  includePartner: boolean
  onAddCategory: () => void
  onAddGoal: () => void
  onDeleteCategory: (name: string) => void
  onDeleteGoal: (name: string) => void
  onGenerateBudget: () => void
  onAddSpendEntry: () => void
  onAdjustSpendEntry: (id: string, delta: number) => void
  onDeleteSpendEntry: (id: string) => void
  partnerIncome: number
  payFrequency: string
  primaryGoal: string
  recentSpends: Array<{ amount: number; category: string; date: string; id: string; merchant: string }>
  setCategoryDraft: (updater: (prev: CategoryDraft) => CategoryDraft) => void
  setGoalDraft: (updater: (prev: GoalDraft) => GoalDraft) => void
  setIncludePartner: (value: boolean) => void
  setIncomePerPaycheck: (value: number) => void
  setNewSpend: (updater: (prev: SpendDraftInput) => SpendDraftInput) => void
  setPartnerIncome: (value: number) => void
  setPayFrequency: (value: string) => void
  setPrimaryGoal: (value: string) => void
  spendDraft: SpendDraftInput
  updateCategoryActual: (name: string, value: number) => void
  updateCategoryPlanned: (name: string, value: number) => void
  updateGoalAmount: (name: string, value: number) => void
  updateGoalTarget: (name: string, value: number) => void
}

export function BudgetModule({
  budgetCategories,
  budgetGoals,
  categoryDraft,
  formatCurrency,
  goalDraft,
  incomePerPaycheck,
  includePartner,
  onAddCategory,
  onAddGoal,
  onDeleteCategory,
  onDeleteGoal,
  onGenerateBudget,
  onAddSpendEntry,
  onAdjustSpendEntry,
  onDeleteSpendEntry,
  partnerIncome,
  payFrequency,
  primaryGoal,
  recentSpends,
  setCategoryDraft,
  setGoalDraft,
  setIncludePartner,
  setIncomePerPaycheck,
  setNewSpend,
  setPartnerIncome,
  setPayFrequency,
  setPrimaryGoal,
  spendDraft,
  updateCategoryActual,
  updateCategoryPlanned,
  updateGoalAmount,
  updateGoalTarget,
}: BudgetModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-3">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Pay setup</h3>
            <button className="figma-primary-button small" type="button" onClick={onGenerateBudget}>
              Generate
            </button>
          </div>
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Take-home paycheck</span>
              <input
                type="number"
                value={incomePerPaycheck}
                onChange={(event) => setIncomePerPaycheck(Number(event.target.value || 0))}
              />
            </label>
            <label className="figma-field">
              <span>Pay cadence</span>
              <select value={payFrequency} onChange={(event) => setPayFrequency(event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="figma-field">
              <span>Primary goal</span>
              <select value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value)}>
                <option value="stability">Stability</option>
                <option value="debt">Debt</option>
                <option value="savings">Savings</option>
                <option value="flex">Flexibility</option>
              </select>
            </label>
            <label className="figma-check">
              <input
                type="checkbox"
                checked={includePartner}
                onChange={(event) => setIncludePartner(event.target.checked)}
              />
              <span>Include partner income</span>
            </label>
            {includePartner ? (
              <label className="figma-field">
                <span>Partner income</span>
                <input
                  type="number"
                  value={partnerIncome}
                  onChange={(event) => setPartnerIncome(Number(event.target.value || 0))}
                />
              </label>
            ) : null}
          </div>
        </article>

        <article className="figma-panel figma-panel-wide">
          <div className="figma-panel-head">
            <h3>Monthly bills</h3>
          </div>
          <div className="figma-data-grid figma-data-grid-categories">
            <div className="figma-data-head">
              <span>Bill</span>
              <span>Planned</span>
              <span>Actual</span>
              <span />
            </div>
            {budgetCategories.map((category) => (
              <div className="figma-data-row" key={category.name}>
                <strong>{category.name}</strong>
                <input
                  type="number"
                  value={category.planned}
                  onChange={(event) =>
                    updateCategoryPlanned(category.name, Number(event.target.value || 0))
                  }
                />
                <input
                  type="number"
                  value={category.actual}
                  onChange={(event) =>
                    updateCategoryActual(category.name, Number(event.target.value || 0))
                  }
                />
                <button className="figma-secondary-button small" type="button" onClick={() => onDeleteCategory(category.name)}>
                  Remove
                </button>
              </div>
            ))}
            <div className="figma-data-row draft">
              <input
                type="text"
                placeholder="New bill"
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                type="number"
                placeholder="Planned"
                value={categoryDraft.planned}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, planned: event.target.value }))
                }
              />
              <input
                type="number"
                placeholder="Actual"
                value={categoryDraft.actual}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, actual: event.target.value }))
                }
              />
              <button className="figma-primary-button small" type="button" onClick={onAddCategory}>
                Add
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Goals</h3>
        </div>
        <div className="figma-data-grid figma-data-grid-goals">
          <div className="figma-data-head">
            <span>Goal</span>
            <span>Saved</span>
            <span>Target</span>
            <span />
          </div>
          {budgetGoals.map((goal) => (
            <div className="figma-data-row" key={goal.name}>
              <strong>{goal.name}</strong>
              <input
                type="number"
                value={goal.amount}
                onChange={(event) => updateGoalAmount(goal.name, Number(event.target.value || 0))}
              />
              <input
                type="number"
                value={goal.target}
                onChange={(event) => updateGoalTarget(goal.name, Number(event.target.value || 0))}
              />
              <button className="figma-secondary-button small" type="button" onClick={() => onDeleteGoal(goal.name)}>
                Remove
              </button>
            </div>
          ))}
          <div className="figma-data-row draft">
            <input
              type="text"
              placeholder="New goal"
              value={goalDraft.name}
              onChange={(event) =>
                setGoalDraft((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Saved"
              value={goalDraft.amount}
              onChange={(event) =>
                setGoalDraft((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Target"
              value={goalDraft.target}
              onChange={(event) =>
                setGoalDraft((prev) => ({ ...prev, target: event.target.value }))
              }
            />
            <button className="figma-primary-button small" type="button" onClick={onAddGoal}>
              Add
            </button>
          </div>
        </div>
        <div className="figma-inline-summary">
          <span>{budgetCategories.length} bills</span>
          <span>{budgetGoals.length} goals</span>
          <strong>
            Planned total {formatCurrency(budgetCategories.reduce((sum, item) => sum + item.planned, 0))}
          </strong>
        </div>
      </section>

      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Log spending</h3>
          </div>
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Merchant</span>
              <input
                type="text"
                value={spendDraft.merchant}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, merchant: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Amount</span>
              <input
                type="number"
                value={spendDraft.amount}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Bill</span>
              <select
                value={spendDraft.category}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {budgetCategories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="figma-primary-button" type="button" onClick={onAddSpendEntry}>
              Add spend
            </button>
          </div>
        </article>

        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Recent spending</h3>
          </div>
          <div className="figma-list">
            {recentSpends.length ? (
              recentSpends.map((entry) => (
                <div className="figma-list-row" key={entry.id}>
                  <div>
                    <strong>{entry.merchant}</strong>
                    <p>{entry.category} • {entry.date}</p>
                  </div>
                  <div className="figma-list-meta">
                    <strong>{formatCurrency(entry.amount)}</strong>
                    <div className="figma-inline-actions">
                      <button className="figma-secondary-button small" type="button" onClick={() => onAdjustSpendEntry(entry.id, 5)}>
                        +$5
                      </button>
                      <button className="figma-secondary-button small" type="button" onClick={() => onDeleteSpendEntry(entry.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="figma-muted">No spending logged yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
