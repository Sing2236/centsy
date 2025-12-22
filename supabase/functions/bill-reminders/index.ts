import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

type BudgetBill = {
  name: string
  date: string
  amount: number
}

type BudgetStateRow = {
  user_id: string
  data: {
    budgetBills?: BudgetBill[]
    notificationBillReminders?: boolean
    notificationReminderDays?: number
  }
}

const monthIndex = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
} as const

const parseDueDate = (label: string, reference: Date) => {
  if (!label) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Date(`${label}T00:00:00Z`)
  }
  const match = label.trim().match(/^([a-zA-Z]{3,9})\s+(\d{1,2})/)
  if (match) {
    const key = match[1].toLowerCase() as keyof typeof monthIndex
    if (key in monthIndex) {
      const day = Number(match[2])
      return new Date(Date.UTC(reference.getUTCFullYear(), monthIndex[key], day))
    }
  }
  return null
}

const startOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))

const diffDays = (future: Date, today: Date) =>
  Math.round((future.getTime() - today.getTime()) / 86_400_000)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDueDate = (value: Date) =>
  value.toLocaleDateString("en-US", { month: "short", day: "numeric" })

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const resendFrom = Deno.env.get("RESEND_FROM")

  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing Supabase service role configuration.", { status: 500 })
  }
  if (!resendApiKey || !resendFrom) {
    return new Response("Missing Resend configuration.", { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const today = startOfUtcDay(new Date())
  const { data: rows, error } = await supabase
    .from("budget_state")
    .select("user_id, data")

  if (error) {
    return new Response(`Failed to load budget state: ${error.message}`, {
      status: 500,
    })
  }

  let sent = 0
  let skipped = 0

  for (const row of (rows ?? []) as BudgetStateRow[]) {
    const remindersEnabled = row.data?.notificationBillReminders ?? true
    if (!remindersEnabled) {
      skipped += 1
      continue
    }
    const leadDays = Number(row.data?.notificationReminderDays ?? 3)
    const bills = row.data?.budgetBills ?? []
    if (!bills.length) {
      skipped += 1
      continue
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(row.user_id)
    if (userError || !userData?.user?.email) {
      skipped += 1
      continue
    }
    const userEmail = userData.user.email

    for (const bill of bills) {
      const dueDate = parseDueDate(bill.date, today)
      if (!dueDate) {
        skipped += 1
        continue
      }
      const daysUntil = diffDays(dueDate, today)
      if (daysUntil !== leadDays) {
        continue
      }

      const { data: existing } = await supabase
        .from("bill_reminder_log")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("bill_name", bill.name)
        .eq("due_date", dueDate.toISOString().slice(0, 10))
        .eq("lead_days", leadDays)
        .limit(1)
        .maybeSingle()

      if (existing) {
        continue
      }

      const subject = `Upcoming bill: ${bill.name} due ${formatDueDate(dueDate)}`
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin: 0 0 8px;">${bill.name} is due soon</h2>
          <p style="margin: 0 0 12px;">
            This bill is due on <strong>${formatDueDate(dueDate)}</strong>.
          </p>
          <p style="margin: 0 0 12px;">
            Planned amount: <strong>${formatCurrency(bill.amount)}</strong>
          </p>
          <p style="margin: 0; color: #475569;">
            You can update schedules and amounts in Centsy anytime.
          </p>
        </div>
      `

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: userEmail,
          subject,
          html,
        }),
      })

      if (!emailResponse.ok) {
        skipped += 1
        continue
      }

      await supabase.from("bill_reminder_log").insert({
        user_id: row.user_id,
        bill_name: bill.name,
        due_date: dueDate.toISOString().slice(0, 10),
        lead_days: leadDays,
      })
      sent += 1
    }
  }

  return new Response(JSON.stringify({ sent, skipped }), {
    headers: { "Content-Type": "application/json" },
  })
})
