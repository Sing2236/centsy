type ChatMessage = { content: string; role: 'assistant' | 'user' }

type CopilotViewProps = {
  bankBalance: number
  bankCoverageLabel: string
  bankGuidance: string[]
  billsPerPaycheck: number
  chatInput: string
  chatLoading: boolean
  chatMessages: ChatMessage[]
  dailyFlexTarget: number
  formatCurrency: (value: number) => string
  handleSendChat: () => void
  nextPaycheckAfterBills: number
  payFrequencyLabel: string
  plannedBillsDisplayCount: number
  plannedBillsDisplayTotal: number
  pendingLocalAction: unknown
  pendingSummary: string
  pendingUiAction: unknown
  pendingUpdates: unknown
  pendingUtilityAction: unknown
  setChatInput: (value: string) => void
  setPendingLocalAction: (value: null) => void
  setPendingSummary: (value: string) => void
  setPendingUpdates: (value: null) => void
  weeklyFlexTarget: number
  applyPendingChanges: () => void
}

export default function CopilotView({
  bankBalance,
  bankCoverageLabel,
  bankGuidance,
  billsPerPaycheck,
  chatInput,
  chatLoading,
  chatMessages,
  dailyFlexTarget,
  formatCurrency,
  handleSendChat,
  nextPaycheckAfterBills,
  payFrequencyLabel,
  plannedBillsDisplayCount,
  plannedBillsDisplayTotal,
  pendingLocalAction,
  pendingSummary,
  pendingUiAction,
  pendingUpdates,
  pendingUtilityAction,
  setChatInput,
  setPendingLocalAction,
  setPendingSummary,
  setPendingUpdates,
  weeklyFlexTarget,
  applyPendingChanges,
}: CopilotViewProps) {
  return (
    <section className="copilot">
      <div className="section-head">
        <div>
          <h2>Budget Copilot</h2>
          <p>Tell me what to change. I will suggest edits. Click Apply changes to confirm.</p>
        </div>
        <span className="tag">Powered by Groq</span>
      </div>
      <div className="copilot-grid">
        <div className="chat-card">
          <div className="chat-window">
            {chatMessages.length
              ? chatMessages.map((message, index) => (
                  <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                    {message.content}
                  </div>
                ))
              : null}
            {chatLoading ? (
              <div className="chat-bubble assistant">Drafting changes and next steps...</div>
            ) : null}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              placeholder="Tell me what to change."
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSendChat()
                }
              }}
            />
            <button className="solid small" onClick={handleSendChat}>
              Send
            </button>
          </div>
        </div>
        <div className="suggestion-card">
          <h3>Suggestions</h3>
          {pendingUpdates || pendingLocalAction || pendingUiAction || pendingUtilityAction ? (
            <>
              <p>{pendingSummary}</p>
              <div className="inline-actions">
                <button className="solid small" onClick={applyPendingChanges}>
                  Apply changes
                </button>
                <button
                  className="ghost small"
                  onClick={() => {
                    setPendingUpdates(null)
                    setPendingLocalAction(null)
                    setPendingSummary('')
                  }}
                >
                  Keep current
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Suggestions land here. Click Apply changes to confirm.</p>
          )}
        </div>
        <div className="insight-card">
          <div className="card-head">
            <h3>Bank + paycheck guidance</h3>
            <span className="tag">Live stats</span>
          </div>
          <div className="insight-list">
            {bankGuidance.map((item, index) => (
              <p key={`bank-guidance-${index}`}>{item}</p>
            ))}
          </div>
          <div className="insight-stats">
            <div className="insight-stat">
              <span>Bank balance</span>
              <strong>{formatCurrency(bankBalance)}</strong>
              <small>Cash on hand</small>
            </div>
            <div className="insight-stat">
              <span>Bills this month</span>
              <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
              <small>{plannedBillsDisplayCount} bills</small>
            </div>
            <div className="insight-stat">
              <span>Bills per paycheck</span>
              <strong>{formatCurrency(billsPerPaycheck)}</strong>
              <small>{payFrequencyLabel} cadence</small>
            </div>
            <div className="insight-stat">
              <span>Next paycheck left</span>
              <strong>{formatCurrency(nextPaycheckAfterBills)}</strong>
              <small>After bills</small>
            </div>
            <div className="insight-stat">
              <span>Flex per day</span>
              <strong>{formatCurrency(dailyFlexTarget)}</strong>
              <small>Flex per week {formatCurrency(weeklyFlexTarget)}</small>
            </div>
            <div className="insight-stat">
              <span>Bills coverage</span>
              <strong>{bankCoverageLabel}</strong>
              <small>Based on balance</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
