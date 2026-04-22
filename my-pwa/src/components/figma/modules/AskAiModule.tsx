import { useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'

type AiMessage = {
  role: 'assistant' | 'user'
  text: string
}

type AskAiModuleProps = {
  bankBalance: number
  budget: Record<string, unknown>
  budgetCategories: Array<{ actual: number; name: string; planned: number }>
  creditCardBalance: number
  leftToBudget: number
  monthlyIncome: number
  spendVariance: number
  weeklyAverage: number
}

const starterQuestions = [
  'Can I afford a $120 dinner this weekend?',
  'Why did I overspend this month?',
  'How much am I wasting on subscriptions?',
  'What should my grocery budget be?',
  'How can I save $300 this month?',
  'What changed from last month?',
]

function parseAmount(question: string) {
  const match = question.match(/\$?(\d{1,4})/)
  return match ? Number(match[1]) : null
}

function answerQuestion(
  question: string,
  state: Omit<AskAiModuleProps, 'budgetCategories'> & {
    budgetCategories: AskAiModuleProps['budgetCategories']
  },
) {
  const q = question.toLowerCase()
  const amount = parseAmount(question)
  const topOverspend = [...state.budgetCategories]
    .sort((a, b) => b.actual - b.planned - (a.actual - a.planned))
    .find((item) => item.actual > item.planned)
  const grocery = state.budgetCategories.find((item) => item.name.toLowerCase().includes('grocer'))
  const subscriptions = state.budgetCategories.filter((item) =>
    /subscription|stream|phone|utilities/i.test(item.name),
  )
  const subscriptionTotal = subscriptions.reduce((sum, item) => sum + item.planned, 0)

  if (q.includes('afford') && amount) {
    const can = state.leftToBudget >= amount && state.weeklyAverage >= amount / 2
    return {
      answer: can
        ? `Yes. A ${amount} spend fits your current plan.`
        : `Not comfortably. A ${amount} spend would tighten your plan.`,
      bullets: [
        `Left to budget: $${Math.round(state.leftToBudget).toLocaleString('en-US')}`,
        `Average weekly room: $${Math.round(state.weeklyAverage).toLocaleString('en-US')}`,
        can ? 'Suggested action: keep the rest of this week light.' : 'Suggested action: move it to next pay period or trim one flexible category.',
      ],
    }
  }

  if (q.includes('overspend')) {
    return {
      answer: state.spendVariance > 0 ? 'You overspent because actual spending ran ahead of plan.' : 'You are not currently over plan.',
      bullets: [
        `Variance: $${Math.round(state.spendVariance).toLocaleString('en-US')}`,
        topOverspend ? `Largest pressure: ${topOverspend.name}` : 'No category is meaningfully over plan.',
        'Suggested action: cut one flexible category before the next statement closes.',
      ],
    }
  }

  if (q.includes('subscription')) {
    return {
      answer: `You likely have about $${Math.round(subscriptionTotal).toLocaleString('en-US')} tied up in recurring utility/subscription-type categories.`,
      bullets: subscriptions.slice(0, 3).map((item) => `${item.name}: $${item.planned}`),
    }
  }

  if (q.includes('grocery')) {
    const suggested = Math.round(state.monthlyIncome * 0.12)
    return {
      answer: `A reasonable grocery target is about $${suggested.toLocaleString('en-US')} per month.`,
      bullets: [
        grocery ? `Current grocery budget: $${grocery.planned}` : 'No grocery category detected yet.',
        'Suggested action: start near 12% of take-home income, then adjust after two weeks.',
      ],
    }
  }

  if (q.includes('save') && amount) {
    return {
      answer: `To save $${amount}, trim or redirect about $${Math.round(amount / 4)} per week this month.`,
      bullets: [
        `Left to budget today: $${Math.round(state.leftToBudget).toLocaleString('en-US')}`,
        topOverspend ? `Start with ${topOverspend.name}.` : 'Start with flexible spending.',
        'Suggested action: move one non-essential category down and route the difference to savings.',
      ],
    }
  }

  if (q.includes('changed')) {
    return {
      answer: 'The biggest change is your current spending mix versus the plan, not a historic month-over-month import yet.',
      bullets: [
        `Bank balance: $${Math.round(state.bankBalance).toLocaleString('en-US')}`,
        `Card balance: $${Math.round(state.creditCardBalance).toLocaleString('en-US')}`,
        topOverspend ? `Category under pressure: ${topOverspend.name}` : 'No major category spike detected.',
      ],
    }
  }

  return {
    answer: 'I can help with affordability, overspending, subscriptions, grocery targets, savings goals, and what changed.',
    bullets: [
      'Try asking a specific dollar amount or category.',
      `Current left to budget: $${Math.round(state.leftToBudget).toLocaleString('en-US')}`,
    ],
  }
}

export function AskAiModule(props: AskAiModuleProps) {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      text: 'Ask a direct money question. I will answer with your live budget numbers.',
    },
  ])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)

  const state = useMemo(
    () => ({
      ...props,
    }),
    [props],
  )

  const ask = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    const nextMessages = [...messages, { role: 'user' as const, text: trimmed }]
    setMessages(nextMessages)
    setDraft('')

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('budget-coach', {
        body: {
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
          budget: props.budget,
        },
      })

      if (error) throw error

      const reply = typeof data?.reply === 'string' ? data.reply : ''
      const summary = typeof data?.summary === 'string' ? data.summary : ''

      if (reply) {
        const combined = summary && summary !== reply ? `${reply}\n\n${summary}` : reply
        setMessages((prev) => [...prev, { role: 'assistant', text: combined }])
        return
      }
      throw new Error('Empty AI reply.')
    } catch {
      const result = answerQuestion(trimmed, state)
      const response = [result.answer, ...result.bullets].join('\n')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `${response}\n\nFallback used because live AI was unavailable.` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="figma-module-stack">
      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Ask AI</h3>
          <span className="figma-muted">Grounded in your live budget</span>
        </div>
        <div className="figma-chip-list">
          {starterQuestions.map((question) => (
            <button className="figma-chip" key={question} type="button" onClick={() => ask(question)}>
              {question}
            </button>
          ))}
        </div>
        <div className="figma-ai-chat">
          {messages.map((message, index) => (
            <div className={`figma-ai-bubble ${message.role}`} key={`${message.role}-${index}`}>
              {message.text}
            </div>
          ))}
          {loading ? <div className="figma-ai-bubble assistant">Thinking…</div> : null}
        </div>
        <div className="figma-inline-form">
          <input
            type="text"
            value={draft}
            placeholder="Ask about affordability, savings, overspending, or cash flow"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                ask(draft)
              }
            }}
          />
          <button className="figma-primary-button" type="button" onClick={() => ask(draft)}>
            Ask
          </button>
        </div>
      </section>
    </div>
  )
}
