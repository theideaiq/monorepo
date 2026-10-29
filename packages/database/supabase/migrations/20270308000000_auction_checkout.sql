-- Auctions, part 2 (28 October brief, section 14): paying for a won
-- auction through the one cart.
--
-- * A win (or a second chance) puts the auction in the winner's cart
--   (`cart_auctions`); it leaves when the auction stops waiting for them.
--   They can take it out and put it back while it's theirs to pay.
-- * Checkout prices it at the final price, as one line for the copy held
--   (`order_items.auction_id`). Wins are paid online, never on delivery;
--   they count as what's bought (free delivery, discounts, Bulbs and
--   cashback) and the shop's commission is at the category's rate, as for
--   any line.
-- * Paying the order sells that copy and marks the auction paid; nothing
--   else is ever taken for the line. A payment that comes after the copy
--   went elsewhere takes nothing, so the line is refunded as out of stock.
-- * While an order for it waits for payment (for up to 24 hours), a win
--   isn't settled as unpaid; a cancelled order puts it back in the cart
--   while there's time.

alter table public.order_items
  add column auction_id uuid references public.auctions (id) on delete set null;

comment on column public.order_items.auction_id is
  'The won auction this line pays for; it sells that auction''s copy.';

create index order_items_auction_id_idx on public.order_items (auction_id);

-- ── In the cart ───────────────────────────────────────────────────────────

create table public.cart_auctions (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);

comment on table public.cart_auctions is
  'A won auction waiting in the winner''s cart; create_order adds it to the order.';

create index cart_auctions_auction_id_idx on public.cart_auctions (auction_id);

-- Whether a member has an auction to pay: won (or offered to them) and in time.
create function private.auction_to_pay(member uuid, auction uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.auctions a
    join public.bids b on b.auction_id = a.id
    where a.id = auction and a.status = 'won' and a.pay_by > now()
      and b.bidder_id = member and b.outcome in ('won', 'second_chance')
  );
$$;

revoke all on function private.auction_to_pay(uuid, uuid) from public, anon;
grant execute on function private.auction_to_pay(uuid, uuid) to authenticated;

alter table public.cart_auctions enable row level security;

create policy "Members see their cart's auctions" on public.cart_auctions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Winners put their auctions in the cart" on public.cart_auctions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.auction_to_pay((select auth.uid()), auction_id)));
create policy "Members take auctions out of their cart" on public.cart_auctions
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.cart_auctions to authenticated;
grant insert (auction_id) on public.cart_auctions to authenticated;
grant all on public.cart_auctions to service_role;

-- Whether an order for the auction is waiting for its payment: placed in
-- the last 24 hours (abandoned payments aren't cancelled, so an older one
-- holds nothing; a late payment still settles an unpaid win).
create function private.auction_awaiting_payment(auction uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.order_items i
    join public.orders o on o.id = i.order_id
    where i.auction_id = auction and o.status = 'pending'
      and o.created_at > now() - interval '24 hours'
  );
$$;

revoke all on function private.auction_awaiting_payment(uuid) from public, anon, authenticated;

