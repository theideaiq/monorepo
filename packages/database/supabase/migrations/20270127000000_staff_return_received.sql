-- Support marks a return back at the shop when The IDEA booked its
-- collection by hand (no Boxy return parcel to report it delivered); the
-- shop's 48-hour check starts as it does for a Boxy parcel.
create function private.staff_mark_return_received(target uuid)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  ret := public.mark_return_received(target);
  if ret.id is null then
    raise exception 'Only an approved return can be marked received' using errcode = 'check_violation';
  end if;
  return ret;
end;
$$;

create function public.staff_mark_return_received(target uuid)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.staff_mark_return_received(target) $$;

revoke all on function private.staff_mark_return_received(uuid) from public, anon;
grant execute on function private.staff_mark_return_received(uuid) to authenticated;
revoke all on function public.staff_mark_return_received(uuid) from public, anon;
grant execute on function public.staff_mark_return_received(uuid) to authenticated;
