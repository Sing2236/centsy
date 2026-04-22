export type ModuleId =
  | 'home'
  | 'plan'
  | 'activity'
  | 'insights'
  | 'ask-ai'

type SidebarNavProps = {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

const navItems: Array<{ id: ModuleId; label: string; short: string }> = [
  { id: 'home', label: 'Home', short: 'HM' },
  { id: 'plan', label: 'Plan', short: 'PL' },
  { id: 'activity', label: 'Activity', short: 'AC' },
  { id: 'insights', label: 'Insights', short: 'IN' },
  { id: 'ask-ai', label: 'Ask AI', short: 'AI' },
]

export function SidebarNav({ activeModule, setActiveModule }: SidebarNavProps) {
  return (
    <aside className="figma-sidebar">
      <div className="figma-sidebar-brand">
        <div className="figma-sidebar-logo">¢</div>
        <div>
          <h1>Centsy</h1>
          <p>Budgeting for real life</p>
        </div>
      </div>

      <nav className="figma-sidebar-nav">
        {navItems.map((item) => {
          const active = item.id === activeModule
          return (
            <button
              key={item.id}
              className={active ? 'figma-nav-item active' : 'figma-nav-item'}
              onClick={() => setActiveModule(item.id)}
              type="button"
            >
              <span className="figma-nav-icon">{item.short}</span>
              <span className="figma-nav-label">{item.label}</span>
              <span className="figma-nav-chevron">{active ? '›' : ''}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