-- A win or a second chance goes to the bidder's cart.
create function private.cart_won_auction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.outcome in ('won', 'second_chance') and old.outcome is distinct from new.outcome then
    insert into public.cart_auctions (user_id, auction_id)
    values (new.bidder_id, new.auction_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

revoke all on function private.cart_won_auction() from public, anon, authenticated;

create trigger cart_won_auction after update of outcome on public.bids
  for each row execute function private.cart_won_auction();

-- An auction that stops waiting for payment leaves the cart.
create function private.uncart_auction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'won' and new.status <> 'won' then
    delete from public.cart_auctions where auction_id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function private.uncart_auction() from public, anon, authenticated;

create trigger uncart_auction after update of status on public.auctions
  for each row execute function private.uncart_auction();

-- A cancelled order puts its wins back in the cart while they can be paid.
create function private.recart_auctions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.cart_auctions (user_id, auction_id)
    select new.user_id, i.auction_id from public.order_items i
    where i.order_id = new.id and i.auction_id is not null
      and private.auction_to_pay(new.user_id, i.auction_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

revoke all on function private.recart_auctions() from public, anon, authenticated;

create trigger recart_auctions after update of status on public.orders
  for each row execute function private.recart_auctions();

-- ── Taking the copy ───────────────────────────────────────────────────────

-- A paid order sells its copies. An auction's line sells the auction's
-- copy while it's still held for this win (or the unpaid one this payment
-- settles late), marks the auction paid and lifts a strike it gave.
create or replace function private.take_order_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
  won public.auctions;
begin
  for item in select * from public.order_items where order_id = target loop
    if item.kind = 'sale' and item.auction_id is not null then
      select * into won from public.auctions a where a.id = item.auction_id for update;
      if exists (
        select 1 from public.bids b
        where b.auction_id = won.id and b.bidder_id = (select o.user_id from public.orders o where o.id = target)
          and (
            (won.status = 'won' and b.outcome in ('won', 'second_chance'))
            or (won.status = 'unpaid' and b.outcome = 'unpaid')
          )
      ) then
        update public.stock_items set status = 'sold', order_item_id = item.id
        where id = won.stock_item_id and status = 'reserved';
        update public.auctions set status = 'paid', order_item_id = item.id where id = won.id;
        delete from public.bidding_strikes s
        where s.auction_id = won.id
          and s.user_id = (select o.user_id from public.orders o where o.id = target);
      end if;
    elsif item.kind = 'sale' then
      update public.stock_items set status = 'sold', order_item_id = item.id
      where id in (
        select c.stock_item
        from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity, item.seller_id) c
      );
    elsif item.kind = 'keep' then
      update public.stock_items
      set status = 'sold', order_item_id = item.id, rental_id = null
      where rental_id = item.rental_id and status = 'rented';
      update public.rentals set status = 'kept', returned_at = now()
      where id = item.rental_id and status in ('active', 'overdue');
    end if;
  end loop;
end;
$$;

-- ── Settling waits for a payment on its way ───────────────────────────────

