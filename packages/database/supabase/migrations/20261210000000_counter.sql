-- The back office's counter: support checks a member's The IDEA Pass in
-- person and sees their Bulbs, Plus and rentals (already readable), and now
-- also their RSVPs for nearby events, checking them in (10 Bulbs).

drop policy "Members see their RSVPs; editors see all" on public.event_rsvps;
create policy "Members see their RSVPs; editors and support see all"
  on public.event_rsvps for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_staff_role('{editor,support}')
  );

create or replace function private.check_in_rsvp(event uuid, member uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  at timestamptz;
begin
  if not private.has_staff_role('{editor,support}') then
    raise exception 'Editors and support only' using errcode = 'insufficient_privilege';
  end if;
  update public.event_rsvps r
  set checked_in_at = coalesce(r.checked_in_at, now()),
    checked_in_by = coalesce(r.checked_in_by, (select auth.uid()))
  where r.event_id = event and r.user_id = member
  returning r.checked_in_at into at;
  if at is null then
    raise exception 'No RSVP for this member' using errcode = 'no_data_found';
  end if;
  insert into public.bulb_entries (user_id, amount, kind, event_id, reason)
  values (member, 10, 'bonus', event, 'event_check_in')
  on conflict do nothing;
  return at;
end;
$$;

comment on function public.check_in_rsvp(uuid, uuid) is
  'Checks a member in at an event they RSVP''d for (editors and support, at the counter) and pays the 10-Bulb check-in bonus once.';
