import type { Dispatch, SetStateAction } from 'react'
import type { SpendEntry } from '../types/app'

type BudgetCategory = { actual: number; name: string; planned: number }
type SpendDraftInput = {
  amount: string
  category: string
  date: string
  direction: 'expense' | 'refund'
  merchant: string
  note: string
}
type SpendEditInput = SpendDraftInput
type SpendRollupRow = {
  logged: number
  name: string
  planned: number
  remaining: number
  status: string
}

type SpendViewProps = {
  budgetCategories: BudgetCategory[]
  editingSpendId: string | null
  editSpendValues: SpendEditInput
  formatCurrency: (value: number) => string
  formatShortDate: (value: string) => string
  handleAddSpendEntry: () => void
  handleAdjustSpendEntry: (id: string, delta: number) => void
  handleCancelSpendEdit: () => void
  handleDeleteSpendEntry: (id: string) => void
  handleEditSpendEntry: (id: string) => void
  handleSaveSpendEntry: (id: string) => void
  newSpend: SpendDraftInput
  onOpenSchedule: () => void
  remainingSpend: number
  setEditSpendValues: Dispatch<SetStateAction<SpendEditInput>>
  setNewSpend: Dispatch<SetStateAction<SpendDraftInput>>
  spendCategoryRows: SpendRollupRow[]
  spendEntries: SpendEntry[]
  spendEntriesSorted: SpendEntry[]
  spendEntriesTotal: number
  spendStepOptions: number[]
  spendVariance: number
  totalPlannedSpend: number
}