create or replace function private.settle_auction(target uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
  item public.products;
  shop public.sellers;
  winner uuid;
  facts jsonb;
begin
  select * into a from public.auctions x where x.id = target for update skip locked;
  if a.id is null then
    return null;
  end if;
  select * into item from public.products p where p.id = a.product_id;
  select * into shop from public.sellers s where s.id = a.seller_id;
  facts := jsonb_build_object(
    'auction_id', a.id, 'number', a.number, 'name_en', item.name_en, 'name_ar', item.name_ar
  );

  if a.status = 'live' and a.ends_at <= now() then
    if a.bid_count > 0 and a.reserve_met then
      update public.auctions set
        status = 'won',
        final_price = current_price,
        pay_by = greatest(ends_at, now()) + interval '48 hours',
        ended_at = now()
      where id = target
      returning * into a;
      update public.bids set outcome = case when winning then 'won' else 'lost' end
      where auction_id = target;
      select b.bidder_id into winner from public.bids b where b.auction_id = target and b.winning;
      perform private.notify(
        winner, 'order', 'auction_won', facts || jsonb_build_object('amount', a.final_price, 'pay_by', a.pay_by),
        '/store/auctions/' || a.number
      );
      if shop.organization_id is not null then
        perform private.notify_org_admins(
          shop.organization_id, 'auction_sold', facts || jsonb_build_object('amount', a.final_price),
          '/selling/auctions'
        );
      end if;
    else
      a := private.release_auction(target, 'unsold');
      if shop.organization_id is not null then
        perform private.notify_org_admins(shop.organization_id, 'auction_unsold', facts, '/selling/auctions');
      end if;
    end if;
    return a;
  end if;

  if a.status = 'won' and a.pay_by <= now() and not private.auction_awaiting_payment(a.id) then
    select b.bidder_id into winner from public.bids b
    where b.auction_id = target and b.outcome in ('won', 'second_chance');
    if a.second_chance then
      -- A second chance is an offer: letting it pass isn't a strike.
      return private.release_auction(target, 'unsold');
    end if;
    update public.auctions set status = 'unpaid' where id = target returning * into a;
    update public.bids set outcome = 'unpaid' where auction_id = target and bidder_id = winner;
    insert into public.bidding_strikes (user_id, auction_id) values (winner, target)
    on conflict do nothing;
    perform private.notify(winner, 'order', 'auction_unpaid', facts, '/store/auctions/' || a.number);
    if shop.organization_id is not null then
      perform private.notify_org_admins(shop.organization_id, 'auction_unpaid', facts, '/selling/auctions');
    end if;
    return a;
  end if;

  if a.status = 'unpaid' and a.pay_by + interval '7 days' <= now() then
    return private.release_auction(target, 'unsold');
  end if;
  return a;
end;
$$;

create or replace function private.settle_auctions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid;
  settled integer := 0;
begin
  for due in
    select a.id from public.auctions a
    where (a.status = 'live' and a.ends_at <= now())
      or (a.status = 'won' and a.pay_by <= now() and not private.auction_awaiting_payment(a.id))
      or (a.status = 'unpaid' and a.pay_by + interval '7 days' <= now())
    order by coalesce(a.pay_by, a.ends_at)
    limit 200
  loop
    perform private.settle_auction(due);
    settled := settled + 1;
  end loop;
  return settled;
end;
$$;

-- ── Checkout: won auctions in the one cart ───────────────────────────────

create or replace function private.price_checkout(
  member uuid,
  governorate text,
  fulfilment public.order_fulfilment,
  payment_method public.order_payment_method,
  delivery_zone uuid,
  use_bulbs integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  offer public.offers;
  deal_rate integer;
  student boolean := private.is_student(member);
  student_cost bigint;
  -- Plus members: the shop's Plus price, or a campaign's price before it
  -- opens to everyone.
  tier integer := private.plus_tier(member);
  plus_cost bigint;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  coupon public.coupons;
  coupon_off bigint;
  promo bigint := 0;
  source text;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
  -- Rent lines: their rent, refundable deposits and the rentals to make.
  rental record;
  rate record;
  rent_items jsonb := '[]'::jsonb;
  rentals jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  goods bigint := 0;
  item public.products;
  -- The cart's game night kit, if any.
  cart_kit public.cart_kits;
  kit_row public.kit_types;
  weekend record;
  kit jsonb;
  -- Plus months given as a gift, if any.
  cart_plus public.cart_plus_gifts;
  gift_plan public.plans;
  plus bigint := 0;
  plus_gift jsonb;
  -- Program installments, if any.
  cart_program record;
  program_lines jsonb := '[]'::jsonb;
  programs bigint := 0;
  program_amount bigint;
  program_positions smallint[];
  has_programs boolean;
  -- Won auctions, if any.
  cart_auction record;
  auction_lines jsonb := '[]'::jsonb;
  has_auctions boolean;
  -- Whether anything in the cart is delivered.
  ships boolean;
begin
  select * into settings from public.store_settings;

  if price_checkout.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;


  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  select * into cart_kit from public.cart_kits k where k.user_id = member;
  select * into cart_plus from public.cart_plus_gifts g where g.user_id = member;
  has_auctions := exists (select 1 from public.cart_auctions c where c.user_id = member);
  ships := cart_kit.id is not null or has_auctions
    or exists (select 1 from public.cart_items where user_id = member);
  has_programs := exists (select 1 from public.cart_programs c where c.user_id = member);
  if not ships and cart_plus.user_id is null and not has_programs then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;
  -- Programs are paid online, never on delivery.
  if cash and has_programs then
    raise exception 'Programs are paid online' using errcode = 'check_violation';
  end if;
  -- So are won auctions: a win is paid within 48 hours.
  if cash and has_auctions then
    raise exception 'Auctions are paid online' using errcode = 'check_violation';
  end if;

  -- Plus months on their own are added to the recipient's Pass: nothing
  -- is delivered, so no zone is needed.
  if ships or delivery_zone is not null or wanted <> '' then
    if delivery_zone is not null then
      select * into zone from public.delivery_zones z
      where z.id = delivery_zone and z.active;
    else
      select * into zone from public.delivery_zones z
      where z.active and (z.governorate = wanted or lower(z.name_en) = wanted)
      order by z.position
      limit 1;
    end if;
    if zone.id is null then
      raise exception 'Delivery zone not available' using errcode = 'check_violation';
    end if;
  end if;

  for line in
    select
      c.product_id,
      c.variant_id,
      c.seller_id,
      sl.name as seller_name,
      sl.status as seller_status,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    join public.sellers sl on sl.id = c.seller_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = member and c.purpose = 'sale'
    order by c.created_at, c.product_id
  loop
    if line.status <> 'active' or line.seller_status <> 'approved' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity, line.seller_id) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    -- An accepted offer prices one copy of its listing for 24 hours.
    select * into offer from public.offers o
    where o.buyer_id = member and o.status = 'accepted' and o.cart_until > now()
      and o.seller_id = line.seller_id and o.variant_id = line.variant_id
      and o.condition = line.condition;
    if offer.id is not null then
      if line.quantity > 1 then
        raise exception 'An accepted offer is for one copy' using errcode = 'check_violation';
      end if;
      line_price := least(line_price, offer.amount);
    end if;

    -- A quantity deal takes its share off each copy from its quantity on.
    select d.discount_rate into deal_rate from public.quantity_deals d
    where d.seller_id = line.seller_id and d.variant_id = line.variant_id
      and d.condition = line.condition and d.min_quantity <= line.quantity
    order by d.discount_rate desc
    limit 1;
    if deal_rate is not null and offer.id is null then
      line_price := line_price - floor(line_price * deal_rate / 100)::bigint;
    else
      deal_rate := null;
    end if;

    -- A verified student pays the listing's student price when it is lower
    -- than everything above (never with an accepted offer); the shop pays it.
    student_cost := null;
    if student and offer.id is null then
      select sp.price into student_cost from public.student_prices sp
      where sp.seller_id = line.seller_id and sp.variant_id = line.variant_id
        and sp.condition = line.condition;
      if student_cost is not null and student_cost < line_price then
        line_price := student_cost;
        deal_rate := null;
      else
        student_cost := null;
      end if;
    end if;

    -- A Plus member pays the listing's Plus price (the shop pays it) or the
    -- early campaign price when it is lower still (never with an offer).
    plus_cost := null;
    if tier > 0 and offer.id is null then
      plus_cost := private.plus_price(line.seller_id, line.variant_id, line.condition, tier);
      if plus_cost is not null and plus_cost < line_price then
        line_price := plus_cost;
        deal_rate := null;
        student_cost := null;
      else
        plus_cost := null;
      end if;
    end if;

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'offer_id', offer.id,
      'deal_rate', deal_rate,
      'student_price', student_cost is not null,
      'plus_price', plus_cost is not null,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  -- Won auctions: the copy held for each, at its final price, while it can
  -- still be paid. They count as what's bought.
  for cart_auction in
    select
      a.id, a.product_id, a.variant_id, a.seller_id, a.condition, a.final_price,
      a.status as auction_status, a.pay_by, sl.name as seller_name, sl.status as seller_status,
      p.name_ar, p.name_en, coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_auctions c
    join public.auctions a on a.id = c.auction_id
    join public.products p on p.id = a.product_id
    join public.sellers sl on sl.id = a.seller_id
    left join public.product_variants v on v.id = a.variant_id
    where c.user_id = member
    order by c.created_at, c.auction_id
  loop
    if cart_auction.auction_status <> 'won' or cart_auction.pay_by <= now()
      or cart_auction.seller_status <> 'approved'
      or not exists (
        select 1 from public.bids b
        where b.auction_id = cart_auction.id and b.bidder_id = member
          and b.outcome in ('won', 'second_chance')
      )
    then
      raise exception 'This auction can''t be paid now' using errcode = 'check_violation';
    end if;
    if private.auction_awaiting_payment(cart_auction.id) then
      raise exception 'This auction is already in an order' using errcode = 'check_violation';
    end if;
    subtotal := subtotal + cart_auction.final_price;
    auction_lines := auction_lines || jsonb_build_object(
      'auction_id', cart_auction.id,
      'product_id', cart_auction.product_id,
      'variant_id', cart_auction.variant_id,
      'seller_id', cart_auction.seller_id,
      'seller_name', cart_auction.seller_name,
      'condition', cart_auction.condition,
      'unit_price', cart_auction.final_price,
      'name_ar', cart_auction.name_ar,
      'name_en', cart_auction.name_en,
      'attributes', cart_auction.attributes
    );
  end loop;

  goods := subtotal;

  -- Rent lines: 1 to 3, several only films, books and games; each priced
  -- by its rate, with a copy free to go out.
  select coalesce(jsonb_agg(
    jsonb_build_object('product', c.product_id, 'variant', c.variant_id)
    order by c.created_at, c.product_id
  ), '[]'::jsonb)
  into rent_items
  from public.cart_items c
  where c.user_id = member and c.purpose = 'rent';
  if jsonb_array_length(rent_items) > 0 then
    for rental in select * from private.rental_items(rent_items) loop
      select * into item from public.products p where p.id = rental.product;
      select * into rate from private.rental_quote(rental.product, rental.variant);
      if item.status is distinct from 'active' or rate.price is null then
        raise exception 'Item not available' using errcode = 'no_data_found';
      end if;
      if not exists (
        select 1 from public.stock_items s
        join public.product_variants v on v.id = s.variant_id
        where s.product_id = rental.product and v.active
          and (rental.variant is null or s.variant_id = rental.variant)
          and s.purpose = 'rental' and s.status = 'available'
      ) then
        raise exception 'All copies are rented out' using errcode = 'check_violation';
      end if;
      rent := rent + rate.price;
      deposits := deposits + rate.deposit;
      rentals := rentals || jsonb_build_object(
        'product_id', rental.product,
        'variant_id', rental.variant,
        'name_ar', item.name_ar,
        'name_en', item.name_en,
        'price', rate.price,
        'deposit', rate.deposit,
        'days', rate.days,
        'late_fee', rate.late_fee
      );
    end loop;
  end if;

  -- A game night kit: the weekend's price and its extra days count like
  -- rent, with its deposit (none for verified students); delivered in
  -- Baghdad only.
  if cart_kit.id is not null then
    select * into kit_row from public.kit_types k where k.id = cart_kit.kit_type and k.active;
    select * into weekend from private.kit_weekends(cart_kit.kit_type) w
    where w.starts_on = cart_kit.starts_on;
    if kit_row.id is null or weekend.starts_on is null then
      raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
    end if;
    if private.free_kit_unit(kit_row.id, cart_kit.starts_on, cart_kit.starts_on + 2 + cart_kit.extra_days) is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    if zone.governorate is distinct from 'baghdad' then
      raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
    end if;
    if private.is_student(member) then
      kit_row.deposit := 0;
    end if;
    kit := jsonb_build_object(
      'kit_type', kit_row.id,
      'name_ar', kit_row.name_ar,
      'name_en', kit_row.name_en,
      'starts_on', cart_kit.starts_on,
      'extra_days', cart_kit.extra_days,
      'games', to_jsonb(cart_kit.games),
      'price', weekend.price + cart_kit.extra_days * weekend.extra_day_price,
      'deposit', kit_row.deposit
    );
    rent := rent + (kit ->> 'price')::bigint;
    deposits := deposits + kit_row.deposit;
  end if;

  -- Plus months as a gift: the plan's monthly price for each month. They
  -- don't count towards free delivery, discounts, the giveaway cap or
  -- cashback.
  if cart_plus.user_id is not null then
    select * into gift_plan from public.plans p
    where p.id = cart_plus.plan_id and p.active and p.audience = 'plus'
      and p.billing_interval = 'month' and p.student_of is null;
    if gift_plan.id is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    plus := gift_plan.amount * cart_plus.months;
    plus_gift := jsonb_build_object(
      'plan_id', gift_plan.id,
      'name', gift_plan.name,
      'name_ar', gift_plan.name_ar,
      'months', cart_plus.months,
      'monthly', gift_plan.amount,
      'price', plus
    );
  end if;
  -- Program installments: an accepted application's next one, or
  -- everything left. Nothing is delivered; they don't count towards free
  -- delivery or discounts, and earn cashback like the rest.
  for cart_program in
    select c.application_id, c.pay_in_full, a.status, o.title_ar, o.title_en
    from public.cart_programs c
    join public.program_applications a on a.id = c.application_id
    join public.opportunities o on o.id = a.program_id
    where c.user_id = member and a.user_id = member
    order by c.created_at, c.application_id
  loop
    if cart_program.status not in ('accepted', 'confirmed') then
      raise exception 'This application can''t be paid now' using errcode = 'check_violation';
    end if;
    select coalesce(sum(d.amount), 0), array_agg(d.installment order by d.installment)
    into program_amount, program_positions
    from private.program_due(cart_program.application_id, cart_program.pay_in_full) d;
    if program_amount = 0 then
      raise exception 'Nothing to pay on this application' using errcode = 'check_violation';
    end if;
    programs := programs + program_amount;
    program_lines := program_lines || jsonb_build_object(
      'application_id', cart_program.application_id,
      'positions', to_jsonb(program_positions),
      'installments', (
        select count(*) from public.program_payments p
        where p.application_id = cart_program.application_id
      ),
      'amount', program_amount,
      'title_ar', cart_program.title_ar,
      'title_en', cart_program.title_en
    );
  end loop;

  subtotal := goods + rent + deposits + plus + programs;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := coalesce(zone.fee, 0);
  -- Deposits come back, so they don't count towards the threshold.
  if zone.free_from is not null and goods + rent >= zone.free_from then
    free_reason := 'threshold';
  elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
    free_reason := 'plan';
  end if;
  if free_reason is not null then
    waived := fee;
    fee := 0;
  end if;
  if not ships then
    fee := 0;
    waived := 0;
    free_reason := null;
  end if;
  -- A kit on its own is delivered free, as before.
  if kit is not null and goods = 0 and jsonb_array_length(rentals) = 0 then
    fee := 0;
    waived := 0;
    free_reason := 'kit';
  end if;

  -- A friend's invite takes 10% off the first order (at most 15,000 IQD).
  select * into invite from public.referrals r
  where r.invitee_id = member and r.status = 'pending';
  -- Once: not after a paid order, nor while another invite order is open.
  if invite.invitee_id is not null and not exists (
    select 1 from public.orders o
    where o.user_id = member
      and (
        o.status not in ('cancelled', 'pending')
        or (o.discount_source = 'invite' and o.status <> 'cancelled')
      )
  ) then
    promo := least(floor(goods * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- A coupon applied to the cart (The IDEA pays it) replaces the invite
  -- discount when it takes more off; the cap below still holds.
  select c.* into coupon from public.cart_coupons cc
  join public.coupons c on c.id = cc.coupon_id
  where cc.user_id = member;
  -- Discounts are on what's bought; rentals keep their rates.
  if coupon.id is not null and private.coupon_problem(coupon.id, member, goods) is null then
    coupon_off := case coupon.kind
      when 'percent' then floor(goods * coupon.amount / 100)::bigint
      else coupon.amount
    end;
    coupon_off := least(coupon_off, coalesce(coupon.max_discount, coupon_off), goods);
    if coupon_off > promo then
      promo := coupon_off;
      source := 'coupon';
    end if;
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor((goods + rent + programs) * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs (1 IQD each) pay up to the whole order, from what's usable now,
  -- in steps of 250 and at least 1,000.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    -- Bulbs pay for what's bought, rented and program installments, never
    -- a deposit, and up to half of one month of gifted Plus.
    bulbs := (least(
      use_bulbs,
      goods + rent + programs + fee - promo + least(plus, coalesce(gift_plan.amount, 0) / 2)
    ) / 250 * 250)::integer;
    if bulbs < 1000 then
      bulbs := 0;
    end if;
  end if;

  total := subtotal + fee - promo - bulbs;
  max_bulbs := greatest(0, cap - waived - promo)::integer;
  -- Cashback on what's paid in money, at the member's rate, rounded.
  earn := least(
    round(
      (goods + rent + programs)
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 100
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'auctions', auction_lines,
    'rentals', rentals,
    'kit', kit,
    'plus_gift', plus_gift,
    'plus', plus,
    'programs', program_lines,
    'program_total', programs,
    'ships', ships,
    'goods', goods,
    'rent', rent,
    'deposits', deposits,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', zone.free_from,
    'discount', promo,
    'discount_source', source,
    'coupon_code', case when coupon.id is not null then coupon.code end,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$$;

create or replace function private.create_order(
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
  rental jsonb;
  copy public.stock_items;
  made public.rentals;
  kit jsonb;
  kit_unit uuid;
  booking public.kit_bookings;
  plus_gift jsonb;
  months integer;
  program jsonb;
  only_programs boolean;
  won jsonb;
  ships boolean := exists (select 1 from public.cart_items c where c.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_kits k where k.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_auctions a where a.user_id = (select auth.uid()));
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
    -- Plus months on their own go to the recipient's Pass, not an area.
    if delivery_zone is null and ships then
      raise exception 'Choose where the gift goes' using errcode = 'check_violation';
    end if;
  elsif not ships and create_order.payment_method is not null then
    -- Nothing is delivered (program installments): no address needed.
    null;
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
  -- And won auctions, so one can't be ordered twice at once.
  perform 1 from public.auctions a
  where a.id in (select c.auction_id from public.cart_auctions c where c.user_id = caller)
  order by a.id
  for update;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );
  -- A rental comes back to whoever rented it, so it isn't a gift (yet).
  if gift and jsonb_array_length(quote -> 'rentals') > 0 then
    raise exception 'Rentals can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  kit := nullif(quote -> 'kit', 'null'::jsonb);
  -- Starting Plus for yourself is the plan page's own checkout.
  plus_gift := nullif(quote -> 'plus_gift', 'null'::jsonb);
  if plus_gift is not null and not gift then
    raise exception 'Plus months are sent as a gift' using errcode = 'check_violation';
  end if;
  -- Program installments are paid by the applicant, never as a gift; a
  -- minor's were approved with the application.
  if jsonb_array_length(quote -> 'programs') > 0 and gift then
    raise exception 'Programs can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  only_programs := jsonb_array_length(quote -> 'programs') > 0
    and jsonb_array_length(quote -> 'lines') = 0
    and jsonb_array_length(quote -> 'auctions') = 0
    and jsonb_array_length(quote -> 'rentals') = 0
    and kit is null and plus_gift is null;
  if kit is not null then
    if gift then
      raise exception 'Kits can''t be sent as gifts' using errcode = 'check_violation';
    end if;
    if not private.is_adult(caller) then
      raise exception 'You need to be 18 or over' using errcode = 'check_violation';
    end if;
  end if;

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
    case when gift then jsonb_strip_nulls(jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    )) when not ships then jsonb_strip_nulls(jsonb_build_object(
      'full_name', nullif(left(trim(coalesce(shipping ->> 'full_name', '')), 120), ''),
      'phone', case when shipping ->> 'phone' ~ '^\+[1-9][0-9]{7,14}$' then shipping ->> 'phone' end
    )) else jsonb_build_object(
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
    case when minor and only_programs then 'approved' when minor then 'pending' end,
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

  -- Won auctions: a line each, at the final price, for the copy held.
  for won in select * from jsonb_array_elements(quote -> 'auctions') loop
    insert into public.order_items (
      order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
      attributes, unit_price, quantity, auction_id
    )
    values (
      created.id, (won ->> 'product_id')::uuid, (won ->> 'variant_id')::uuid,
      (won ->> 'seller_id')::uuid, won ->> 'seller_name',
      (won ->> 'condition')::public.product_condition, won ->> 'name_ar', won ->> 'name_en',
      won -> 'attributes', (won ->> 'unit_price')::bigint, 1, (won ->> 'auction_id')::uuid
    );
  end loop;

  -- Rent lines: a copy held for each, its rental and its rent and
  -- deposit lines (as create_rentals_order).
  for rental in select * from jsonb_array_elements(quote -> 'rentals') loop
    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = (rental ->> 'product_id')::uuid and v.active
      and (rental ->> 'variant_id' is null or s.variant_id = (rental ->> 'variant_id')::uuid)
      and s.purpose = 'rental' and s.status = 'available'
    order by s.created_at
    limit 1
    for update of s skip locked;
    if copy.id is null then
      raise exception 'All copies are rented out' using errcode = 'check_violation';
    end if;

    insert into public.rentals (
      user_id, product_id, variant_id, name_ar, name_en, kind, order_id, days, late_fee, deposit
    )
    values (
      caller, (rental ->> 'product_id')::uuid, copy.variant_id, rental ->> 'name_ar',
      rental ->> 'name_en', 'single', created.id, (rental ->> 'days')::integer,
      (rental ->> 'late_fee')::bigint, (rental ->> 'deposit')::bigint
    )
    returning * into made;

    update public.stock_items set status = 'rented', rental_id = made.id where id = copy.id;

    insert into public.order_items (
      order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
    )
    values
      (created.id, made.product_id, copy.variant_id, copy.condition,
        made.name_ar || ' (إيجار ' || made.days || case when made.days between 3 and 10 then ' أيام)' else ' يومًا)' end,
        made.name_en || ' (rent, ' || made.days || ' days)',
        (rental ->> 'price')::bigint, 1, 'rental', made.id),
      (created.id, made.product_id, copy.variant_id, copy.condition,
        'تأمين قابل للاسترداد: ' || made.name_ar, 'Refundable deposit: ' || made.name_en,
        made.deposit, 1, 'deposit', made.id);
  end loop;

  -- The kit: a free unit for the weekend and its extra days, the games
  -- chosen, and its price and deposit lines (as book_kit).
  if kit is not null then
    kit_unit := private.free_kit_unit(
      kit ->> 'kit_type',
      (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer
    );
    if kit_unit is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
    values (
      caller, kit ->> 'kit_type', kit_unit, (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer,
      (kit ->> 'extra_days')::integer, created.id, (kit ->> 'deposit')::bigint
    )
    returning * into booking;
    insert into public.kit_booking_games (booking_id, product_id)
    select booking.id, g::uuid from jsonb_array_elements_text(kit -> 'games') g;

    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (kit ->> 'name_ar') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'name_en') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'price')::bigint, 1, 'kit'
    );
    if (kit ->> 'deposit')::bigint > 0 then
      insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
      values (
        created.id, 'تأمين قابل للاسترداد: ' || (kit ->> 'name_ar'),
        'Refundable deposit: ' || (kit ->> 'name_en'), (kit ->> 'deposit')::bigint, 1, 'deposit'
      );
    end if;
  end if;

  -- Plus months: one line, and the months the recipient claims.
  if plus_gift is not null then
    months := (plus_gift ->> 'months')::integer;
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      coalesce(plus_gift ->> 'name_ar', plus_gift ->> 'name') || ' · ' || case
        when months = 1 then 'شهر واحد'
        when months = 2 then 'شهران'
        when months between 3 and 10 then months || ' أشهر'
        else months || ' شهرًا'
      end,
      (plus_gift ->> 'name') || ' · ' || months
        || case when months = 1 then ' month' else ' months' end,
      (plus_gift ->> 'price')::bigint, 1, 'plus'
    );
    insert into public.plus_gift_months (order_id, plan_id, months)
    values (created.id, plus_gift ->> 'plan_id', months);
  end if;

  -- Program installments: one line each, and the installments it pays.
  for program in select * from jsonb_array_elements(quote -> 'programs') loop
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (program ->> 'title_ar') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · الدفعة ' || (program -> 'positions' ->> 0) || ' من ' || (program ->> 'installments')
        else
          ' · الدفعات ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' من ' || (program ->> 'installments')
      end,
      (program ->> 'title_en') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · installment ' || (program -> 'positions' ->> 0) || ' of ' || (program ->> 'installments')
        else
          ' · installments ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' of ' || (program ->> 'installments')
      end,
      (program ->> 'amount')::bigint, 1, 'program'
    );
    update public.program_payments p set order_id = created.id
    where p.application_id = (program ->> 'application_id')::uuid
      and p.position in (
        select x::smallint from jsonb_array_elements_text(program -> 'positions') x
      );
  end loop;

  delete from public.cart_items where user_id = caller;
  delete from public.cart_programs where user_id = caller;
  delete from public.cart_auctions where user_id = caller;
  delete from public.cart_kits where user_id = caller;
  delete from public.cart_plus_gifts where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- A minor's order waits for the guardian (decide_guardian_order),
  -- unless it only pays programs the guardian already approved.
  if minor and not only_programs then
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

  -- The coming weekend: hold the kit's games now.
  if kit is not null then
    perform private.hold_kit_games();
  end if;
  return created;
end;
$$;
