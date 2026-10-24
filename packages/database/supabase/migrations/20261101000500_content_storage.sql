-- Storage for the catalog, editorial content and submissions.
--
-- catalog (public read): product images; admins write.
-- editorial (public read): post and event covers, journal PDFs; editors write.
-- submissions (private): "<author id>/…"; the author writes and reads their
--   own files, editors read every file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog', 'catalog', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('editorial', 'editorial', true, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('submissions', 'submissions', false, 20971520,
    array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

create policy "Admins manage catalog images"
  on storage.objects for all to authenticated
  using (bucket_id = 'catalog' and private.has_staff_role('{admin}'))
  with check (bucket_id = 'catalog' and private.has_staff_role('{admin}'));

create policy "Editors manage editorial files"
  on storage.objects for all to authenticated
  using (bucket_id = 'editorial' and private.has_staff_role('{editor}'))
  with check (bucket_id = 'editorial' and private.has_staff_role('{editor}'));

create policy "Authors upload their submission files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Authors and editors read submission files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.has_staff_role('{editor}')
    )
  );

create policy "Authors delete their submission files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
