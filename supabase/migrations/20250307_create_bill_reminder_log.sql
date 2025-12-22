create table if not exists public.bill_reminder_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_name text not null,
  due_date date not null,
  lead_days integer not null,
  sent_at timestamptz not null default now(),
  unique (user_id, bill_name, due_date, lead_days)
);

create index if not exists bill_reminder_log_user_id_idx
  on public.bill_reminder_log (user_id);
