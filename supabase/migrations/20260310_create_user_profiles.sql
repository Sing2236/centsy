create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists user_profiles_username_lower_idx
  on public.user_profiles (lower(username));

alter table public.user_profiles enable row level security;

drop policy if exists "User profiles are viewable by everyone" on public.user_profiles;
drop policy if exists "Users can create their profile" on public.user_profiles;
drop policy if exists "Users can update their profile" on public.user_profiles;

create policy "User profiles are viewable by everyone"
  on public.user_profiles
  for select
  using (true);

create policy "Users can create their profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their profile"
  on public.user_profiles
  for update
  using (
    auth.uid() = user_id
    and (username_updated_at is null or username_updated_at <= now() - interval '30 days')
  )
  with check (auth.uid() = user_id);
