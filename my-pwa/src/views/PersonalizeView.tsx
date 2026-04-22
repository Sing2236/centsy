import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { UserProfile } from '../types/app'

type PersonalizeViewProps = {
  autoSaveEnabled: boolean
  autoSuggest: boolean
  handleManualPreferencesSave: () => void
  handleUsernameSave: () => void
  includePartner: boolean
  incomePerPaycheck: number
  monthlyBuffer: number
  notificationBillReminders: boolean
  notificationOverBudget: boolean
  notificationReminderDays: number
  notificationWeeklySummary: boolean
  onOpenCadence: () => void
  onOpenLabels: () => void
  onOpenStrategy: () => void
  payDateCount: number
  payDates: string[]
  payFrequency: string
  personalizeRef: RefObject<HTMLDivElement | null>
  primaryGoal: string
  partnerIncome: number
  setAutoSaveEnabled: (value: boolean) => void
  setAutoSuggest: (value: boolean) => void
  setIncludePartner: (value: boolean) => void
  setIncomePerPaycheck: (value: number) => void
  setMonthlyBuffer: (value: number) => void
  setNotificationBillReminders: (value: boolean) => void
  setNotificationOverBudget: (value: boolean) => void
  setNotificationReminderDays: (value: number) => void
  setNotificationWeeklySummary: (value: boolean) => void
  setPartnerIncome: (value: number) => void
  setPayDates: Dispatch<SetStateAction<string[]>>
  setPayFrequency: (value: string) => void
  setPrimaryGoal: (value: string) => void
  setUsernameDraft: (value: string) => void
  showToast: (message: string) => void
  userProfile: UserProfile | null
  usernameChangeLocked: boolean
  usernameCooldownDays: number
  usernameDraft: string
  usernameError: string
  usernameNextChangeDate: Date | null
  usernameSaving: boolean
  formatLongDate: (value: string) => string
}

