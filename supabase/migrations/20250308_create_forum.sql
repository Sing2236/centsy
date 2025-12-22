create extension if not exists "pgcrypto";

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_posts_created_at_idx
  on public.forum_posts (created_at desc);

create index if not exists forum_comments_post_id_idx
  on public.forum_comments (post_id, created_at);

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;

drop policy if exists "Forum posts are viewable by everyone" on public.forum_posts;
drop policy if exists "Forum comments are viewable by everyone" on public.forum_comments;
drop policy if exists "Users can create forum posts" on public.forum_posts;
drop policy if exists "Users can edit their forum posts" on public.forum_posts;
drop policy if exists "Users can delete their forum posts" on public.forum_posts;
drop policy if exists "Users can create forum comments" on public.forum_comments;
drop policy if exists "Users can edit their forum comments" on public.forum_comments;
drop policy if exists "Users can delete their forum comments" on public.forum_comments;

create policy "Forum posts are viewable by everyone"
  on public.forum_posts
  for select
  using (true);

create policy "Forum comments are viewable by everyone"
  on public.forum_comments
  for select
  using (true);

create policy "Users can create forum posts"
  on public.forum_posts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can edit their forum posts"
  on public.forum_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their forum posts"
  on public.forum_posts
  for delete
  using (auth.uid() = user_id);

create policy "Users can create forum comments"
  on public.forum_comments
  for insert
  with check (auth.uid() = user_id);

create policy "Users can edit their forum comments"
  on public.forum_comments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their forum comments"
  on public.forum_comments
  for delete
  using (auth.uid() = user_id);
