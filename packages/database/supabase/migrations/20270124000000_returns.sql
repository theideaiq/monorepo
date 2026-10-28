-- Selling: returns (owner's master brief, 2026-10-28, section 6).
--
-- * A customer asks to return a delivered line within 14 days, with a
--   reason and photos (`request_return`). Changed mind needs the item
--   unopened. Wrong items and parcels that never arrived are approved
--   at once.
-- * The shop accepts or disputes within 48 hours (`respond_to_return`);
--   silence counts as accepting (`sweep_returns`, run by apps/api's cron).
--   For The IDEA's own stock, support answers for the shop.
-- * Staff decide disputes (`decide_return`) and who is at fault: the shop
--   (wrong, faulty, not as described), the customer (changed mind) or
--   The IDEA.
-- * apps/api books the collection with Boxy (a shipment with `return_id`)
--   and records its fee; when it's back, the shop confirms the item's
--   condition within 48 hours (`confirm_return_condition`, silence counts
--   as fine). A problem goes back to Staff.
-- * The refund is then due the same day: Wayl's refunds API for orders
--   paid online (apps/api), a transfer Staff mark done for cash orders
--   (`mark_return_refunded`). Bulbs spent on the line come back as Bulbs
--   and its cashback goes. A changed-mind return's delivery fee comes out
--   of the refund; a shop at fault pays it from its payout (section 8).
-- * Parcels refused at the door come back by themselves (Boxy
--   `returned`); the shop confirms the parcel is back
--   (`confirm_parcel_back`), which cancels its lines. A Pass with 3
--   refused cash orders pays online from then on
--   (`store_settings.refused_cash_limit`).
-- * `sellers.score`: 100 less the shop's valid returns, cancellations and
--   late lines over 90 days, refreshed nightly (`refresh_seller_scores`).

create type public.return_reason as enum (
  'wrong_item', 'faulty', 'not_as_described', 'changed_mind', 'never_arrived'
);
create type public.return_status as enum (
  -- Waiting for the shop (48 hours).
  'requested',
  -- Waiting for Staff: the shop disputed the request, or the item that
  -- came back.
  'disputed',
  -- Approved, waiting to be collected.
  'approved',
  -- A courier is bringing it back.
  'collecting',
  -- Back at the shop, waiting for its check (48 hours).
  'received',
  'refund_due',
  'refunded',
  'rejected',
  -- Withdrawn by the customer before collection.
  'cancelled'
);
create type public.return_fault as enum ('shop', 'customer', 'the_idea');

alter type public.bulb_kind add value if not exists 'return';

alter table public.store_settings
  add column refused_cash_limit integer not null default 3 check (refused_cash_limit between 1 and 20);

comment on column public.store_settings.refused_cash_limit is
  'After this many cash orders refused or not received at the door, a Pass pays online.';

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  -- Short number for messages and support ("R-1042").
  number bigint generated always as identity (start with 1001) unique,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  seller_id uuid not null references public.sellers (id),
  user_id uuid references auth.users (id) on delete set null,
  quantity integer not null check (quantity > 0),
  reason public.return_reason not null,
  details text check (char_length(details) <= 2000),
  -- Paths in the private return-photos bucket ("<user id>/<file>").
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  -- The customer says it's unopened (needed for changed mind).
  unopened boolean not null default false,
  status public.return_status not null default 'requested',
  fault public.return_fault not null,
  -- The shop's answer, due 48 hours after the request.
  respond_by timestamptz not null default now() + interval '48 hours',
  responded_at timestamptz,
  responded_by uuid references auth.users (id) on delete set null,
  shop_note text check (char_length(shop_note) <= 2000),
  disputed_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  staff_note text check (char_length(staff_note) <= 2000),
  -- Collection: whether a courier fetches it, and Boxy's fee for it.
  needs_collection boolean not null default true,
  collection_fee bigint check (collection_fee >= 0),
  received_at timestamptz,
  -- The shop's check of the item, due 48 hours after it's back.
  check_by timestamptz,
  condition_ok boolean,
  condition_note text check (char_length(condition_note) <= 2000),
  -- The refund, fixed when it falls due: money back the way the customer
  -- paid, and Bulbs spent on the line.
  refund_amount bigint check (refund_amount >= 0),
  refund_bulbs integer check (refund_bulbs >= 0),
  refund_due_at timestamptz,
  refunded_at timestamptz,
  refunded_by uuid references auth.users (id) on delete set null,
  -- Wayl's refund id, or the transfer's reference.
  refund_reference text check (char_length(refund_reference) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reason <> 'changed_mind' or unopened),
  check (reason = 'never_arrived' or cardinality(photos) >= 1),
  check (status <> 'refunded' or (refunded_at is not null and refund_amount is not null))
);

comment on table public.returns is
  'Customers'' returns of delivered lines: the shop''s answer, Staff decisions, collection, the shop''s check and the refund. Written only by functions and apps/api.';

create index returns_order_idx on public.returns (order_id);
create index returns_item_idx on public.returns (order_item_id);
create index returns_seller_idx on public.returns (seller_id, created_at desc);
create index returns_user_idx on public.returns (user_id, created_at desc);
create index returns_responded_by_idx on public.returns (responded_by);
create index returns_decided_by_idx on public.returns (decided_by);
create index returns_refunded_by_idx on public.returns (refunded_by);
-- What the sweep and the Staff inbox read.
create index returns_open_idx on public.returns (status, updated_at)
  where status in ('requested', 'disputed', 'received', 'refund_due');

create trigger set_updated_at before update on public.returns
  for each row execute function private.set_updated_at();

alter table public.returns enable row level security;

-- Whether the caller answers for a seller's returns: its members, or
-- support for The IDEA's own stock.
create function private.handles_returns(seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.works_at_seller(seller)
    or (
      exists (select 1 from public.sellers s where s.id = seller and s.is_house)
      and private.has_staff_role('{support}')
    );
$$;

revoke all on function private.handles_returns(uuid) from public, anon;
grant execute on function private.handles_returns(uuid) to authenticated;

-- The customer, the shop and order staff read a return; nobody writes it
-- directly.
create policy "Customers, shops and staff see returns" on public.returns
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.works_at_seller(seller_id))
    or (select private.has_staff_role('{support,finance}'))
  );

