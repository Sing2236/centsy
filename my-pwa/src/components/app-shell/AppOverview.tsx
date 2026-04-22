type AppOverviewCard = {
  label: string
  note: string
  tone: string
  value: string
}

export function AppOverview({ cards }: { cards: AppOverviewCard[] }) {
  return (
    <section className="app-overview">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`app-overview-card app-overview-card-${card.tone}`}
        >
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.note}</small>
        </article>
      ))}
    </section>
  )
}
