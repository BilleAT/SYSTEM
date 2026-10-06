-- SYSTEM article schema for new Supabase environments.
-- The original schema was already applied manually in the primary Supabase project.
-- Before running CLI migrations against that existing project, baseline this migration
-- as applied rather than executing CREATE TABLE a second time.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  week_start date not null
    check (extract(isodow from week_start) = 1),
  title text not null,
  summary text not null,
  body text not null,
  topic text not null
    check (topic in (
      'AI & robotter',
      'Klima & energi',
      'Videnskab',
      'Digitalt liv'
    )),
  author text not null default 'SYSTEM-redaktionen',
  read_time_minutes smallint not null default 5
    check (read_time_minutes > 0),
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index articles_one_published_per_week
  on public.articles (week_start)
  where status = 'published';

alter table public.articles enable row level security;
revoke all on table public.articles from anon, authenticated;
grant select on table public.articles to anon;

create policy "Public can read published articles"
  on public.articles
  for select
  to anon
  using (status = 'published');