revoke all on public.returns from anon, authenticated;
grant select on public.returns to authenticated;
grant all on public.returns to service_role;

-- ── Return parcels ─────────────────────────────────────────────────────────

alter table public.shipments
  add column return_id uuid references public.returns (id) on delete set null,
  -- The shop confirmed a refused parcel is back.
  add column back_confirmed_at timestamptz;

comment on column public.shipments.return_id is
  'Set on the parcel that brings a return back to the shop.';

create index shipments_return_idx on public.shipments (return_id);
-- One live outgoing parcel per seller; return parcels are extra.
drop index public.shipments_live_order_seller_idx;
create unique index shipments_live_order_seller_idx on public.shipments (order_id, seller_id)
  where active and return_id is null;
create unique index shipments_live_return_idx on public.shipments (return_id)
  where active and return_id is not null;

-- ── Photos ─────────────────────────────────────────────────────────────────

-- Private, "<user id>/…": the customer uploads; the shop and staff read
-- the photos of returns they see.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-photos', 'return-photos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Customers upload return photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'return-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Whether the caller may see a return photo.
create function private.can_see_return_photo(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.returns r
    where path = any (r.photos)
      and (private.works_at_seller(r.seller_id) or private.has_staff_role('{support,finance}'))
  );
$$;

revoke all on function private.can_see_return_photo(text) from public, anon;
grant execute on function private.can_see_return_photo(text) to authenticated;

create policy "Customers, shops and staff read return photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'return-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.can_see_return_photo(name))
    )
  );

-- ── The refund ─────────────────────────────────────────────────────────────

