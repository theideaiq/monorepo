-- Staff review a shop's documents (Program Revision v2, item 10): the
-- files a shop lists in `seller_details.documents` live in its private
-- organization folder, which only its members could read. Staff admins now
-- read those files, and only those.

create policy "Staff read sellers' documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-files'
    and (select private.has_staff_role('{admin}'))
    and exists (
      select 1 from public.seller_details d
      where objects.name = any (d.documents)
    )
  );
