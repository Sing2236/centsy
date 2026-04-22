import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Message = { role: 'user' | 'assistant'; content: string }
type AiMode = 'assistant' | 'home_summary' | 'plan_suggestions' | 'insight_summary'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ reply: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let payloadBody: {
      messages?: Message[]
      budget?: Record<string, unknown>
      mode?: AiMode
    } = {}
    try {
      payloadBody = (await req.json()) ?? {}
    } catch {
      payloadBody = {}
    }
    const { messages, budget, mode } = payloadBody

    if (!messages?.length) {
      return new Response(JSON.stringify({ reply: 'Send a message to start.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ reply: 'Missing GROQ_API_KEY.', error: 'missing_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lastUserMessage =
      messages?.slice().reverse().find((message) => message.role === 'user')
        ?.content ?? ''
    const lastMessageTrimmed = lastUserMessage.trim().toLowerCase()
    const lowSignalTerms = new Set(['hi', 'hello', 'hey', 'test', 'ping', 'yo', 'sup'])
    const isLowSignal =
      lowSignalTerms.has(lastMessageTrimmed) ||
      (/^[a-z]+$/i.test(lastMessageTrimmed) &&
        lastMessageTrimmed.length <= 5 &&
        !/[0-9$]/.test(lastMessageTrimmed))

    if (isLowSignal) {
      return new Response(
        JSON.stringify({
          reply:
            'Ready. Tell me what you want to change (bill, category, goal, spend). Include amounts and dates if you have them.',
          summary: 'Review and apply these updates?',
          updates: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const activeMode = mode ?? 'assistant'

    const basePrompt = `
You are Centsy AI, a modern budgeting assistant.
Your tone is calm, practical, supportive, and confident.

Core behavior:
- Answer the user's budgeting question directly using the budget context you were given.
- Do not ask for clarification unless the answer is impossible without missing data.
- Use the available numbers aggressively before asking follow-up questions.
- Give concrete, decision-ready answers, not vague coaching.
- Explain your reasoning in plain consumer language, not finance jargon.
- If the user asks "Can I afford this?", answer yes / no / not comfortably in the first sentence.
- If the user asks "Why did this happen?", identify the most likely driver from the budget state.
- If the user asks about subscriptions, savings, or overspending, estimate from available categories instead of refusing.
- If the user asks what changed, compare the strongest signals in the current state and explain what stands out most.

Response quality rules:
- Write for non-technical consumers. Never speak in code, schema, JSON, or internal field names.
- Never return raw JSON, key names, code blocks, or schema descriptions inside the reply text.
- The reply should read like polished in-product assistant copy.
- The reply should usually contain:
  1. a direct answer,
  2. one or two supporting numbers,
  3. one or two next actions.
- Prefer 3-6 sentences total, or 2-4 short bullets after a direct opening sentence.
- If recommending an action, make it specific and immediately usable.
- Avoid filler like "based on the information provided" or "as an AI".
- Avoid sounding judgmental or alarmist.
- If there is enough data to answer, do not stop after one sentence. Give a useful explanation.
- When relevant, mention the most likely category driver by name.
- Treat recurring bills such as streaming, phone, utility, membership, insurance, and subscriptions as subscription-like spending when the user asks about subscriptions or waste.
`

    const modePrompt =
      activeMode === 'home_summary'
        ? `
You are generating a home-screen summary.
Return a short reply that answers:
1. Am I okay?
2. What changed?
3. What should I do next?
Summary should be one sentence.
`
        : activeMode === 'plan_suggestions'
          ? `
You are generating AI planning suggestions.
Use the budget state to recommend realistic category budgets, savings targets, and one adjustment to make the plan healthier.
Prefer direct recommendations over questions.
Summary should be one sentence.
`
          : activeMode === 'insight_summary'
            ? `
You are generating insight explanations.
Highlight overspending, cash-flow risk, unusual spending, category pressure, and subscription-like recurring costs.
Make each point plain-English and actionable.
Summary should be one sentence.
`
            : `
You are handling an interactive Ask AI question.
Answer directly from the budget state first.
For affordability questions:
- include whether it fits this month,
- mention left-to-budget or weekly room,
- give one suggestion if it is tight.
For overspending questions:
- mention the variance,
- point to the likely category pressure,
- recommend one corrective move.
For subscription questions:
- total the likely recurring subscription-like categories,
- name the biggest ones,
- suggest one cleanup step.
Summary should be one short line that restates the key takeaway in natural language.
`

    const examples = `
Example affordability answer:
reply: "Yes, you can afford it this weekend. You currently have room left in your monthly plan, and your average weekly cushion is still healthy enough to absorb a $120 dinner. The bigger risk is not this one purchase on its own, but stacking it on top of other flexible spending. If you go ahead, keep the rest of this week's discretionary spending light."
summary: "A $120 dinner fits, but keep the rest of the week light."

Example overspending answer:
reply: "You are over plan by a small amount, not by a huge margin. The most likely driver is the category that is currently running above plan, and in your case that looks like transportation or another flexible category rather than a fixed bill. This is the kind of miss you can correct inside the same month if you trim one or two non-essential purchases. The best next move is to pause extra flexible spending until you are back under target."
summary: "You are slightly over plan and can recover by trimming flexible spending."

Example subscription answer:
reply: "Your recurring subscription-like costs look modest rather than excessive right now. The likely items in that bucket are bills like streaming, phone, or other recurring services, and together they do not appear to be the main source of budget pressure. The larger issue is usually bigger flexible categories, not the smallest recurring ones. Still, if you want to free up a little more room, streaming and phone are the first places to review."
summary: "Subscriptions are not the main problem, but streaming and phone are worth reviewing first."
`

    const systemPrompt = `
${basePrompt}
${modePrompt}
${examples}

You must respond ONLY with valid JSON matching this schema:
{
  "reply": string,
  "summary": string,
  "updates": null | {
    "incomePerPaycheck"?: number,
    "partnerIncome"?: number,
    "payFrequency"?: "weekly"|"biweekly"|"monthly",
    "primaryGoal"?: "stability"|"debt"|"savings"|"flex",
    "autoSuggest"?: boolean,
    "includePartner"?: boolean,
    "monthlyBuffer"?: number,
    "notificationWeeklySummary"?: boolean,
    "notificationOverBudget"?: boolean,
    "notificationBillReminders"?: boolean,
    "notificationReminderDays"?: number,
    "autoSaveEnabled"?: boolean,
    "budgetGenerated"?: boolean,
    "budgetCategories"?: Array<{ "name": string, "planned": number, "actual": number }>,
    "budgetGoals"?: Array<{ "name": string, "amount": number, "target": number }>,
    "budgetBills"?: Array<{ "name": string, "date": string, "amount": number, "recurringDay"?: number | null }>,
    "labels"?: string[],
    "scheduleBias"?: number,
    "debtStrategy"?: "avalanche"|"snowball",
    "stocks"?: Array<{ "symbol": string, "shares": number, "price": number, "monthly": number }>,
    "robinhoodConnected"?: boolean,
    "monthlyInvestment"?: number,
    "expectedReturn"?: number,
    "spendEntries"?: Array<{ "id"?: string, "merchant": string, "category": string, "amount": number, "date": string, "note"?: string }>
  }
}
Rules:
- If you truly need clarification, ask one specific question in "reply" and set "updates" to null.
- Only include "updates" for fields you want to change.
- Prefer incremental changes, not sweeping replacements, unless asked.
- When adding bills, update both "budgetCategories" and "budgetBills".
- If a bill date is not provided, use "Unscheduled" and set "recurringDay" to null.
- For new budget categories from bills, set "planned" to the bill amount and "actual" to 0.
- For spend entries, use negative "amount" for refunds and ISO dates (YYYY-MM-DD) when possible.
- If you add spend entries for a new category, add that category to "budgetCategories".
- In assistant/home/plan/insight modes, do not invent account data that is absent.
- In assistant/home/plan/insight modes, use the provided budget state aggressively before asking questions.
- The "reply" field must always be plain user-facing language, never JSON-looking text.
- The "summary" field must always be a short natural-language takeaway, never a schema or action prompt template.
`

    const payload = {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `Current budget state: ${JSON.stringify(budget)}`,
        },
        ...messages,
      ],
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq error:', response.status, errorText)
      return new Response(
        JSON.stringify({
          reply: 'Groq request failed.',
          error: `status_${response.status}:${errorText}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    let parsed: { reply?: string; summary?: string; updates?: Record<string, unknown> }
    const extractJson = (text: string) => {
      const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fencedMatch) {
        return fencedMatch[1].trim()
      }
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        return text.slice(start, end + 1)
      }
      return null
    }
    try {
      parsed = JSON.parse(content)
    } catch {
      const extracted = extractJson(content)
      if (extracted) {
        try {
          parsed = JSON.parse(extracted)
        } catch {
          parsed = { reply: content, updates: null }
        }
      } else {
        parsed = { reply: content, updates: null }
      }
    }

    const cleanReply = (value?: string) => {
      if (!value) return 'Here are some ideas.'
      const lowered = value.toLowerCase()
      const summaryIndex = lowered.indexOf('summary:')
      const updatesIndex = lowered.indexOf('updates:')
      const cutIndexCandidates = [summaryIndex, updatesIndex].filter((index) => index >= 0)
      const cutIndex = cutIndexCandidates.length ? Math.min(...cutIndexCandidates) : -1
      const cleaned = cutIndex >= 0 ? value.slice(0, cutIndex) : value
      return cleaned.replace(/\n{3,}/g, '\n\n').trim()
    }

    const cleanSummary = (reply: string, summary?: string) => {
      if (summary && !/review and apply these updates/i.test(summary)) {
        return summary.trim()
      }
      const firstSentence = reply.match(/[^.!?]+[.!?]?/)
      return firstSentence ? firstSentence[0].trim() : 'Budget update ready.'
    }

    const reply = cleanReply(parsed.reply)
    const summary = cleanSummary(reply, parsed.summary)

    return new Response(
      JSON.stringify({
        reply,
        summary,
        updates: parsed.updates ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Copilot error:', message)
    return new Response(
      JSON.stringify({ reply: 'Copilot error.', error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
