type DashboardStat = {
  label: string
  tone: 'blue' | 'green' | 'yellow' | 'purple'
  value: string
}

type DashboardModuleProps = {
  aiSummary: string
  biggestCategories: Array<{ label: string; value: string }>
  nextActions: Array<{ cta: string; module: 'plan' | 'activity' | 'insights' | 'ask-ai'; title: string }>
  onJump: (module: 'plan' | 'activity' | 'insights' | 'ask-ai') => void
  recentAlerts: string[]
  stats: DashboardStat[]
  upcomingBills: Array<{ label: string; value: string }>
}

export function DashboardModule({
  aiSummary,
  biggestCategories,
  nextActions,
  onJump,
  recentAlerts,
  stats,
  upcomingBills,
}: DashboardModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-4">
        {stats.map((stat) => (
          <article className="figma-stat-card" key={stat.label}>
            <div className={`figma-stat-icon ${stat.tone}`}>{stat.label.slice(0, 2).toUpperCase()}</div>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>AI summary</h3>
          </div>
          <p className="figma-home-summary">{aiSummary}</p>
          <div className="figma-list">
            {recentAlerts.map((item) => (
              <div className="figma-guidance-row" key={item}>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Upcoming bills</h3>
          </div>
          <div className="figma-list">
            {upcomingBills.map((bill) => (
              <div className="figma-list-row" key={bill.label}>
                <strong>{bill.label}</strong>
                <div className="figma-list-meta">
                  <strong>{bill.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Biggest categories</h3>
          </div>
          <div className="figma-list">
            {biggestCategories.map((item) => (
              <div className="figma-list-row" key={item.label}>
                <strong>{item.label}</strong>
                <div className="figma-list-meta">
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Next actions</h3>
          </div>
          <div className="figma-list">
            {nextActions.map((item) => (
              <button className="figma-action-card compact" key={item.title} type="button" onClick={() => onJump(item.module)}>
                <strong>{item.title}</strong>
                <span>{item.cta}</span>
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
