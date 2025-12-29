import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Message = { role: 'user' | 'assistant'; content: string }

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
    let payloadBody: { messages?: Message[]; budget?: Record<string, unknown> } = {}
    try {
      payloadBody = (await req.json()) ?? {}
    } catch {
      payloadBody = {}
    }
    const { messages, budget } = payloadBody

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
          reply: 'Ready. What do you want to change?',
          summary: 'Review and apply these updates?',
          updates: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `
You are Budget Copilot for a budgeting app. Keep replies very short (1-2 sentences).
Do not use numbered lists or multiple suggestions unless the user explicitly asks for ideas.
If the user message is a greeting, test, or unclear, respond with a single short question asking what they want to change.
Do not mention typing "apply"; if you need confirmation, say "Click Apply changes to confirm."
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
- If you need clarification, ask a question in "reply" and set "updates" to null.
- Only include "updates" for fields you want to change.
- Prefer incremental changes, not sweeping replacements, unless asked.
- When adding bills, update both "budgetCategories" and "budgetBills".
- If a bill date is not provided, use "Unscheduled" and set "recurringDay" to null.
- For new budget categories from bills, set "planned" to the bill amount and "actual" to 0.
- For spend entries, use negative "amount" for refunds and ISO dates (YYYY-MM-DD) when possible.
- If you add spend entries for a new category, add that category to "budgetCategories".
`

    const payload = {
      model: 'llama-3.1-8b-instant',
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

    return new Response(
      JSON.stringify({
        reply: parsed.reply ?? 'Here are some ideas.',
        summary: parsed.summary ?? 'Review and apply these updates?',
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
