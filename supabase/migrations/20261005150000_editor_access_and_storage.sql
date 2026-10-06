-- Add an explicit allowlist for article editors.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.editor_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.editor_users enable row level security;
revoke all on table public.editor_users from anon, authenticated;
grant select on table public.editor_users to authenticated;

drop policy if exists "Editors can read their own editor record" on public.editor_users;
create policy "Editors can read their own editor record"
  on public.editor_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.editor_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_editor() from public;
grant execute on function private.is_editor() to authenticated;

grant select, insert, update, delete on table public.articles to authenticated;

drop policy if exists "Editors can read all articles" on public.articles;
create policy "Editors can read all articles"
  on public.articles
  for select
  to authenticated
  using ((select private.is_editor()));

drop policy if exists "Editors can insert articles" on public.articles;
create policy "Editors can insert articles"
  on public.articles
  for insert
  to authenticated
  with check ((select private.is_editor()));

drop policy if exists "Editors can update articles" on public.articles;
create policy "Editors can update articles"
  on public.articles
  for update
  to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

drop policy if exists "Editors can delete articles" on public.articles;
create policy "Editors can delete articles"
  on public.articles
  for delete
  to authenticated
  using ((select private.is_editor()));

-- Public reads are allowed by making this bucket public. Uploads remain editor-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "SYSTEM editors can upload article images" on storage.objects;
create policy "SYSTEM editors can upload article images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'article-images'
    and (select private.is_editor())
  );

-- After creating your login under Supabase > Authentication > Users, add its UID:
-- insert into public.editor_users (user_id)
-- select id from auth.users where email = 'YOUR-EDITOR-EMAIL';
