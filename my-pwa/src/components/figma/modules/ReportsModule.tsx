type ReportsModuleProps = {
  bankBalance: number
  bankCoverageLabel: string
  creditCardBalance: number
  guidance: string[]
  nextPaycheckAfterBills: string
  onExportCsv: () => void
  reportRows: Array<{ label: string; value: string }>
  riskLabel: string
  riskScore: number
  setBankBalance: (value: number) => void
  setCreditCardBalance: (value: number) => void
}

export function ReportsModule({
  bankBalance,
  bankCoverageLabel,
  creditCardBalance,
  guidance,
  nextPaycheckAfterBills,
  onExportCsv,
  reportRows,
  riskLabel,
  riskScore,
  setBankBalance,
  setCreditCardBalance,
}: ReportsModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-4">
        <article className="figma-kpi-card">
          <span>Risk score</span>
          <strong>{riskScore}/100</strong>
          <small>{riskLabel}</small>
        </article>
        <article className="figma-kpi-card">
          <span>Bank balance</span>
          <strong>${Math.round(bankBalance).toLocaleString('en-US')}</strong>
          <small>{bankCoverageLabel}</small>
        </article>
        <article className="figma-kpi-card">
          <span>Card balance</span>
          <strong>${Math.round(creditCardBalance).toLocaleString('en-US')}</strong>
          <small>Repaid over time</small>
        </article>
        <article className="figma-kpi-card">
          <span>Next paycheck left</span>
          <strong>{nextPaycheckAfterBills}</strong>
          <small>After planned bills</small>
        </article>
      </section>

      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Inputs</h3>
          </div>
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Bank balance</span>
              <input
                type="number"
                value={bankBalance}
                onChange={(event) => setBankBalance(Number(event.target.value || 0))}
              />
            </label>
            <label className="figma-field">
              <span>Credit card balance</span>
              <input
                type="number"
                value={creditCardBalance}
                onChange={(event) => setCreditCardBalance(Number(event.target.value || 0))}
              />
            </label>
          </div>
        </article>

        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Guidance</h3>
          </div>
          <div className="figma-list">
            {guidance.map((item) => (
              <div className="figma-guidance-row" key={item}>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Budget snapshot</h3>
          <button className="figma-primary-button" type="button" onClick={onExportCsv}>
            Export CSV
          </button>
        </div>
        <div className="figma-data-grid figma-data-grid-reports">
          {reportRows.map((row) => (
            <div className="figma-report-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