export default function SpendView({
  budgetCategories,
  editingSpendId,
  editSpendValues,
  formatCurrency,
  formatShortDate,
  handleAddSpendEntry,
  handleAdjustSpendEntry,
  handleCancelSpendEdit,
  handleDeleteSpendEntry,
  handleEditSpendEntry,
  handleSaveSpendEntry,
  newSpend,
  onOpenSchedule,
  remainingSpend,
  setEditSpendValues,
  setNewSpend,
  spendCategoryRows,
  spendEntries,
  spendEntriesSorted,
  spendEntriesTotal,
  spendStepOptions,
  spendVariance,
  totalPlannedSpend,
}: SpendViewProps) {
  return (
    <section className="spend-view">
      <div className="section-head">
        <div>
          <h2>Spending tracker</h2>
          <p>Log each purchase and see how it rolls up into your bills.</p>
        </div>
        <button className="ghost" onClick={onOpenSchedule}>
          Review bill schedule
        </button>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span>Planned spending</span>
          <strong>{formatCurrency(totalPlannedSpend)}</strong>
          <small>{spendCategoryRows.length} tracked bills</small>
        </div>
        <div className="summary-card">
          <span>Logged spending</span>
          <strong>{formatCurrency(spendEntriesTotal)}</strong>
          <small>{spendEntries.length} entries</small>
        </div>
        <div className="summary-card">
          <span>Remaining</span>
          <strong>{formatCurrency(remainingSpend)}</strong>
          <small>Left before plan</small>
        </div>
        <div className={`summary-card highlight ${spendVariance > 0 ? 'negative' : ''}`}>
          <span>Variance</span>
          <strong>{formatCurrency(spendVariance)}</strong>
          <small>{spendVariance > 0 ? 'Over plan' : 'Under plan'}</small>
        </div>
      </div>
      <div className="spend-grid">
        <div className="spend-card">
          <div className="card-head">
            <h3>Log a purchase</h3>
            <span className="tag">Daily spend</span>
          </div>
          <div className="spend-form">
            <label>
              Merchant or item
              <input
                type="text"
                placeholder="Snacks, coffee, fuel"
                value={newSpend.merchant}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, merchant: event.target.value }))
                }
              />
            </label>
            <div className="spend-form-row">
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newSpend.amount}
                  onChange={(event) =>
                    setNewSpend((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={newSpend.date}
                  onChange={(event) =>
                    setNewSpend((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </label>
              <label>
                Bill
                <select
                  value={newSpend.category}
                  onChange={(event) =>
                    setNewSpend((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  {budgetCategories.length ? (
                    budgetCategories.map((category) => (
                      <option key={`spend-${category.name}`} value={category.name}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a bill first</option>
                  )}
                </select>
              </label>
            </div>
            <label>
              Note (optional)
              <input
                type="text"
                placeholder="Late-night snack run"
                value={newSpend.note}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </label>
            <div className="spend-toggle">
              <button
                className={newSpend.direction === 'expense' ? 'solid small' : 'ghost small'}
                type="button"
                onClick={() => setNewSpend((prev) => ({ ...prev, direction: 'expense' }))}
              >
                Expense
              </button>
              <button
                className={newSpend.direction === 'refund' ? 'solid small' : 'ghost small'}
                type="button"
                onClick={() => setNewSpend((prev) => ({ ...prev, direction: 'refund' }))}
              >
                Refund
              </button>
            </div>
            <button className="solid" onClick={handleAddSpendEntry}>
              Add spend
            </button>
          </div>
          <div className="spend-log">
            <div className="card-head">
              <h4>Recent spends</h4>
              <span className="tag">Editable</span>
            </div>
            {editingSpendId ? (
              <div className="spend-edit-panel">
                <div className="card-head">
                  <h4>Edit spend</h4>
                  <span className="tag">Selected</span>
                </div>
                <div className="spend-form spend-edit">
                  <label>
                    Merchant
                    <input
                      type="text"
                      value={editSpendValues.merchant}
                      onChange={(event) =>
                        setEditSpendValues((prev) => ({
                          ...prev,
                          merchant: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="spend-form-row">
                    <label>
                      Amount
                      <input
                        type="number"
                        value={editSpendValues.amount}
                        onChange={(event) =>
                          setEditSpendValues((prev) => ({
                            ...prev,
                            amount: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Date
                      <input
                        type="date"
                        value={editSpendValues.date}
                        onChange={(event) =>
                          setEditSpendValues((prev) => ({
                            ...prev,
                            date: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Bill
                      <select
                        value={editSpendValues.category}
                        onChange={(event) =>
                          setEditSpendValues((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                      >
                        {budgetCategories.length ? (
                          budgetCategories.map((category) => (
                            <option
                              key={`spend-edit-${category.name}`}
                              value={category.name}
                            >
                              {category.name}
                            </option>
                          ))
                        ) : (
                          <option value="">Add a bill first</option>
                        )}
                      </select>
                    </label>
                  </div>
                  <label>
                    Note (optional)
                    <input
                      type="text"
                      value={editSpendValues.note}
                      onChange={(event) =>
                        setEditSpendValues((prev) => ({
                          ...prev,
                          note: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="spend-toggle">
                    <button
                      className={
                        editSpendValues.direction === 'expense' ? 'solid small' : 'ghost small'
                      }
                      type="button"
                      onClick={() =>
                        setEditSpendValues((prev) => ({
                          ...prev,
                          direction: 'expense',
                        }))
                      }
                    >
                      Expense
                    </button>
                    <button
                      className={
                        editSpendValues.direction === 'refund' ? 'solid small' : 'ghost small'
                      }
                      type="button"
                      onClick={() =>
                        setEditSpendValues((prev) => ({
                          ...prev,
                          direction: 'refund',
                        }))
                      }
                    >
                      Refund
                    </button>
                  </div>
                  <div className="spend-edit-actions">
                    <button
                      className="solid small"
                      type="button"
                      onClick={() => handleSaveSpendEntry(editingSpendId)}
                    >
                      Save
                    </button>
                    <button className="ghost small" type="button" onClick={handleCancelSpendEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {spendEntriesSorted.length ? (
              <ul className="spend-log-list">
                {spendEntriesSorted.map((entry) => (
                  <li className="spend-log-row" key={entry.id}>
                    <div className="spend-log-main">
                      <strong>{entry.merchant}</strong>
                      <span>
                        {entry.category} &#8250; {formatShortDate(entry.date)}
                      </span>
                      {entry.note ? <em>{entry.note}</em> : null}
                    </div>
                    <div className={`spend-log-amount ${entry.amount < 0 ? 'negative' : ''}`}>
                      {formatCurrency(entry.amount)}
                    </div>
                    <div className="spend-log-actions">
                      <div className="spend-steps">
                        {spendStepOptions.map((step) => (
                          <button
                            className="ghost small"
                            key={`${entry.id}-${step}`}
                            type="button"
                            onClick={() => handleAdjustSpendEntry(entry.id, step)}
                          >
                            {step > 0 ? `+${formatCurrency(step)}` : formatCurrency(step)}
                          </button>
                        ))}
                      </div>
                      <button
                        className="solid small"
                        type="button"
                        onClick={() => handleEditSpendEntry(entry.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="danger small"
                        type="button"
                        onClick={() => handleDeleteSpendEntry(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No spends logged yet. Add your first snack run or coffee.</p>
            )}
          </div>
        </div>
        <div className="spend-card">
          <div className="card-head">
            <h3>Bill rollup</h3>
            <span className="tag">Budget view</span>
          </div>
          <div className="spend-rollup">
            {spendCategoryRows.map((row) => (
              <div className={`spend-rollup-row ${row.status}`} key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    Planned {formatCurrency(row.planned)} • Logged {formatCurrency(row.logged)}
                  </span>
                </div>
                <div className={`spend-rollup-remaining ${row.remaining < 0 ? 'negative' : ''}`}>
                  {formatCurrency(row.remaining)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
