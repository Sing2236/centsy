type FocusCard = {
  actionLabel: string
  detail: string
  label: string
  title: string
  view: string
}

type AppFocusStripProps = {
  cards: FocusCard[]
  onSelectView: (view: string) => void
}

export function AppFocusStrip({ cards, onSelectView }: AppFocusStripProps) {
  return (
    <section className="app-focus-strip">
      {cards.map((card) => (
        <article className="focus-card" key={card.title}>
          <span>{card.label}</span>
          <strong>{card.title}</strong>
          <p>{card.detail}</p>
          <button
            className="ghost small"
            type="button"
            onClick={() => onSelectView(card.view)}
          >
            {card.actionLabel}
          </button>
        </article>
      ))}
    </section>
  )
}
