type WorkspacePriorityCard = {
  detail: string
  id: string
  label: string
}

export function WorkspacePriority({
  cards,
  onSelect,
}: {
  cards: WorkspacePriorityCard[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="workspace-priority">
      {cards.map((card) => (
        <button
          key={card.id}
          className="priority-card"
          type="button"
          onClick={() => onSelect(card.id)}
        >
          <span>{card.label}</span>
          <strong>{card.detail}</strong>
        </button>
      ))}
    </div>
  )
}
