type AppSidebarItem = {
  caption: string
  id: string
  label: string
}

type ActiveViewMeta = Record<
  string,
  { description: string; group: 'Core' | 'Automation' | 'Account'; title: string }
>

type AppSidebarProps = {
  activeView: string
  activeViewMeta: ActiveViewMeta
  budgetGenerated: boolean
  communityUrl: string
  leftToBudgetLabel: string
  nextPayDateDisplay: string
  onShowSetupGuide: () => void
  setActiveView: (view: string) => void
  showSetupGuide: boolean
  sidebarItems: AppSidebarItem[]
}

export function AppSidebar({
  activeView,
  activeViewMeta,
  budgetGenerated,
  communityUrl,
  leftToBudgetLabel,
  nextPayDateDisplay,
  onShowSetupGuide,
  setActiveView,
  showSetupGuide,
  sidebarItems,
}: AppSidebarProps) {
  return (
    <section className="view-switcher">
      <div className="app-sidebar-head">
        <span className="tag">Centsy</span>
        <h3>Budgeting for real life</h3>
        <p>Use the dashboard shell from the Figma system as the base for planning, tracking, and community.</p>
      </div>
      <div className="app-sidebar-quick">
        <div>
          <strong>{leftToBudgetLabel}</strong>
          <span>{leftToBudgetLabel.startsWith('-$') ? 'to trim' : 'ready to assign'}</span>
        </div>
        <div>
          <strong>{nextPayDateDisplay}</strong>
          <span>next paycheck</span>
        </div>
      </div>
      <div className="app-sidebar-group">
        <span className="app-sidebar-label">Start here</span>
        <div className="tab-row">
          {sidebarItems
            .filter((item) => activeViewMeta[item.id].group === 'Core')
            .map((item) => (
              <button
                key={item.id}
                className={activeView === item.id ? 'tab active' : 'tab'}
                onClick={() => setActiveView(item.id)}
              >
                <span className="tab-text">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              </button>
            ))}
        </div>
      </div>
      <div className="app-sidebar-group">
        <span className="app-sidebar-label">Support</span>
        <div className="tab-row">
          {sidebarItems
            .filter((item) => activeViewMeta[item.id].group === 'Automation')
            .map((item) => (
              <button
                key={item.id}
                className={activeView === item.id ? 'tab active' : 'tab'}
                onClick={() => setActiveView(item.id)}
              >
                <span className="tab-text">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              </button>
            ))}
          <button className="tab" onClick={() => window.location.assign(communityUrl)}>
            <span className="tab-text">
              <strong>Community</strong>
              <small>Public forum</small>
            </span>
          </button>
        </div>
      </div>
      <div className="app-sidebar-group">
        <span className="app-sidebar-label">Settings</span>
        <div className="tab-row">
          {sidebarItems
            .filter((item) => activeViewMeta[item.id].group === 'Account')
            .map((item) => (
              <button
                key={item.id}
                className={activeView === item.id ? 'tab active' : 'tab'}
                onClick={() => setActiveView(item.id)}
              >
                <span className="tab-text">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              </button>
            ))}
        </div>
      </div>
      {showSetupGuide && activeView === 'workspace' ? (
        <p className="muted">Guided setup is still available above the dashboard.</p>
      ) : !budgetGenerated ? (
        <div className="setup-inline">
          <span className="tag">Setup</span>
          <span>Need the quick-start guide?</span>
          <button className="ghost small" type="button" onClick={onShowSetupGuide}>
            Show guide
          </button>
        </div>
      ) : (
        <p className="muted">Open any module from the left rail.</p>
      )}
    </section>
  )
}
