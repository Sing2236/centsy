alter table public.forum_posts
  add column if not exists category text not null default 'General';

update public.forum_posts
  set category = 'General'
  where category is null or category = '';

create index if not exists forum_posts_category_idx
  on public.forum_posts (category);
