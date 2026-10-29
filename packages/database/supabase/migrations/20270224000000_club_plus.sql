-- Plus features, part 3 (owner's master brief, step 12, section 17): the
-- Club.
--
-- * Plus members RSVP 48 hours before everyone else: events.rsvp_opens_at
--   is when RSVPs open to everyone (set to 48 hours after publishing, at
--   the latest the start, when staff leave it empty); Plus members can
--   RSVP from 48 hours before.
-- * Blaze seats: events.blaze_seats holds that many seats for Blaze
--   members. Others can take only the seats left after the unclaimed Blaze
--   ones; 24 hours before the start, unclaimed Blaze seats open to all.
-- * event_rsvp_window(event) tells the caller when they can RSVP and how
--   many seats they can still take.

alter table public.events
  add column rsvp_opens_at timestamptz,
  add column blaze_seats integer not null default 0 check (blaze_seats >= 0),
  add constraint events_blaze_seats_capacity check (capacity is null or blaze_seats <= capacity);

comment on column public.events.rsvp_opens_at is
  'When RSVPs open to everyone; Plus members can RSVP 48 hours before.';
comment on column public.events.blaze_seats is
  'Seats held for Plus Blaze members until 24 hours before the start.';

alter table public.event_rsvps add column blaze boolean not null default false;

comment on column public.event_rsvps.blaze is
  'Taken by a Plus Blaze member (who may take a held Blaze seat).';

-- Existing published events stay open to everyone.
update public.events set rsvp_opens_at = created_at where published and rsvp_opens_at is null;

-- Publishing without an opening time opens RSVPs to everyone 48 hours later
-- (no later than the start), so Plus members always come first.
create function private.set_rsvp_opening()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published and new.rsvp_opens_at is null then
    new.rsvp_opens_at := least(now() + interval '48 hours', new.starts_at);
  end if;
  return new;
end;
$$;

create trigger set_rsvp_opening before insert or update of published, rsvp_opens_at on public.events
  for each row execute function private.set_rsvp_opening();

-- When a member may RSVP and how many seats they can take now (null:
-- unlimited).
create function private.rsvp_window(target public.events, member uuid)
returns table (opens_at timestamptz, plus_opens_at timestamptz, seats_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  with taken as (
    select count(*)::integer as total, (count(*) filter (where r.blaze))::integer as blaze
    from public.event_rsvps r where r.event_id = target.id
  ),
  held as (
    select case
      when private.plus_tier(member) >= 3 or now() >= target.starts_at - interval '24 hours' then 0
      else greatest(target.blaze_seats - t.blaze, 0)
    end as seats
    from taken t
  )
  select
    case when private.plus_tier(member) > 0
      then target.rsvp_opens_at - interval '48 hours'
      else target.rsvp_opens_at
    end,
    target.rsvp_opens_at - interval '48 hours',
    case when target.capacity is not null
      then greatest(target.capacity - t.total - h.seats, 0)
    end
  from taken t, held h;
$$;

create function private.event_rsvp_window(event uuid)
returns table (opens_at timestamptz, plus_opens_at timestamptz, seats_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  select w.* from public.events e
  cross join lateral private.rsvp_window(e, (select auth.uid())) w
  where e.id = event and e.published;
$$;

create function public.event_rsvp_window(event uuid)
returns table (opens_at timestamptz, plus_opens_at timestamptz, seats_left integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.event_rsvp_window(event) $$;

-- Refuses RSVPs before the member's opening, once the seats they can take
-- are gone, or once the event has started.
create or replace function private.check_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.events;
  window_row record;
begin
  select * into target from public.events where id = new.event_id for update;

  if not found or not target.published or target.starts_at < now() then
    raise exception 'This event is not open for RSVPs' using errcode = 'check_violation';
  end if;

  select * into window_row from private.rsvp_window(target, new.user_id);
  if window_row.opens_at is not null and now() < window_row.opens_at then
    raise exception 'RSVPs aren''t open yet' using errcode = 'check_violation';
  end if;
  if window_row.seats_left is not null and window_row.seats_left <= 0 then
    raise exception 'This event is full' using errcode = 'check_violation';
  end if;

  new.blaze := private.plus_tier(new.user_id) >= 3;
  return new;
end;
$$;

revoke all on function private.set_rsvp_opening() from public, anon, authenticated;
revoke all on function private.rsvp_window(public.events, uuid) from public, anon, authenticated;
revoke all on function private.event_rsvp_window(uuid) from public;
revoke all on function public.event_rsvp_window(uuid) from public;
grant execute on function private.event_rsvp_window(uuid) to anon, authenticated;
grant execute on function public.event_rsvp_window(uuid) to anon, authenticated;
