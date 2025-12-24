// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type BudgetStateRow = {
  data: Record<string, unknown> | null
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const systemPrompt = [
  "You are Centsy, a proactive budget coach.",
  "You have access to the user's Budget Space data when provided in system context.",
  "You can help with any budgeting or personal finance request: planning budgets,",
  "payoff strategies, savings goals, bill planning, expense reviews,",
  "cash-flow projections, and plain-language explanations.",
  "Use both user-provided context and general financial knowledge; do not limit",
  "yourself to local app data. If details are missing, ask clarifying questions",
  "and still provide a best-effort answer with reasonable assumptions.",
  "Be concise, actionable, and show calculations when useful.",
  "Do not fabricate specific account details or transactions.",
  "Always return a JSON object only (no markdown, no extra text).",
  "JSON format: {\"reply\":\"...\",\"summary\":\"...\",\"updates\":{...}}.",
  "Include updates only when you need to change the budget; otherwise omit updates.",
  "Budget schema: budgetBills[{name,date,amount,recurringDay}],",
  "budgetCategories[{name,planned,actual}], budgetGoals[{name,amount,target}],",
  "labels[string], scheduleBias[number], debtStrategy[string], incomePerPaycheck[number],",
  "partnerIncome[number], payFrequency[string], primaryGoal[string], autoSuggest[boolean],",
  "includePartner[boolean], monthlyBuffer[number], notificationWeeklySummary[boolean],",
  "notificationOverBudget[boolean], notificationBillReminders[boolean],",
  "notificationReminderDays[number], autoSaveEnabled[boolean],",
  "stocks[{symbol,shares,price,monthly}], robinhoodConnected[boolean],",
  "monthlyInvestment[number], expectedReturn[number],",
  "spendEntries[{id,merchant,category,amount,date,note}].",
].join(" ")

const parseMessages = (payload: Record<string, unknown>) => {
  const parsed: ChatMessage[] = []
  const rawMessages = payload.messages
  if (Array.isArray(rawMessages)) {
    for (const message of rawMessages) {
      if (!message || typeof message !== "object") continue
      const role = (message as { role?: string }).role
      const content = (message as { content?: string }).content
      if (
        (role === "system" || role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim().length > 0
      ) {
        parsed.push({ role, content: content.trim() })
      }
    }
  }

  if (parsed.length === 0) {
    const fallback =
      (payload.input as string) ??
      (payload.prompt as string) ??
      (payload.question as string) ??
      (payload.message as string)
    if (typeof fallback === "string" && fallback.trim().length > 0) {
      parsed.push({ role: "user", content: fallback.trim() })
    }
  }

  return parsed
}

const serializeContext = (label: string, value: unknown) => {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    return {
      role: "system" as const,
      content: `${label}: ${trimmed}`,
    }
  }
  try {
    const serialized = JSON.stringify(value, null, 2)
    return {
      role: "system" as const,
      content: `${label}: ${serialized}`,
    }
  } catch {
    return null
  }
}

const buildContextMessages = (
  payload: Record<string, unknown>,
  budgetSpace: unknown,
) => {
  const messages: ChatMessage[] = []
  const contexts = [
    { label: "Budget Space (saved)", value: budgetSpace },
    {
      label: "Client budget state (may be newer)",
      value: payload.budget,
    },
    {
      label: "Additional user context",
      value: payload.context ?? payload.budgetContext ?? payload.userContext,
    },
  ]

  for (const context of contexts) {
    const message = serializeContext(context.label, context.value)
    if (message) {
      messages.push(message)
    }
  }

  return messages
}

const loadBudgetSpace = async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Missing Supabase configuration.", status: 500 }
  }

  const authHeader =
    req.headers.get("Authorization") ?? req.headers.get("authorization")
  if (!authHeader) {
    return { error: "Missing Authorization header.", status: 401 }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return { error: "Invalid user session.", status: 401 }
  }

  const { data: row, error: rowError } = await supabase
    .from("budget_state")
    .select("data")
    .eq("user_id", userData.user.id)
    .maybeSingle<BudgetStateRow>()

  if (rowError) {
    return {
      error: `Failed to load budget space: ${rowError.message}`,
      status: 500,
    }
  }

  return { budgetSpace: row?.data ?? null }
}

const resolveApiUrl = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`
  }
  return `${trimmed}/v1/chat/completions`
}

const extractJsonObject = (text: string) => {
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  const jsonText = candidate.slice(start, end + 1)
  try {
    return JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("AI_API_KEY")
  const baseUrl =
    Deno.env.get("OPENAI_BASE_URL") ??
    Deno.env.get("AI_BASE_URL") ??
    "https://api.openai.com"
  const model =
    Deno.env.get("OPENAI_MODEL") ??
    Deno.env.get("AI_MODEL") ??
    "gpt-4o-mini"

  if (!apiKey) {
    return new Response("Missing AI API key.", {
      status: 500,
      headers: corsHeaders,
    })
  }

  const payload = (await req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  const budgetSpaceResult = await loadBudgetSpace(req)
  if ("error" in budgetSpaceResult) {
    return new Response(budgetSpaceResult.error, {
      status: budgetSpaceResult.status,
      headers: corsHeaders,
    })
  }

  const messages = parseMessages(payload)
  if (messages.length === 0) {
    return new Response("Missing chat messages.", {
      status: 400,
      headers: corsHeaders,
    })
  }

  const contextMessages = buildContextMessages(
    payload,
    budgetSpaceResult.budgetSpace,
  )
  const requestBody = {
    model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...contextMessages,
      ...messages,
    ],
    temperature: typeof payload.temperature === "number"
      ? payload.temperature
      : 0.4,
    max_tokens: typeof payload.max_tokens === "number"
      ? payload.max_tokens
      : typeof payload.maxTokens === "number"
      ? payload.maxTokens
      : undefined,
  }

  const aiResponse = await fetch(resolveApiUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text()
    return new Response(`AI request failed: ${errorText}`, {
      status: 502,
      headers: corsHeaders,
    })
  }

  const responseJson = await aiResponse.json()
  const rawReply = responseJson?.choices?.[0]?.message?.content
  const parsed = typeof rawReply === "string"
    ? extractJsonObject(rawReply)
    : null
  const reply = parsed && typeof parsed.reply === "string"
    ? parsed.reply
    : rawReply

  if (typeof reply !== "string" || reply.trim().length === 0) {
    return new Response("AI response was empty.", {
      status: 502,
      headers: corsHeaders,
    })
  }

  const summary = parsed && typeof parsed.summary === "string"
    ? parsed.summary
    : undefined
  const updates = parsed && parsed.updates && typeof parsed.updates === "object"
    ? parsed.updates
    : undefined

  const debug = new URL(req.url).searchParams.get("debug") === "1"

  return new Response(
    JSON.stringify({
      reply: reply.trim(),
      summary,
      updates,
      model: responseJson?.model ?? model,
      usage: responseJson?.usage ?? null,
      raw: debug ? responseJson : undefined,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/budget-coach' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"messages":[{"role":"user","content":"Build me a starter budget for $4,200/month take-home."}]}'

*/
