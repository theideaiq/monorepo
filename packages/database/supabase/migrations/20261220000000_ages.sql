-- Program revision v1, step 4: ages.
--
-- The IDEA Pass is open from 13. A date of birth (profiles.birthday) is
-- asked at first sign-in and needed to buy. For 13–17-year-olds:
-- * a guardian (18 or over) links with The IDEA Pass of their own: the teen
--   shares an invite code (`invite_guardian`), the guardian accepts it
--   (`accept_guardian`);
-- * every order waits for the guardian (`orders.guardian_status`): the
--   guardian approves or declines it from their Pass
--   (`decide_guardian_order`); nothing is paid, confirmed or shipped
--   before;
-- * The IDEA Plus needs the guardian's yes once (`set_guardian_plus`);
-- * PEGI 18 products are hidden and can't be ordered.
-- Sell to us (trade-ins) and affiliates are 18+.

-- ── Ages ───────────────────────────────────────────────────────────────────

-- The member's age in whole years today (Baghdad); null without a birthday.
create function private.age_of(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from age((now() at time zone 'Asia/Baghdad')::date, p.birthday))::integer
  from public.profiles p
  where p.id = member and p.birthday is not null;
$$;

-- Under 18 with a known birthday.
create function private.is_minor(member uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(private.age_of(member) < 18, false) $$;

-- 18 or over (a known birthday).
create function private.is_adult(member uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(private.age_of(member) >= 18, false) $$;

-- The first word of the member's name, for messages to the other side.
create function private.first_name(member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '')
  from public.profiles p where p.id = member;
$$;

-- The Pass is for people aged 13 and over.
create function private.check_birthday_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthday is not null
    and new.birthday > ((now() at time zone 'Asia/Baghdad')::date - interval '13 years')
  then
    raise exception 'The IDEA Pass is for people aged 13 and over' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_birthday_age before insert or update of birthday on public.profiles
  for each row execute function private.check_birthday_age();

-- 18+ actions: Sell to us and affiliates.
create function private.require_adult(member uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.age_of(member) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  if not private.is_adult(member) then
    raise exception 'You need to be 18 or over' using errcode = 'check_violation';
  end if;
end;
$$;

create function private.adults_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_adult(new.user_id);
  return new;
end;
$$;

create trigger adults_only before insert on public.trade_ins
  for each row execute function private.adults_only();

create trigger adults_only before insert or update of status on public.affiliates
  for each row when (new.status = 'applied')
  execute function private.adults_only();

-- ── Guardians ──────────────────────────────────────────────────────────────

alter table public.orders
  add column guardian_status text check (guardian_status in ('pending', 'approved', 'declined'));

comment on column public.orders.guardian_status is
  'For a 13–17-year-old''s order: pending until the guardian approves or declines; null otherwise.';


create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid references public.profiles (id) on delete cascade,
  code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  allows_plus boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (guardian_id is null or guardian_id <> teen_id)
);

comment on table public.guardian_links is
  'A 13–17-year-old''s guardian: invited with a code, active once an adult (signed in with The IDEA Pass) accepts it. Written only through the guardian functions.';

create unique index guardian_links_live_key on public.guardian_links (teen_id)
  where status in ('invited', 'active');
create index guardian_links_guardian_idx on public.guardian_links (guardian_id);

alter table public.guardian_links enable row level security;

create policy "Teens and guardians read their links" on public.guardian_links
  for select to authenticated
  using (teen_id = (select auth.uid()) or guardian_id = (select auth.uid()));

grant select on public.guardian_links to authenticated;

-- The teen's active guardian, if any.
create function private.active_guardian(teen uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.guardian_id from public.guardian_links g
  where g.teen_id = teen and g.status = 'active';
$$;

-- A new invite code for the caller's guardian (13–17 only); replaces an
-- unused one.
create function private.invite_guardian()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  created text;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_minor(caller) then
    raise exception 'Only members under 18 link a guardian' using errcode = 'check_violation';
  end if;
  if private.active_guardian(caller) is not null then
    raise exception 'You already have a guardian' using errcode = 'check_violation';
  end if;
  update public.guardian_links set status = 'revoked'
  where teen_id = caller and status = 'invited';
  insert into public.guardian_links (teen_id) values (caller)
  returning code into created;
  return created;
end;
$$;

create function public.invite_guardian()
returns text
language sql
security invoker
set search_path = ''
as $$ select private.invite_guardian() $$;

-- What a guardian sees before accepting: whose invite it is.
create function private.guardian_invite(invite_code text)
returns table (teen_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select private.first_name(g.teen_id), g.status
  from public.guardian_links g
  where g.code = upper(trim(invite_code))
    and (select auth.uid()) is not null;
$$;

create function public.guardian_invite(invite_code text)
returns table (teen_name text, status text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.guardian_invite(invite_code) $$;

-- The caller (18 or over) becomes the guardian.
create function private.accept_guardian(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  link public.guardian_links;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into link from public.guardian_links g
  where g.code = upper(trim(invite_code)) and g.status = 'invited'
  for update;
  if link.id is null then
    raise exception 'This invite has expired' using errcode = 'check_violation';
  end if;
  if link.teen_id = caller then
    raise exception 'You can''t be your own guardian' using errcode = 'check_violation';
  end if;
  if private.age_of(caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  if not private.is_adult(caller) then
    raise exception 'A guardian must be 18 or over' using errcode = 'check_violation';
  end if;
  update public.guardian_links
  set guardian_id = caller, status = 'active', accepted_at = now()
  where id = link.id;
  perform private.notify(
    link.teen_id, 'system', 'guardian_linked',
    jsonb_build_object('name', private.first_name(caller)), '/pass/settings#guardian'
  );
  return link.id;
end;
$$;

create function public.accept_guardian(invite_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.accept_guardian(invite_code) $$;

-- The teen or the guardian ends the link.
create function private.revoke_guardian(link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guardian_links g set status = 'revoked'
  where g.id = link and g.status in ('invited', 'active')
    and (select auth.uid()) in (g.teen_id, g.guardian_id);
  if not found then
    raise exception 'Link not found' using errcode = 'no_data_found';
  end if;
end;
$$;

create function public.revoke_guardian(link uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.revoke_guardian(link) $$;

-- The guardian allows (or stops) The IDEA Plus for the teen.
create function private.set_guardian_plus(link uuid, allow boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guardian_links g set allows_plus = allow
  where g.id = link and g.status = 'active' and g.guardian_id = (select auth.uid());
  if not found then
    raise exception 'Link not found' using errcode = 'no_data_found';
  end if;
end;
$$;

create function public.set_guardian_plus(link uuid, allow boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_guardian_plus(link, allow) $$;

-- The caller's age group and guardian (for checkout, Plus and Settings).
create function private.my_guardian()
returns table (
  minor boolean,
  has_birthday boolean,
  link_id uuid,
  status text,
  code text,
  guardian_name text,
  allows_plus boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_minor(me.id),
    private.age_of(me.id) is not null,
    g.id, g.status,
    case when g.status = 'invited' then g.code end,
    private.first_name(g.guardian_id),
    coalesce(g.allows_plus, false)
  from (select (select auth.uid()) as id) me
  left join public.guardian_links g
    on g.teen_id = me.id and g.status in ('invited', 'active')
  where me.id is not null;
$$;

create function public.my_guardian()
returns table (
  minor boolean,
  has_birthday boolean,
  link_id uuid,
  status text,
  code text,
  guardian_name text,
  allows_plus boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_guardian() $$;

-- The teens the caller is guardian of, with orders waiting for them.
create function private.my_teens()
returns table (link_id uuid, teen_name text, allows_plus boolean, pending_orders jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, private.first_name(g.teen_id), g.allows_plus,
    coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', o.id, 'number', o.number, 'total', o.total, 'created_at', o.created_at,
          'items', (select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id)
        ) order by o.created_at)
      from public.orders o
      where o.user_id = g.teen_id and o.guardian_status = 'pending' and o.status = 'pending'
    ), '[]'::jsonb)
  from public.guardian_links g
  where g.guardian_id = (select auth.uid()) and g.status = 'active'
  order by g.accepted_at;
$$;

create function public.my_teens()
returns table (link_id uuid, teen_name text, allows_plus boolean, pending_orders jsonb)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_teens() $$;

-- ── Orders that wait for the guardian ─────────────────────────────────────

-- Nothing moves forward (payment, confirmation, shipping) before the
-- guardian approves.
create function private.guard_guardian_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.guardian_status in ('pending', 'declined')
    and new.status not in ('pending', 'cancelled')
  then
    raise exception 'Waiting for the guardian''s approval' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_guardian_order before insert or update of status, guardian_status on public.orders
  for each row execute function private.guard_guardian_order();

-- The guardian approves or declines a pending order.
create function private.decide_guardian_order(target uuid, approve boolean)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current public.orders;
begin
  select * into current from public.orders o
  where o.id = target and o.guardian_status = 'pending' and o.status = 'pending'
  for update;
  if current.id is null or private.active_guardian(current.user_id) is distinct from caller then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;

  if not approve then
    update public.orders set guardian_status = 'declined', status = 'cancelled'
    where id = target returning * into current;
    perform private.notify(
      current.user_id, 'order', 'guardian_declined',
      jsonb_build_object('number', current.number), '/pass/orders/' || current.id
    );
    return current;
  end if;

  update public.orders set guardian_status = 'approved'
  where id = target returning * into current;

  if current.payment_method = 'cash_on_delivery' then
    update public.orders set status = 'confirmed' where id = target returning * into current;
    perform private.take_order_stock(current.id);
    perform private.notify(
      current.user_id, 'order', 'order_confirmed',
      jsonb_build_object('number', current.number, 'fulfilment', current.fulfilment),
      '/orders/view?id=' || current.id
    );
  elsif current.total = 0 then
    perform public.complete_order_payment(current.id);
    select * into current from public.orders o where o.id = target;
  else
    perform private.notify(
      current.user_id, 'order', 'guardian_approved',
      jsonb_build_object('number', current.number), '/pass/orders/' || current.id
    );
  end if;
  return current;
end;
$$;

create function public.decide_guardian_order(target uuid, approve boolean)
returns public.orders
language sql
security invoker
set search_path = ''
as $$ select private.decide_guardian_order(target, approve) $$;

-- ── PEGI 18 is hidden from under-18 Passes ────────────────────────────────

alter policy "Active products are public; staff see all" on public.products
  using (
    (
      status = 'active'
      and not (age_rating is not distinct from 18 and (select private.is_minor((select auth.uid()))))
    )
    or (select private.is_staff())
  );

-- ── Checkout ───────────────────────────────────────────────────────────────

create or replace function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_order.fulfilment = 'pickup';
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  -- Ages: a date of birth is needed to buy; 13–17-year-olds buy with
  -- their guardian's approval, and never PEGI 18 items.
  if (select p.birthday from public.profiles p where p.id = caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.cart_items c
      join public.products p on p.id = c.product_id
      where c.user_id = caller and p.age_rating = 18
    ) then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
  end if;

  if create_order.fulfilment is null or create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or (
      not pickup
      and (
        coalesce(trim(shipping ->> 'address'), '') = ''
        -- Without a chosen zone, the governorate finds it.
        or (wanted = '' and delivery_zone is null)
      )
    )
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock, and
  -- the member's Bulbs so concurrent checkouts wait for each other.
  perform 1 from public.products p
  where p.id in (select c.product_id from public.cart_items c where c.user_id = caller)
  order by p.id
  for update;
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
  end if;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source, affiliate_id,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'affiliate_id')::uuid,
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case
        when pickup then ''
        -- A zone that isn't a whole governorate is named instead.
        else coalesce(
          quote ->> 'zone_governorate',
          nullif(left(trim(shipping ->> 'governorate'), 60), ''),
          quote ->> 'zone_name_en'
        )
      end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.condition, l.name_ar, l.name_en,
    l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    condition public.product_condition,
    quantity integer,
    unit_price bigint,
    name_ar text,
    name_en text,
    attributes jsonb
  );

  delete from public.cart_items where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- A minor's order waits for the guardian (decide_guardian_order).
  if minor then
    perform private.notify(
      guardian,
      'order',
      'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
    return created;
  end if;

  -- Paid in full with Bulbs: nothing to pay online, so it's paid now.
  if not cash and created.total = 0 then
    perform public.complete_order_payment(created.id);
    select * into created from public.orders o where o.id = created.id;
  end if;

  -- A cash order is confirmed now: its copies are set aside and the
  -- customer is told (online orders wait for the payment webhook).
  if cash then
    perform private.take_order_stock(created.id);
    perform private.notify(
      caller,
      'order',
      'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;

  return created;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.age_of(uuid) from public;
revoke all on function private.first_name(uuid) from public, anon;
revoke all on function private.active_guardian(uuid) from public, anon;
revoke all on function private.invite_guardian() from public, anon;
revoke all on function private.guardian_invite(text) from public, anon;
revoke all on function private.accept_guardian(text) from public, anon;
revoke all on function private.revoke_guardian(uuid) from public, anon;
revoke all on function private.set_guardian_plus(uuid, boolean) from public, anon;
revoke all on function private.my_guardian() from public, anon;
revoke all on function private.my_teens() from public, anon;
revoke all on function private.decide_guardian_order(uuid, boolean) from public, anon;
revoke all on function public.invite_guardian() from public, anon;
revoke all on function public.guardian_invite(text) from public, anon;
revoke all on function public.accept_guardian(text) from public, anon;
revoke all on function public.revoke_guardian(uuid) from public, anon;
revoke all on function public.set_guardian_plus(uuid, boolean) from public, anon;
revoke all on function public.my_guardian() from public, anon;
revoke all on function public.my_teens() from public, anon;
revoke all on function public.decide_guardian_order(uuid, boolean) from public, anon;

grant execute on function private.age_of(uuid) to anon, authenticated;
grant execute on function private.is_minor(uuid) to anon, authenticated;
grant execute on function private.is_adult(uuid) to authenticated;
grant execute on function private.first_name(uuid) to authenticated;
grant execute on function private.active_guardian(uuid) to authenticated;
grant execute on function private.require_adult(uuid) to authenticated;
grant execute on function private.invite_guardian() to authenticated;
grant execute on function private.guardian_invite(text) to authenticated;
grant execute on function private.accept_guardian(text) to authenticated;
grant execute on function private.revoke_guardian(uuid) to authenticated;
grant execute on function private.set_guardian_plus(uuid, boolean) to authenticated;
grant execute on function private.my_guardian() to authenticated;
grant execute on function private.my_teens() to authenticated;
grant execute on function private.decide_guardian_order(uuid, boolean) to authenticated;
grant execute on function public.invite_guardian() to authenticated;
grant execute on function public.guardian_invite(text) to authenticated;
grant execute on function public.accept_guardian(text) to authenticated;
grant execute on function public.revoke_guardian(uuid) to authenticated;
grant execute on function public.set_guardian_plus(uuid, boolean) to authenticated;
grant execute on function public.my_guardian() to authenticated;
grant execute on function public.my_teens() to authenticated;
grant execute on function public.decide_guardian_order(uuid, boolean) to authenticated;