-- What a return gives back: the line's share of what the customer paid
-- for goods (after discounts and Bulbs), less a changed-mind return's
-- delivery fee, and the Bulbs spent on that share.
create function private.return_refund(ret public.returns)
returns table (amount bigint, bulbs integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    greatest(
      round((o.total - o.shipping_fee) * share)::bigint
        - case when ret.fault = 'customer' then coalesce(ret.collection_fee, 0) else 0 end,
      0
    ),
    round(o.bulbs_used * share)::integer
  from public.orders o
  join public.order_items i on i.id = ret.order_item_id
  cross join lateral (
    select case when o.subtotal > 0
      then (i.unit_price * ret.quantity)::numeric / o.subtotal else 0 end as share
  ) s
  where o.id = ret.order_id;
$$;

revoke all on function private.return_refund(public.returns) from public, anon, authenticated;

-- The refund falls due: fix its amounts; Bulbs come back now (and the
-- line's cashback goes), money is paid by apps/api or finance.
create function private.make_refund_due(target uuid)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
  refund record;
  earned integer;
  line_share numeric;
begin
  select * into ret from public.returns r where r.id = target for update;
  select * into refund from private.return_refund(ret);

  update public.returns set
    status = 'refund_due',
    refund_amount = refund.amount,
    refund_bulbs = refund.bulbs,
    refund_due_at = now()
  where id = target
  returning * into ret;

  if ret.user_id is not null then
    if refund.bulbs > 0 then
      insert into public.bulb_entries (user_id, amount, kind, order_id, reason)
      values (ret.user_id, refund.bulbs, 'return', ret.order_id, 'return ' || ret.number);
    end if;
    -- The cashback earned on what came back.
    select coalesce(sum(e.amount), 0)::integer into earned from public.bulb_entries e
    where e.order_id = ret.order_id and e.kind = 'purchase' and e.status <> 'void';
    select (i.unit_price * ret.quantity)::numeric / nullif(o.subtotal, 0) into line_share
    from public.order_items i join public.orders o on o.id = i.order_id
    where i.id = ret.order_item_id;
    earned := round(earned * coalesce(line_share, 0))::integer;
    if earned > 0 then
      insert into public.bulb_entries (user_id, amount, kind, order_id, reason)
      values (ret.user_id, -earned, 'return', ret.order_id, 'cashback on return ' || ret.number);
    end if;
  end if;
  return ret;
end;
$$;

revoke all on function private.make_refund_due(uuid) from public, anon, authenticated;

-- ── Asking for a return ────────────────────────────────────────────────────

-- When a line reached the customer: its own parcel, else its seller's.
create function private.line_delivered_at(line uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.delivered_at from public.shipments s where s.id = i.shipment_id),
    (
      select max(s.delivered_at) from public.shipments s
      where s.order_id = i.order_id and s.return_id is null
        and s.seller_id = coalesce(i.seller_id, '00000000-0000-4000-8000-000000000001')
    )
  )
  from public.order_items i
  where i.id = line;
$$;

revoke all on function private.line_delivered_at(uuid) from public, anon, authenticated;

create function private.request_return(
  line uuid,
  quantity integer,
  reason public.return_reason,
  details text default null,
  photos text[] default '{}',
  unopened boolean default false
)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.order_items;
  ord public.orders;
  delivered timestamptz;
  taken integer;
  ret public.returns;
  photo text;
begin
  select * into item from public.order_items i where i.id = line for update;
  select * into ord from public.orders o where o.id = item.order_id;
  if item.id is null or caller is null or ord.user_id is distinct from caller then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;

  delivered := private.line_delivered_at(line);
  if delivered is null then
    raise exception 'This item hasn''t been delivered yet' using errcode = 'check_violation';
  end if;
  if now() > delivered + interval '14 days' then
    raise exception 'Returns close 14 days after delivery' using errcode = 'check_violation';
  end if;

  select coalesce(sum(r.quantity), 0) into taken from public.returns r
  where r.order_item_id = line and r.status not in ('rejected', 'cancelled');
  if quantity < 1 or quantity > item.quantity - taken then
    raise exception 'Choose how many to return' using errcode = 'check_violation';
  end if;

  foreach photo in array coalesce(photos, '{}') loop
    if split_part(photo, '/', 1) <> caller::text then
      raise exception 'Photos must be your own uploads' using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.returns (
    order_id, order_item_id, seller_id, user_id, quantity, reason, details,
    photos, unopened, fault, needs_collection
  ) values (
    ord.id, line, coalesce(item.seller_id, '00000000-0000-4000-8000-000000000001'),
    caller, quantity, reason, nullif(trim(details), ''), coalesce(photos, '{}'),
    coalesce(unopened, false),
    case reason
      when 'changed_mind' then 'customer'
      when 'never_arrived' then 'the_idea'
      else 'shop'
    end::public.return_fault,
    reason <> 'never_arrived'
  )
  returning * into ret;

  -- A wrong item is approved at once; a parcel that never arrived has
  -- nothing to collect, so its refund is due at once.
  if reason = 'wrong_item' then
    update public.returns set status = 'approved', responded_at = now()
    where id = ret.id returning * into ret;
  elsif reason = 'never_arrived' then
    ret := private.make_refund_due(ret.id);
  end if;
  return ret;
end;
$$;

create function public.request_return(
  line uuid,
  quantity integer,
  reason public.return_reason,
  details text default null,
  photos text[] default '{}',
  unopened boolean default false
)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.request_return(line, quantity, reason, details, photos, unopened) $$;

-- The customer withdraws a return before it's collected.
create function private.cancel_return(target uuid)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  update public.returns set status = 'cancelled'
  where id = target and user_id = (select auth.uid())
    and status in ('requested', 'disputed', 'approved')
  returning * into ret;
  if ret.id is null then
    raise exception 'This return can''t be withdrawn' using errcode = 'check_violation';
  end if;
  return ret;
end;
$$;

create function public.cancel_return(target uuid)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.cancel_return(target) $$;

-- ── The shop's answer ──────────────────────────────────────────────────────

create function private.respond_to_return(target uuid, accept boolean, note text default null)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  select * into ret from public.returns r where r.id = target for update;
  if ret.id is null or not private.handles_returns(ret.seller_id) then
    raise exception 'Return not found' using errcode = 'no_data_found';
  end if;
  if ret.status <> 'requested' then
    raise exception 'This return has been answered' using errcode = 'check_violation';
  end if;
  if not accept and nullif(trim(note), '') is null then
    raise exception 'Say why you dispute it' using errcode = 'check_violation';
  end if;

  update public.returns set
    status = case when accept then 'approved' else 'disputed' end::public.return_status,
    responded_at = now(),
    responded_by = (select auth.uid()),
    shop_note = nullif(trim(note), ''),
    disputed_at = case when accept then null else now() end
  where id = target
  returning * into ret;
  return ret;
end;
$$;

create function public.respond_to_return(target uuid, accept boolean, note text default null)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.respond_to_return(target, accept, note) $$;

-- The shop checks what came back; a problem goes to Staff.
create function private.confirm_return_condition(target uuid, ok boolean, note text default null)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  select * into ret from public.returns r where r.id = target for update;
  if ret.id is null or not private.handles_returns(ret.seller_id) then
    raise exception 'Return not found' using errcode = 'no_data_found';
  end if;
  if ret.status <> 'received' then
    raise exception 'This return isn''t waiting for a check' using errcode = 'check_violation';
  end if;
  if not ok and nullif(trim(note), '') is null then
    raise exception 'Say what''s wrong with it' using errcode = 'check_violation';
  end if;

  update public.returns set
    condition_ok = ok,
    condition_note = nullif(trim(note), ''),
    status = case when ok then status else 'disputed' end,
    disputed_at = case when ok then disputed_at else now() end
  where id = target
  returning * into ret;
  if ok then
    ret := private.make_refund_due(target);
  end if;
  return ret;
end;
$$;

create function public.confirm_return_condition(target uuid, ok boolean, note text default null)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.confirm_return_condition(target, ok, note) $$;

-- ── Staff ──────────────────────────────────────────────────────────────────

-- Support decides a dispute, and may change who is at fault (and so who
-- pays the return delivery).
create function private.decide_return(
  target uuid,
  approve boolean,
  note text,
  fault public.return_fault default null
)
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
  select * into ret from public.returns r where r.id = target for update;
  if ret.id is null or ret.status <> 'disputed' then
    raise exception 'Only a disputed return can be decided' using errcode = 'check_violation';
  end if;
  if nullif(trim(note), '') is null then
    raise exception 'Add a note' using errcode = 'check_violation';
  end if;

  update public.returns set
    status = case
      when not approve then 'rejected'
      when received_at is null then 'approved'
      else status
    end::public.return_status,
    fault = coalesce(decide_return.fault, returns.fault),
    decided_at = now(),
    decided_by = (select auth.uid()),
    staff_note = trim(note)
  where id = target
  returning * into ret;
  if approve and ret.received_at is not null then
    ret := private.make_refund_due(target);
  end if;
  return ret;
end;
$$;

create function public.decide_return(
  target uuid,
  approve boolean,
  note text,
  fault public.return_fault default null
)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.decide_return(target, approve, note, fault) $$;

-- Finance marks a cash order's refund paid (ZainCash, Qi or a bank
-- transfer); apps/api records Wayl refunds itself.
create function private.mark_return_refunded(target uuid, reference text)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if nullif(trim(reference), '') is null then
    raise exception 'Add the transfer''s reference' using errcode = 'check_violation';
  end if;
  update public.returns set
    status = 'refunded',
    refunded_at = now(),
    refunded_by = (select auth.uid()),
    refund_reference = trim(reference)
  where id = target and status = 'refund_due'
  returning * into ret;
  if ret.id is null then
    raise exception 'This refund isn''t due' using errcode = 'check_violation';
  end if;
  return ret;
