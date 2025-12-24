import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

type BudgetBill = {
  name: string
  date: string
  amount: number
  recurringDay?: number | null
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
  const numericMatch = label.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (numericMatch) {
    const month = Number(numericMatch[1]) - 1
    const day = Number(numericMatch[2])
    const year = Number(numericMatch[3])
    return new Date(Date.UTC(year, month, day))
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

const nextRecurringDate = (recurringDay: number, reference: Date) => {
  const safeDay = Math.min(31, Math.max(1, recurringDay))
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(safeDay, daysInMonth)
  let candidate = new Date(Date.UTC(year, month, day))
  const startToday = startOfUtcDay(reference)
  if (candidate < startToday) {
    const nextMonth = month + 1
    const nextYear = year + Math.floor(nextMonth / 12)
    const resolvedMonth = nextMonth % 12
    const nextMonthDays = new Date(
      Date.UTC(nextYear, resolvedMonth + 1, 0),
    ).getUTCDate()
    const nextDay = Math.min(safeDay, nextMonthDays)
    candidate = new Date(Date.UTC(nextYear, resolvedMonth, nextDay))
  }
  return candidate
}

const resolveDueDate = (bill: BudgetBill, reference: Date) => {
  if (bill.recurringDay !== undefined && bill.recurringDay !== null) {
    const recurring = Number(bill.recurringDay)
    if (!Number.isNaN(recurring)) {
      return nextRecurringDate(recurring, reference)
    }
  }
  if (/^monthly$/i.test(bill.date.trim())) {
    return nextRecurringDate(1, reference)
  }
  return parseDueDate(bill.date, reference)
}

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

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const resendFrom = Deno.env.get("RESEND_FROM")
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://www.centsy.co"
  const logoUrl = `${siteUrl}/centsy-logo.svg`
  const debug = new URL(req.url).searchParams.get("debug") === "1"

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
  const debugRows: Array<Record<string, unknown>> = []

  for (const row of (rows ?? []) as BudgetStateRow[]) {
    const remindersEnabled = row.data?.notificationBillReminders ?? true
    if (!remindersEnabled) {
      skipped += 1
      if (debug) {
        debugRows.push({
          user_id: row.user_id,
          reason: "reminders_off",
          remindersEnabled,
        })
      }
      continue
    }
    const leadDays = Number(row.data?.notificationReminderDays ?? 3)
    const bills = row.data?.budgetBills ?? []
    if (!bills.length) {
      skipped += 1
      if (debug) {
        debugRows.push({
          user_id: row.user_id,
          reason: "no_bills",
          leadDays,
        })
      }
      continue
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(row.user_id)
    if (userError || !userData?.user?.email) {
      skipped += 1
      if (debug) {
        debugRows.push({
          user_id: row.user_id,
          reason: "missing_email",
          leadDays,
        })
      }
      continue
    }
    const userEmail = userData.user.email

    const dueBills: Array<{ bill: BudgetBill; dueDate: Date }> = []

    for (const bill of bills) {
      const dueDate = resolveDueDate(bill, today)
      if (!dueDate) {
        skipped += 1
        if (debug) {
          debugRows.push({
            user_id: row.user_id,
            bill: bill.name,
            date: bill.date,
            recurringDay: bill.recurringDay ?? null,
            reason: "unparsed_date",
            leadDays,
          })
        }
        continue
      }
      const daysUntil = diffDays(dueDate, today)
      if (daysUntil !== leadDays) {
        if (debug) {
          debugRows.push({
            user_id: row.user_id,
            bill: bill.name,
            date: bill.date,
            daysUntil,
            leadDays,
            reason: "lead_days_mismatch",
          })
        }
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
        if (debug) {
          debugRows.push({
            user_id: row.user_id,
            bill: bill.name,
            date: bill.date,
            leadDays,
            reason: "already_sent",
          })
        }
        continue
      }

      dueBills.push({ bill, dueDate })
    }

    if (!dueBills.length) {
      continue
    }

    const dueList = dueBills
      .map(
        ({ bill, dueDate }) =>
          `<tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <strong style="color:#0f172a;">${bill.name}</strong><br/>
              <span style="color:#64748b; font-size: 13px;">Due ${formatDueDate(dueDate)}</span>
            </td>
            <td align="right" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color:#0f172a; font-weight:600;">
              ${formatCurrency(bill.amount)}
            </td>
          </tr>`
      )
      .join("")

    const subject = `Upcoming bills due in ${leadDays} day${leadDays === 1 ? "" : "s"}`
    const text = dueBills
      .map(
        ({ bill, dueDate }) =>
          `${bill.name} - due ${formatDueDate(dueDate)} - ${formatCurrency(bill.amount)}`
      )
      .join("\n")
    const html = `
      <!doctype html>
      <html>
        <body style="margin:0; background:#f1f5f9; padding: 24px;">
          <span style="display:none; max-height:0; overflow:hidden; opacity:0;">
            Upcoming bills due in ${leadDays} day${leadDays === 1 ? "" : "s"}.
          </span>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:24px 28px;background:#0f172a;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <img src="${logoUrl}" alt="Centsy" width="40" height="40" style="display:block;border-radius:12px;background:#ffffff;padding:6px;">
                    </td>
                    <td style="text-align:right;color:#e2e8f0;font-size:12px;font-family:Arial,sans-serif;">
                      Budgeting made simple
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-family:Arial,sans-serif;color:#0f172a;">
                <h2 style="margin:0 0 8px;font-size:22px;">Upcoming bills</h2>
                <p style="margin:0 0 18px;color:#475569;font-size:14px;">
                  These bills are due in ${leadDays} day${leadDays === 1 ? "" : "s"}.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${dueList}
                </table>
                <div style="margin-top:20px;">
                  <a href="${siteUrl}" style="display:inline-block;background:#f97316;color:#0f172a;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px;">
                    Open Centsy
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;font-family:Arial,sans-serif;">
                Update due dates and reminder settings anytime in your Preferences.
              </td>
            </tr>
          </table>
        </body>
      </html>
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
        text,
      }),
    })

    if (!emailResponse.ok) {
      skipped += 1
      const errorText = await emailResponse.text()
      if (debug) {
        debugRows.push({
          user_id: row.user_id,
          bills: dueBills.map(({ bill }) => bill.name),
          leadDays,
          reason: "send_failed",
          status: emailResponse.status,
          error: errorText,
        })
      }
      continue
    }

    await supabase.from("bill_reminder_log").insert(
      dueBills.map(({ bill, dueDate }) => ({
        user_id: row.user_id,
        bill_name: bill.name,
        due_date: dueDate.toISOString().slice(0, 10),
        lead_days: leadDays,
      }))
    )
    sent += 1
  }

  return new Response(
    JSON.stringify({
      sent,
      skipped,
      today: today.toISOString().slice(0, 10),
      debug: debug ? debugRows : undefined,
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
