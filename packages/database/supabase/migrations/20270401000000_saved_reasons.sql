-- PR 7, C26: saved reasons in Staff's Inbox.
--
-- The reasons staff give again and again when they turn something down
-- (a blurry card photo, a shop's missing document, a return outside its
-- window) are saved once per kind of decision and offered when the next
-- one is written, so the wording stays the same and quick. A reason is
-- only a suggestion: the text sent to the person is still what the staff
-- member submits with the decision.
--
-- Any staff member (with an authenticator-app session) reads and adds
-- them; the author or an admin removes one. Changes are in the audit log.

create table public.staff_saved_reasons (
  id uuid primary key default gen_random_uuid(),
  -- The Inbox kind whose decisions it is for.
  kind text not null check (
    kind in ('applications', 'checks', 'returns', 'shops', 'submissions', 'verifications')
  ),
  body text not null check (char_length(btrim(body)) between 3 and 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, body)
);

comment on table public.staff_saved_reasons is
  'Reasons staff reuse when they decline something in the Inbox, per kind of decision. Staff only.';

create index staff_saved_reasons_created_by_idx on public.staff_saved_reasons (created_by);

create trigger audit_staff_saved_reasons after insert or update or delete on public.staff_saved_reasons
  for each row execute function private.audit_change();

alter table public.staff_saved_reasons enable row level security;

create policy "Staff read saved reasons"
  on public.staff_saved_reasons for select to authenticated
  using ((select private.is_staff()));
-- Saved as oneself.
create policy "Staff save reasons"
  on public.staff_saved_reasons for insert to authenticated
  with check ((select private.is_staff()) and created_by = (select auth.uid()));
create policy "Authors and admins remove saved reasons"
  on public.staff_saved_reasons for delete to authenticated
  using (
    (select private.is_staff())
    and (created_by = (select auth.uid()) or (select private.has_staff_role('{admin}')))
  );

grant select, insert, delete on public.staff_saved_reasons to authenticated;
