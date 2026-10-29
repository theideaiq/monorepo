-- Catalog, part 4: send as a gift.
--
-- The buyer checks out the cart as a gift: they choose the area it goes to
-- (for the delivery fee), add a message, can hide the price, and pay
-- online or with Bulbs. The order then waits for its recipient: the buyer
-- shares a link (gift_link), the recipient opens it (gift_preview), signs
-- in and enters their own address (claim_gift). Nothing ships until then.
--
-- * orders.is_gift marks the order; its shipping address holds only the
--   area until the recipient's address replaces it.
-- * public.gifts: one row per gift order — message, hidden price, the
--   link's hash and who claimed it.
-- * private.create_order gains `gift`; public.create_gift_order calls it.
-- * Unclaimed gifts can't move to processing, shipped or delivered, and
--   their shop lines can't be readied.
-- * The phone check at checkout skips gifts; the recipient's phone is
--   checked when they claim.
-- * The recipient is told when it ships and arrives; the buyer when it's
--   claimed.

alter table public.orders add column is_gift boolean not null default false;

comment on column public.orders.is_gift is
  'Sent as a gift (public.gifts): shipped to the recipient''s address once they claim it.';

create table public.gifts (
  order_id uuid primary key references public.orders (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  message text check (char_length(message) between 1 and 500),
  hide_price boolean not null default false,
  -- The link's token, hashed; cleared once claimed.
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  recipient_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check (claimed_at is not null or recipient_id is null),
  check (claimed_at is null or token_hash is null)
);

comment on table public.gifts is
  'Orders sent as gifts: the buyer''s message, whether the price is hidden, the link and who claimed it.';

create index gifts_sender_idx on public.gifts (sender_id);
create index gifts_recipient_idx on public.gifts (recipient_id);

alter table public.gifts enable row level security;

create policy "Senders, recipients and staff see gifts" on public.gifts
  for select to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_id = (select auth.uid())
    or (select private.has_staff_role('{support,finance}'))
  );

grant select (order_id, sender_id, message, hide_price, recipient_id, claimed_at, created_at)
  on public.gifts to authenticated;

-- ── Checkout ────────────────────────────────────────────────────────────────

drop function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer);
drop function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer);

-- Turns the caller's cart into an order (see bulbs_checkout and later).
-- With `gift`, the order is paid online or with Bulbs, goes to the chosen
-- zone and waits for the recipient's address.
create function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0,
  gift boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
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

  if create_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

  -- A gift is paid now and its address comes later, from the recipient
  -- (claim_gift): the buyer only picks the area it goes to.
  if gift then
    if create_order.payment_method is distinct from 'online' then
      raise exception 'Gifts are paid online or with Bulbs' using errcode = 'check_violation';
    end if;
    if delivery_zone is null then
      raise exception 'Choose where the gift goes' using errcode = 'check_violation';
    end if;
  elsif create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
    -- Without a chosen zone, the governorate finds it.
    or (wanted = '' and delivery_zone is null)
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
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status, is_gift
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    case when gift then jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    ) else jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      -- A zone that isn't a whole governorate is named instead.
      'governorate', coalesce(
        quote ->> 'zone_governorate',
        nullif(left(trim(shipping ->> 'governorate'), 60), ''),
        quote ->> 'zone_name_en'
      ),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
    ) || case
      when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end,
    gift
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
    attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.seller_id, l.seller_name, l.condition,
    l.name_ar, l.name_en, l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    seller_id uuid,
    seller_name text,
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

create function public.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0
)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_order($1, $2, $3, $4, $5) $$;

