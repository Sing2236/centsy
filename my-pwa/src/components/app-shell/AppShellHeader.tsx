type AppShellStatus = {
  detail: string
  label: string
  title: string
}

type AppShellHeaderProps = {
  activeViewGroup: string
  activeViewTitle: string
  activeViewDescription: string
  appShellStatus: AppShellStatus
  openBudgetSpace: () => void
  saveState: 'idle' | 'saving' | 'saved'
  userDisplayName: string
}

export function AppShellHeader({
  activeViewDescription,
  activeViewGroup,
  activeViewTitle,
  appShellStatus,
  openBudgetSpace,
  saveState,
  userDisplayName,
}: AppShellHeaderProps) {
  return (
    <section className="app-shell-header">
      <div className="app-shell-copy">
        <span className="tag">{activeViewGroup}</span>
        <h2>{activeViewTitle}</h2>
        <p>{activeViewDescription}</p>
      </div>
      <div className="app-shell-actions">
        <div className="app-shell-tools">
          <label className="app-shell-search">
            <span>Search</span>
            <input type="text" placeholder="Search bills, actions, categories" />
          </label>
          <div className="app-shell-notify" aria-hidden="true">
            <span />
          </div>
        </div>
        <div className="app-shell-status">
          <span>{appShellStatus.label}</span>
          <strong>{appShellStatus.title}</strong>
          <small>{appShellStatus.detail}</small>
        </div>
        <div className="app-shell-user">
          <div className="app-shell-avatar" aria-hidden="true">
            {userDisplayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{userDisplayName}</strong>
            <span>{saveState === 'saving' ? 'Saving changes...' : 'All changes saved'}</span>
          </div>
          <button className="solid small" onClick={openBudgetSpace}>
            Open Budget Space
          </button>
        </div>
      </div>
    </section>
  )
}