end;
$$;

create function public.mark_return_refunded(target uuid, reference text)
returns public.returns
language sql
security invoker
set search_path = ''
as $$ select private.mark_return_refunded(target, reference) $$;

-- ── apps/api ───────────────────────────────────────────────────────────────

-- The return parcel reached the shop (Boxy says delivered, or Staff booked
-- it by hand and mark it): the shop's 48-hour check starts.
create function public.mark_return_received(target uuid)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  update public.returns set
    status = 'received',
    received_at = now(),
    check_by = now() + interval '48 hours'
  where id = target and status in ('approved', 'collecting')
  returning * into ret;
  return ret;
end;
$$;

-- Deadlines: an unanswered request is accepted and an unchecked item is
-- fine. Returns what changed, for apps/api to notify.
create function public.sweep_returns()
returns setof public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  return query
  with accepted as (
    update public.returns set status = 'approved', responded_at = now()
    where status = 'requested' and respond_by < now()
    returning *
  )
  select * from accepted;

  for ret in
    select * from public.returns r
    where r.status = 'received' and r.check_by < now() and r.condition_ok is null
    for update skip locked
  loop
    update public.returns set condition_ok = true where id = ret.id;
    return next private.make_refund_due(ret.id);
  end loop;
end;
$$;

-- A refused parcel is back at the shop: its lines are cancelled (so the
-- order's online payment is refunded in full by apps/api) and the copies
-- go back on sale.
create function private.confirm_parcel_back(parcel uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  ship public.shipments;
begin
  select * into ship from public.shipments s where s.id = parcel for update;
  if ship.id is null or not private.handles_returns(ship.seller_id) then
    raise exception 'Parcel not found' using errcode = 'no_data_found';
  end if;
  if ship.returned_at is null or ship.return_id is not null then
    raise exception 'This parcel isn''t coming back' using errcode = 'check_violation';
  end if;
  if ship.back_confirmed_at is not null then
    return ship.back_confirmed_at;
  end if;

  update public.shipments set back_confirmed_at = now() where id = parcel
  returning back_confirmed_at into ship.back_confirmed_at;
  update public.order_items set seller_status = 'cancelled'
  where shipment_id = parcel and seller_status = 'picked_up';
  update public.stock_items set status = 'available', order_item_id = null
  where order_item_id in (select i.id from public.order_items i where i.shipment_id = parcel);
  return ship.back_confirmed_at;
end;
$$;

create function public.confirm_parcel_back(parcel uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.confirm_parcel_back(parcel) $$;

-- ── Refused cash orders ────────────────────────────────────────────────────

-- Cash orders whose parcel came back undelivered.
create function private.refused_cash_orders(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct o.id)::integer
  from public.orders o
  join public.shipments s on s.order_id = o.id and s.return_id is null
  where o.user_id = member and o.payment_method = 'cash_on_delivery'
    and s.returned_at is not null and s.delivered_at is null;
$$;

revoke all on function private.refused_cash_orders(uuid) from public, anon, authenticated;

-- Whether the caller must pay online (checkout hides cash on delivery).
create function private.must_pay_online()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.refused_cash_orders((select auth.uid()))
      >= (select s.refused_cash_limit from public.store_settings s);
$$;

create function public.must_pay_online()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.must_pay_online() $$;

create function private.limit_refused_cash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_method = 'cash_on_delivery' and new.user_id is not null
    and private.refused_cash_orders(new.user_id)
      >= (select s.refused_cash_limit from public.store_settings s)
  then
    raise exception 'Pay online for this order' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger limit_refused_cash before insert on public.orders
  for each row execute function private.limit_refused_cash();

-- ── Shop score ─────────────────────────────────────────────────────────────

alter table public.sellers
  add column score numeric(5, 2) not null default 100 check (score between 0 and 100),
  add column score_updated_at timestamptz;

comment on column public.sellers.score is
  'The shop''s score over 90 days: 100 less its valid returns, out-of-stock cancellations and late lines as a share of its lines. Ranks its offers.';

-- Valid returns (the shop at fault) count twice, out of stock twice and
-- late lines once, as a share of the shop's lines in 90 days.
create function private.seller_score(shop uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with lines as (
    select i.id, i.seller_status, i.ready_by, i.ready_at
    from public.order_items i
    where i.seller_id = shop and i.ready_by > now() - interval '90 days'
  ),
  counts as (
    select
      count(*) as total,
      count(*) filter (where seller_status = 'out_of_stock') as missing,
      count(*) filter (
        where coalesce(ready_at, now()) > ready_by and seller_status <> 'out_of_stock'
      ) as late,
      (
        select count(*) from public.returns r
        where r.seller_id = shop and r.fault = 'shop'
          and r.status not in ('requested', 'disputed', 'rejected', 'cancelled')
          and r.created_at > now() - interval '90 days'
      ) as returned
    from lines
  )
  select case when total = 0 then 100 else
    greatest(0, round(100 - 100 * (2 * returned + 2 * missing + late)::numeric / total, 2))
  end
  from counts;
$$;

revoke all on function private.seller_score(uuid) from public, anon, authenticated;

-- Nightly, from apps/api's cron.
create function public.refresh_seller_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.sellers s set
    score = private.seller_score(s.id),
    score_updated_at = now()
  where not s.is_house;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.request_return(uuid, integer, public.return_reason, text, text[], boolean) from public, anon;
revoke all on function public.request_return(uuid, integer, public.return_reason, text, text[], boolean) from public, anon;
grant execute on function private.request_return(uuid, integer, public.return_reason, text, text[], boolean) to authenticated;
grant execute on function public.request_return(uuid, integer, public.return_reason, text, text[], boolean) to authenticated;

revoke all on function private.cancel_return(uuid) from public, anon;
revoke all on function public.cancel_return(uuid) from public, anon;
grant execute on function private.cancel_return(uuid) to authenticated;
grant execute on function public.cancel_return(uuid) to authenticated;

revoke all on function private.respond_to_return(uuid, boolean, text) from public, anon;
revoke all on function public.respond_to_return(uuid, boolean, text) from public, anon;
grant execute on function private.respond_to_return(uuid, boolean, text) to authenticated;
grant execute on function public.respond_to_return(uuid, boolean, text) to authenticated;

revoke all on function private.confirm_return_condition(uuid, boolean, text) from public, anon;
revoke all on function public.confirm_return_condition(uuid, boolean, text) from public, anon;
grant execute on function private.confirm_return_condition(uuid, boolean, text) to authenticated;
grant execute on function public.confirm_return_condition(uuid, boolean, text) to authenticated;

revoke all on function private.decide_return(uuid, boolean, text, public.return_fault) from public, anon;
revoke all on function public.decide_return(uuid, boolean, text, public.return_fault) from public, anon;
grant execute on function private.decide_return(uuid, boolean, text, public.return_fault) to authenticated;
grant execute on function public.decide_return(uuid, boolean, text, public.return_fault) to authenticated;

revoke all on function private.mark_return_refunded(uuid, text) from public, anon;
revoke all on function public.mark_return_refunded(uuid, text) from public, anon;
grant execute on function private.mark_return_refunded(uuid, text) to authenticated;
grant execute on function public.mark_return_refunded(uuid, text) to authenticated;

revoke all on function private.confirm_parcel_back(uuid) from public, anon;
revoke all on function public.confirm_parcel_back(uuid) from public, anon;
grant execute on function private.confirm_parcel_back(uuid) to authenticated;
grant execute on function public.confirm_parcel_back(uuid) to authenticated;

revoke all on function private.must_pay_online() from public, anon;
revoke all on function public.must_pay_online() from public, anon;
grant execute on function private.must_pay_online() to authenticated;
grant execute on function public.must_pay_online() to authenticated;

-- Service only: apps/api's webhook and cron.
revoke all on function public.mark_return_received(uuid) from public, anon, authenticated;
revoke all on function public.sweep_returns() from public, anon, authenticated;
revoke all on function public.refresh_seller_scores() from public, anon, authenticated;
grant execute on function public.mark_return_received(uuid) to service_role;
grant execute on function public.sweep_returns() to service_role;
grant execute on function public.refresh_seller_scores() to service_role;