export default function PersonalizeView({
  autoSaveEnabled,
  autoSuggest,
  handleManualPreferencesSave,
  handleUsernameSave,
  includePartner,
  incomePerPaycheck,
  monthlyBuffer,
  notificationBillReminders,
  notificationOverBudget,
  notificationReminderDays,
  notificationWeeklySummary,
  onOpenCadence,
  onOpenLabels,
  onOpenStrategy,
  payDateCount,
  payDates,
  payFrequency,
  personalizeRef,
  primaryGoal,
  partnerIncome,
  setAutoSaveEnabled,
  setAutoSuggest,
  setIncludePartner,
  setIncomePerPaycheck,
  setMonthlyBuffer,
  setNotificationBillReminders,
  setNotificationOverBudget,
  setNotificationReminderDays,
  setNotificationWeeklySummary,
  setPartnerIncome,
  setPayDates,
  setPayFrequency,
  setPrimaryGoal,
  setUsernameDraft,
  showToast,
  userProfile,
  usernameChangeLocked,
  usernameCooldownDays,
  usernameDraft,
  usernameError,
  usernameNextChangeDate,
  usernameSaving,
  formatLongDate,
}: PersonalizeViewProps) {
  return (
    <section className="personalize" ref={personalizeRef}>
      <div className="section-head">
        <div>
          <h2>Set your preferences</h2>
          <p>Update pay timing, goals, and reminders to fit your life.</p>
        </div>
      </div>
      <div className="personalize-grid">
        <div className="personal-card">
          <h3>Pay timing</h3>
          <p>Shift pay timing to see weekly cash.</p>
          <button className="ghost small" onClick={onOpenCadence}>
            Set timing
          </button>
        </div>
        <div className="personal-card">
          <h3>Debt payoff style</h3>
          <p>Pick avalanche or snowball.</p>
          <button className="ghost small" onClick={onOpenStrategy}>
            Pick style
          </button>
        </div>
        <div className="personal-card">
          <h3>Bill labels</h3>
          <p>Group bills to keep lists tidy.</p>
          <button className="ghost small" onClick={onOpenLabels}>
            Manage labels
          </button>
        </div>
      </div>
      <div className="preferences-grid">
        <div className="preferences-card">
          <div className="card-head">
            <h3>Budget defaults</h3>
            <span className="tag">Changes now</span>
          </div>
          <div className="preferences-form">
            <label className="input-row">
              Pay frequency
              <select value={payFrequency} onChange={(event) => setPayFrequency(event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <div className="input-row">
              Pay dates
              <div className="paydate-row">
                {Array.from({ length: payDateCount }).map((_, index) => (
                  <label className="paydate-field" key={`paydate-${index}`}>
                    {payFrequency === 'monthly' ? 'Payday' : `Payday ${index + 1}`}
                    <input
                      type="date"
                      value={payDates[index] ?? ''}
                      onChange={(event) => {
                        const next = [...payDates]
                        next[index] = event.target.value
                        setPayDates(next)
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <label className="input-row">
              Primary goal
              <select value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value)}>
                <option value="stability">Stability</option>
                <option value="debt">Pay off debt</option>
                <option value="savings">Save more</option>
                <option value="flex">More flexibility</option>
              </select>
            </label>
            <label className="input-row">
              Take-home per paycheck
              <input
                type="number"
                value={incomePerPaycheck}
                onChange={(event) => setIncomePerPaycheck(Number(event.target.value || 0))}
              />
            </label>
            <div className="toggle-row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={autoSuggest}
                  onChange={(event) => setAutoSuggest(event.target.checked)}
                />
                <span>Auto-suggest bills</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={includePartner}
                  onChange={(event) => setIncludePartner(event.target.checked)}
                />
                <span>Include partner income</span>
              </label>
            </div>
            {includePartner ? (
              <label className="input-row">
                Partner monthly income
                <input
                  type="number"
                  value={partnerIncome}
                  onChange={(event) => setPartnerIncome(Number(event.target.value || 0))}
                />
              </label>
            ) : null}
          </div>
        </div>
        <div className="preferences-card">
          <div className="card-head">
            <h3>Alerts & reminders</h3>
            <span className="tag">Notifications</span>
          </div>
          <div className="preferences-form">
            <label className="toggle">
              <input
                type="checkbox"
                checked={notificationWeeklySummary}
                onChange={(event) => setNotificationWeeklySummary(event.target.checked)}
              />
              <span>Weekly summary</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notificationOverBudget}
                onChange={(event) => setNotificationOverBudget(event.target.checked)}
              />
              <span>Over budget alerts</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notificationBillReminders}
                onChange={(event) => setNotificationBillReminders(event.target.checked)}
              />
              <span>Bill reminders</span>
            </label>
            <label className="input-row">
              Reminder lead days
              <input
                type="number"
                min="1"
                max="14"
                value={notificationReminderDays}
                onChange={(event) => setNotificationReminderDays(Number(event.target.value || 0))}
              />
            </label>
            <p className="helper">Alerts pause while you are in the app.</p>
          </div>
        </div>
        <div className="preferences-card">
          <div className="card-head">
            <h3>Community username</h3>
            <span className="tag">Every 30 days</span>
          </div>
          <div className="preferences-form">
            <label className="input-row">
              Username
              <input
                type="text"
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value)}
                disabled={usernameChangeLocked}
              />
            </label>
            <p className="helper">
              {usernameError ||
                'Use 3-20 letters, numbers, or underscores. Update every 30 days.'}
            </p>
            {usernameChangeLocked && usernameNextChangeDate ? (
              <p className="helper">
                Next update in {usernameCooldownDays} day
                {usernameCooldownDays === 1 ? '' : 's'} (
                {formatLongDate(usernameNextChangeDate.toISOString())})
              </p>
            ) : null}
          </div>
          <div className="preferences-footer">
            <button
              className="solid small"
              onClick={handleUsernameSave}
              disabled={usernameSaving || usernameChangeLocked}
            >
              {usernameSaving
                ? 'Saving...'
                : userProfile?.username
                  ? 'Update username'
                  : 'Save username'}
            </button>
          </div>
        </div>
        <div className="preferences-card">
          <div className="card-head">
            <h3>Safety buffer</h3>
            <span className="tag">Cash reserve</span>
          </div>
          <div className="preferences-form">
            <label className="input-row">
              Monthly buffer
              <input
                type="number"
                min="0"
                value={monthlyBuffer}
                onChange={(event) => setMonthlyBuffer(Number(event.target.value || 0))}
              />
            </label>
            <p className="helper">We subtract this from left-to-budget and weekly cash.</p>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(event) => {
                  setAutoSaveEnabled(event.target.checked)
                  showToast(event.target.checked ? 'Auto-save enabled.' : 'Auto-save paused.')
                }}
              />
              <span>Auto-save</span>
            </label>
          </div>
          <div className="preferences-footer">
            <button className="ghost small" onClick={() => setMonthlyBuffer(0)}>
              Reset buffer
            </button>
          </div>
        </div>
      </div>
      <div className="preferences-actions">
        <button className="solid" onClick={handleManualPreferencesSave}>
          Save preferences
        </button>
      </div>
    </section>
  )
}
