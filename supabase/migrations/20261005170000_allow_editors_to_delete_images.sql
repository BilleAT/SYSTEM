-- Permit allowlisted editors to remove a draft's image from the public article-images bucket.
-- Public reads continue to work because the bucket itself is public.

drop policy if exists "SYSTEM editors can read article image metadata" on storage.objects;
create policy "SYSTEM editors can read article image metadata"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'article-images'
    and (select private.is_editor())
  );

drop policy if exists "SYSTEM editors can delete article images" on storage.objects;
create policy "SYSTEM editors can delete article images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'article-images'
    and (select private.is_editor())
  );
