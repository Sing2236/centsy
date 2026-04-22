type SettingsModuleProps = {
  autoSaveEnabled: boolean
  includePartner: boolean
  monthlyBuffer: number
  notificationBillReminders: boolean
  notificationOverBudget: boolean
  notificationWeeklySummary: boolean
  onSave: () => void
  setAutoSaveEnabled: (value: boolean) => void
  setIncludePartner: (value: boolean) => void
  setMonthlyBuffer: (value: number) => void
  setNotificationBillReminders: (value: boolean) => void
  setNotificationOverBudget: (value: boolean) => void
  setNotificationWeeklySummary: (value: boolean) => void
  userEmail: string | null
}

export function SettingsModule({
  autoSaveEnabled,
  includePartner,
  monthlyBuffer,
  notificationBillReminders,
  notificationOverBudget,
  notificationWeeklySummary,
  onSave,
  setAutoSaveEnabled,
  setIncludePartner,
  setMonthlyBuffer,
  setNotificationBillReminders,
  setNotificationOverBudget,
  setNotificationWeeklySummary,
  userEmail,
}: SettingsModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Account</h3>
          </div>
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Email</span>
              <input type="text" value={userEmail ?? 'Not signed in'} readOnly />
            </label>
            <label className="figma-check">
              <input
                type="checkbox"
                checked={includePartner}
                onChange={(event) => setIncludePartner(event.target.checked)}
              />
              <span>Include partner income</span>
            </label>
            <label className="figma-check">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(event) => setAutoSaveEnabled(event.target.checked)}
              />
              <span>Auto-save budget state</span>
            </label>
            <label className="figma-field">
              <span>Monthly buffer</span>
              <input
                type="number"
                value={monthlyBuffer}
                onChange={(event) => setMonthlyBuffer(Number(event.target.value || 0))}
              />
            </label>
          </div>
        </article>

        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Notifications</h3>
          </div>
          <div className="figma-form-grid">
            <label className="figma-check">
              <input
                type="checkbox"
                checked={notificationWeeklySummary}
                onChange={(event) => setNotificationWeeklySummary(event.target.checked)}
              />
              <span>Weekly summary</span>
            </label>
            <label className="figma-check">
              <input
                type="checkbox"
                checked={notificationOverBudget}
                onChange={(event) => setNotificationOverBudget(event.target.checked)}
              />
              <span>Over-budget alerts</span>
            </label>
            <label className="figma-check">
              <input
                type="checkbox"
                checked={notificationBillReminders}
                onChange={(event) => setNotificationBillReminders(event.target.checked)}
              />
              <span>Bill reminders</span>
            </label>
          </div>
        </article>
      </section>

      <div className="figma-panel-actions">
        <button className="figma-primary-button" type="button" onClick={onSave}>
          Save settings
        </button>
      </div>
    </div>
  )
}