-- The cart as a gift, delivered in `delivery_zone` once claimed.
create function private.create_gift_order(
  delivery_zone uuid,
  message text default null,
  hide_price boolean default false,
  use_bulbs integer default 0
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  note text := nullif(trim(coalesce(message, '')), '');
  created public.orders;
begin
  if char_length(note) > 500 then
    raise exception 'Keep the message under 500 characters' using errcode = 'check_violation';
  end if;

  created := private.create_order('{}'::jsonb, 'delivery', 'online', delivery_zone, use_bulbs, true);
  insert into public.gifts (order_id, sender_id, message, hide_price)
  values (created.id, created.user_id, note, coalesce(hide_price, false));
  return created;
end;
$$;

create function public.create_gift_order(
  delivery_zone uuid,
  message text default null,
  hide_price boolean default false,
  use_bulbs integer default 0
)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_gift_order($1, $2, $3, $4) $$;

-- ── The link ────────────────────────────────────────────────────────────────

-- A new link for the buyer's unclaimed gift (the old one stops working).
create function private.gift_link(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  update public.gifts g
  set token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
  from public.orders o
  where g.order_id = target and o.id = g.order_id
    and g.sender_id = (select auth.uid()) and g.claimed_at is null
    and o.status not in ('cancelled', 'refunded');
  if not found then
    raise exception 'Gift not found' using errcode = 'no_data_found';
  end if;
  return token;
end;
$$;

create function public.gift_link(target uuid)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.gift_link(target) $$;

create function private.gift_by_token(token text)
returns public.gifts
language sql
stable
security definer
set search_path = ''
as $$
  select g.* from public.gifts g
  where token ~ '^[0-9a-f]{48}$'
    and g.token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
$$;

-- What the link shows: who it's from, the message and what's inside (with
-- prices unless hidden). Anyone with the link can open it.
create function private.gift_details(gift public.gifts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'from', private.first_name(gift.sender_id),
    'message', gift.message,
    'claimed', gift.claimed_at is not null,
    'ready', o.status in ('paid', 'confirmed', 'processing', 'shipped', 'delivered'),
    'status', o.status,
    'governorate', o.shipping_address ->> 'governorate',
    'total', case when gift.hide_price then null else o.total - o.shipping_fee end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name_ar', i.name_ar,
        'name_en', i.name_en,
        'quantity', i.quantity,
        'slug', p.slug,
        'image', p.images[1],
        'unit_price', case when gift.hide_price then null else i.unit_price end
      ) order by i.name_en)
      from public.order_items i
      left join public.products p on p.id = i.product_id
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = gift.order_id
$$;

create function private.gift_preview(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  gift public.gifts := private.gift_by_token(token);
begin
  if gift.order_id is null then
    raise exception 'Gift not found' using errcode = 'no_data_found';
  end if;
  return private.gift_details(gift);
end;
$$;

create function public.gift_preview(token text)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$ select private.gift_preview(token) $$;

-- The recipient takes the gift and gives their address in the gift's area.
-- The link is spent; the buyer is told.
create function private.claim_gift(token text, shipping jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  gift public.gifts;
  target public.orders;
  phone text := shipping ->> 'phone';
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  gift := private.gift_by_token(token);
  if gift.order_id is null then
    raise exception 'Gift not found' using errcode = 'no_data_found';
  end if;
  select * into target from public.orders o where o.id = gift.order_id for update;
  if gift.sender_id = caller then
    raise exception 'This gift is from you' using errcode = 'check_violation';
  end if;
  if target.status not in ('paid', 'confirmed') then
    raise exception 'This gift isn''t ready yet' using errcode = 'check_violation';
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(phone, '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;
  if coalesce((select s.require_verified_phone from public.store_settings s), false)
    and not private.phone_is_verified(caller, phone)
  then
    raise exception 'Verify your phone number first' using errcode = 'check_violation';
  end if;

  update public.orders set shipping_address = jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', phone,
      'governorate', target.shipping_address ->> 'governorate',
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
    ) || case
      when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end
  where id = target.id;

  update public.gifts
  set recipient_id = caller, claimed_at = now(), token_hash = null
  where order_id = gift.order_id;

  perform private.notify(
    gift.sender_id,
    'order',
    'gift_claimed',
    jsonb_build_object('number', target.number, 'name', private.first_name(caller)),
    '/orders/view?id=' || target.id
  );
  return target.id;
end;
$$;

create function public.claim_gift(token text, shipping jsonb)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.claim_gift(token, shipping) $$;

-- The caller's received gifts, newest first, as the link shows them.
create function private.received_gifts()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.gift_details(g) || jsonb_build_object('number', o.number, 'claimed_at', g.claimed_at)
  from public.gifts g
  join public.orders o on o.id = g.order_id
  where g.recipient_id = (select auth.uid())
  order by g.claimed_at desc
$$;

create function public.received_gifts()
returns setof jsonb
language sql stable
security invoker
set search_path = ''
as $$ select * from private.received_gifts() $$;

-- ── Holding unclaimed gifts ─────────────────────────────────────────────────

create function private.hold_unclaimed_gift()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_gift
    and new.status in ('processing', 'shipped', 'delivered')
    and new.status is distinct from old.status
    and not exists (
      select 1 from public.gifts g where g.order_id = new.id and g.claimed_at is not null
    )
  then
    raise exception 'Waiting for the recipient''s address' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger hold_unclaimed_gift before update of status on public.orders
  for each row execute function private.hold_unclaimed_gift();

create function private.hold_unclaimed_gift_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.seller_status = 'ready'
    and new.seller_status is distinct from old.seller_status
    and exists (
      select 1 from public.orders o
      join public.gifts g on g.order_id = o.id
      where o.id = new.order_id and g.claimed_at is null
    )
  then
    raise exception 'Waiting for the recipient''s address' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger hold_unclaimed_gift_lines before update of seller_status on public.order_items
  for each row execute function private.hold_unclaimed_gift_lines();

-- The recipient hears when their gift ships and arrives.
create function private.notify_gift_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if not new.is_gift or new.status is not distinct from old.status
    or new.status not in ('shipped', 'delivered')
  then
    return null;
  end if;
  select g.recipient_id into recipient from public.gifts g where g.order_id = new.id;
  if recipient is not null then
    perform private.notify(
      recipient,
      'order',
      'gift_' || new.status::text,
      jsonb_build_object('number', new.number),
      '/gifts'
    );
  end if;
  return null;
end;
$$;

create trigger notify_gift_status after update of status on public.orders
  for each row execute function private.notify_gift_status();

-- ── The phone check skips gifts (the recipient's is checked on claiming) ────

create or replace function private.require_verified_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  phone text;
begin
  if caller is null or caller is distinct from new.user_id then
    return new;
  end if;
  if not coalesce(
    (select s.require_verified_phone from public.store_settings s), false
  ) then
    return new;
  end if;

  if tg_table_name = 'orders' then
    if new.fulfilment <> 'delivery' or new.is_gift then
      return new;
    end if;
    phone := new.shipping_address ->> 'phone';
  else
    phone := new.phone;
  end if;

  if phone is null or not private.phone_is_verified(caller, phone) then
    raise exception 'Verify your phone number first'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer, boolean)
  from public, anon;
grant execute on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer, boolean)
  to authenticated, service_role;
revoke all on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  from public, anon;
grant execute on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  to authenticated, service_role;

revoke all on function private.create_gift_order(uuid, text, boolean, integer) from public, anon;
revoke all on function public.create_gift_order(uuid, text, boolean, integer) from public, anon;
grant execute on function private.create_gift_order(uuid, text, boolean, integer) to authenticated;
grant execute on function public.create_gift_order(uuid, text, boolean, integer) to authenticated;

revoke all on function private.gift_link(uuid) from public, anon;
revoke all on function public.gift_link(uuid) from public, anon;
grant execute on function private.gift_link(uuid) to authenticated;
grant execute on function public.gift_link(uuid) to authenticated;

revoke all on function private.gift_by_token(text) from public, anon, authenticated;
revoke all on function private.gift_details(public.gifts) from public, anon, authenticated;

revoke all on function private.gift_preview(text) from public;
revoke all on function public.gift_preview(text) from public;
grant execute on function private.gift_preview(text) to anon, authenticated;
grant execute on function public.gift_preview(text) to anon, authenticated;

revoke all on function private.claim_gift(text, jsonb) from public, anon;
revoke all on function public.claim_gift(text, jsonb) from public, anon;
grant execute on function private.claim_gift(text, jsonb) to authenticated;
grant execute on function public.claim_gift(text, jsonb) to authenticated;

revoke all on function private.received_gifts() from public, anon;
revoke all on function public.received_gifts() from public, anon;
grant execute on function private.received_gifts() to authenticated;
grant execute on function public.received_gifts() to authenticated;

revoke all on function private.hold_unclaimed_gift() from public, anon, authenticated;
revoke all on function private.hold_unclaimed_gift_lines() from public, anon, authenticated;
revoke all on function private.notify_gift_status() from public, anon, authenticated;
