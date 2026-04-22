import type { ModuleId } from './SidebarNav'

type ShellHeaderProps = {
  activeModule: ModuleId
  onOpenAuth: () => void
  onOpenSettings: () => void
  onLogout: () => void
  searchValue: string
  setSearchValue: (value: string) => void
  userEmail: string | null
}

const titles: Record<ModuleId, { title: string; subtitle: string }> = {
  home: {
    title: 'Home',
    subtitle: 'What changed, where you stand, and what to do next.',
  },
  plan: {
    title: 'Plan',
    subtitle: 'Build a realistic monthly plan with AI help and light editing.',
  },
  activity: {
    title: 'Activity',
    subtitle: 'Transactions, categorization, and quick cleanup.',
  },
  insights: {
    title: 'Insights',
    subtitle: 'Useful patterns, warnings, and plain-English takeaways.',
  },
  'ask-ai': {
    title: 'Ask AI',
    subtitle: 'Ask direct money questions and get grounded next steps.',
  },
}

export function ShellHeader({
  activeModule,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  searchValue,
  setSearchValue,
  userEmail,
}: ShellHeaderProps) {
  const copy = titles[activeModule]
  const identity = userEmail ? userEmail.split('@')[0] : 'Guest'

  return (
    <header className="figma-header">
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      <div className="figma-header-actions">
        <label className="figma-search">
          <span>Search</span>
          <input
            type="text"
            placeholder="Search bills, activity, questions"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </label>

        <button className="figma-icon-button" type="button" aria-label="Notifications">
          <span className="figma-dot" />
        </button>

        <button className="figma-secondary-button small" type="button" onClick={onOpenSettings}>
          Settings
        </button>

        <div className="figma-user">
          <div className="figma-user-copy">
            <strong>{identity}</strong>
            <small>{userEmail ? 'Signed in' : 'Not signed in'}</small>
          </div>
          <div className="figma-user-avatar">{identity.slice(0, 1).toUpperCase()}</div>
        </div>

        {userEmail ? (
          <button className="figma-secondary-button" type="button" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <button className="figma-primary-button" type="button" onClick={onOpenAuth}>
            Log in
          </button>
        )}
      </div>
    </header>
  )
}
