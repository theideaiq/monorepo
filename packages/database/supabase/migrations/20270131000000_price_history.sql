-- Prices, part 1 (owner's master brief, step 7, section 9): price history,
-- "Lowest in the last 30 days" and honest "was" prices.
--
-- * Every listing (a seller's variant in one condition) keeps a history of
--   the price it was offered at: its cheapest copy for sale
--   (`private.listing_price`). Rows open and close as copies are priced, sold or restocked.
-- * A struck-through "was" price is allowed only at a price the listing
--   was offered at for at least 15 of the last 30 days, and only above
--   today's price. It is worked out from the history, never typed in:
--   `product_variants.compare_at_price` (The IDEA's new copies, shown on
--   cards) is kept equal to it, and `product_offers` gives each listing its
--   own, with its lowest price in the last 30 days.
-- * A listing showing a "was" price is on sale, so it takes no offers.
-- * `product_offers` lists the cheapest first.

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  condition public.product_condition not null,
  price bigint not null check (price > 0),
  started_at timestamptz not null default now(),
  -- Null while the listing is still at this price.
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);

comment on table public.price_history is
  'The prices each listing (variant, seller, condition) was offered at, and when. Written only by triggers.';

create unique index price_history_open_idx on public.price_history (variant_id, seller_id, condition)
  where ended_at is null;
create index price_history_listing_idx on public.price_history (variant_id, seller_id, condition, started_at);
create index price_history_seller_idx on public.price_history (seller_id);

alter table public.price_history enable row level security;

-- Prices are public: anyone may see what a listing cost.
create policy "Anyone can read price history" on public.price_history
  for select to anon, authenticated using (true);

grant select on public.price_history to anon, authenticated;

-- ── The history ────────────────────────────────────────────────────────────

-- How many of the last 30 days the listing was offered at this price.
create function private.price_days(variant uuid, seller uuid, wanted public.product_condition, amount bigint)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    extract(epoch from least(coalesce(h.ended_at, now()), now())
      - greatest(h.started_at, now() - interval '30 days')) / 86400
  ), 0)::numeric
  from public.price_history h
  where h.variant_id = variant and h.seller_id = seller and h.condition = wanted
    and h.price = amount
    and coalesce(h.ended_at, now()) > now() - interval '30 days';
$$;

-- The lowest price the listing was offered at in the last 30 days.
create function private.lowest_price_30d(variant uuid, seller uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select min(h.price)
  from public.price_history h
  where h.variant_id = variant and h.seller_id = seller and h.condition = wanted
    and coalesce(h.ended_at, now()) > now() - interval '30 days';
$$;

-- The "was" price the listing may show: the highest price above today's it
-- was offered at for at least 15 of the last 30 days, or null.
create function private.was_price(variant uuid, seller uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select max(h.price)
  from (
    select distinct h.price
    from public.price_history h
    where h.variant_id = variant and h.seller_id = seller and h.condition = wanted
      and coalesce(h.ended_at, now()) > now() - interval '30 days'
      and h.price > private.listing_price(seller, variant, wanted)
  ) h
  where private.price_days(variant, seller, wanted, h.price) >= 15;
$$;

-- Open, close or keep the listing's history row after its copies changed;
-- for The IDEA's new copies, keep the variant's "was" price in step.
create function private.record_listing_price(variant uuid, seller uuid, wanted public.product_condition)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_price bigint := private.listing_price(seller, variant, wanted);
  open_price bigint;
begin
  select h.price into open_price from public.price_history h
  where h.variant_id = variant and h.seller_id = seller and h.condition = wanted
    and h.ended_at is null;

  if open_price is distinct from current_price then
    update public.price_history h set ended_at = now()
    where h.variant_id = variant and h.seller_id = seller and h.condition = wanted
      and h.ended_at is null;
    if current_price is not null then
      insert into public.price_history (variant_id, seller_id, condition, price)
      values (variant, seller, wanted, current_price);
    end if;
  end if;

  if wanted = 'new' and exists (
    select 1 from public.sellers sl where sl.id = seller and sl.is_house
  ) then
    -- The variant's own trigger works the value out.
    update public.product_variants v set compare_at_price = null
    where v.id = variant
      and v.compare_at_price is distinct from private.was_price(variant, seller, wanted);
  end if;
end;
$$;

revoke all on function private.price_days(uuid, uuid, public.product_condition, bigint) from public, anon, authenticated;
revoke all on function private.lowest_price_30d(uuid, uuid, public.product_condition) from public, anon, authenticated;
revoke all on function private.was_price(uuid, uuid, public.product_condition) from public, anon, authenticated;
revoke all on function private.record_listing_price(uuid, uuid, public.product_condition) from public, anon, authenticated;

create function private.on_stock_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.record_listing_price(old.variant_id, old.seller_id, old.condition);
  end if;
  if tg_op = 'INSERT' or (
    tg_op = 'UPDATE'
    and (new.variant_id, new.seller_id, new.condition) is distinct from (old.variant_id, old.seller_id, old.condition)
  ) then
    perform private.record_listing_price(new.variant_id, new.seller_id, new.condition);
  end if;
  return null;
end;
$$;

create trigger record_listing_price
  after insert or delete or update of price, status, purpose, condition, variant_id, seller_id
  on public.stock_items
  for each row execute function private.on_stock_price();

-- A variant's price is the price of its copies that have none of their own.
create function private.on_variant_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing record;
begin
  if (new.price, new.active) is distinct from (old.price, old.active) then
    for listing in
      select distinct s.seller_id, s.condition from public.stock_items s
      where s.variant_id = new.id and s.status = 'available' and s.purpose = 'sale'
      union
      select h.seller_id, h.condition from public.price_history h
      where h.variant_id = new.id and h.ended_at is null
    loop
      perform private.record_listing_price(new.id, listing.seller_id, listing.condition);
    end loop;
  end if;
  return null;
end;
$$;

create trigger record_listing_price
  after update of price, active on public.product_variants
  for each row execute function private.on_variant_price();

-- Nobody types a "was" price: it is always the honest one. A new price is
-- recorded after this runs, so a "was" price no longer above it goes now
-- and one a lower price earns is set by `record_listing_price`.
create function private.honest_compare_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  honest bigint;
begin
  if tg_op = 'UPDATE' then
    honest := private.was_price(
      new.id,
      (select sl.id from public.sellers sl where sl.is_house),
      'new'
    );
  end if;
  new.compare_at_price := case when honest > new.price then honest end;
  return new;
end;
$$;

create trigger honest_compare_at
  before insert or update of compare_at_price, price on public.product_variants
  for each row execute function private.honest_compare_at();

revoke all on function private.on_stock_price() from public, anon, authenticated;
revoke all on function private.on_variant_price() from public, anon, authenticated;
revoke all on function private.honest_compare_at() from public, anon, authenticated;

-- "Was" prices age out as the 30 days move on: the selling cron refreshes
-- them once a day.
create function public.refresh_was_prices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  house uuid := (select sl.id from public.sellers sl where sl.is_house);
  changed integer;
begin
  update public.product_variants v set compare_at_price = null
  where v.compare_at_price is distinct from private.was_price(v.id, house, 'new');
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.refresh_was_prices() from public, anon, authenticated;
grant execute on function public.refresh_was_prices() to service_role;

-- Today's prices start the history.
insert into public.price_history (variant_id, seller_id, condition, price)
select l.variant_id, l.seller_id, l.condition, l.price
from (
  select d.variant_id, d.seller_id, d.condition,
    private.listing_price(d.seller_id, d.variant_id, d.condition) as price
  from (
    select distinct s.variant_id, s.seller_id, s.condition
    from public.stock_items s
    where s.status = 'available' and s.purpose = 'sale'
  ) d
) l
where l.price > 0;

-- "Was" prices typed before today go.
select public.refresh_was_prices();

-- ── What customers see ─────────────────────────────────────────────────────

drop function public.product_offers(uuid);
drop function private.product_offers(uuid);

-- A product's offers: available copies grouped by variant, condition,
-- purpose and seller (approved sellers only), cheapest first, with the
-- lowest price, the lowest in the last 30 days and the honest "was" price.
create function private.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.variant_id, o.condition, o.purpose, o.available, o.price, o.seller_id, o.seller_name,
    case when o.purpose = 'sale' then private.lowest_price_30d(o.variant_id, o.seller_id, o.condition) end,
    case when o.purpose = 'sale' then private.was_price(o.variant_id, o.seller_id, o.condition) end
  from (
    select
      s.variant_id,
      s.condition,
      s.purpose,
      count(*)::integer as available,
      min(coalesce(s.price, v.price)) filter (where s.purpose = 'sale') as price,
      s.seller_id,
      sl.name as seller_name,
      sl.is_house
    from public.stock_items s
    join public.products p on p.id = s.product_id
    join public.product_variants v on v.id = s.variant_id
    join public.sellers sl on sl.id = s.seller_id
    where s.product_id = offer_product
      and v.active
      and sl.status = 'approved'
      and s.status = 'available'
      and s.purpose in ('sale', 'rental')
      and (p.status = 'active' or private.is_staff())
    group by s.variant_id, s.condition, s.purpose, s.seller_id, sl.name, sl.is_house
  ) o
  order by o.purpose, o.price nulls last, o.is_house desc, o.seller_name;
$$;

create function public.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;

-- ── Offers: a listing showing a "was" price is on sale ─────────────────────

create or replace function private.offerable_listings(item uuid)
returns table (seller_id uuid, variant_id uuid, condition public.product_condition, min_offer bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.seller_id, r.variant_id, r.condition,
    ceil(price.amount * st.offer_floor_rate / 100)::bigint
  from public.offer_settings r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  cross join public.store_settings st
  cross join lateral (select private.listing_price(r.seller_id, r.variant_id, r.condition) as amount) price
  where p.id = item and r.accept_offers and p.status = 'active' and p.kind = 'sale'
    and v.active and price.amount is not null
    and private.was_price(r.variant_id, r.seller_id, r.condition) is null;
$$;

create or replace function private.make_offer(seller uuid, variant uuid, wanted public.product_condition, offered bigint)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  version public.product_variants;
  rules public.offer_settings;
  price bigint;
  rate numeric;
  o public.offers;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into version from public.product_variants v where v.id = variant;
  select * into item from public.products p where p.id = version.product_id;
  select * into rules from public.offer_settings r
  where r.seller_id = seller and r.variant_id = variant and r.condition = wanted;
  price := private.listing_price(seller, variant, wanted);

  if not coalesce(rules.accept_offers, false) or item.status <> 'active' or item.kind <> 'sale'
    or not version.active or price is null
    or private.was_price(variant, seller, wanted) is not null
  then
    raise exception 'This listing doesn''t take offers' using errcode = 'check_violation';
  end if;
  if private.works_at_seller(seller) then
    raise exception 'You can''t make an offer to your own shop' using errcode = 'check_violation';
  end if;

  select st.offer_floor_rate into rate from public.store_settings st;
  if offered >= price then
    raise exception 'An offer is below the price' using errcode = 'check_violation';
  end if;
  if offered < ceil(price * rate / 100) then
    raise exception 'Offers start at % IQD', ceil(price * rate / 100)::bigint
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.offers x
    where x.buyer_id = caller and x.seller_id = seller and x.variant_id = variant
      and x.condition = wanted and x.status in ('open', 'countered', 'accepted')
  ) then
    raise exception 'You already have an offer on this' using errcode = 'unique_violation';
  end if;
  if (
    select count(*) from public.offers x
    where x.buyer_id = caller and x.seller_id = seller and x.status in ('open', 'countered')
  ) >= 3 then
    raise exception 'At most 3 open offers with one seller' using errcode = 'check_violation';
  end if;

  insert into public.offers (buyer_id, seller_id, product_id, variant_id, condition, list_price, amount, buyer_amount)
  values (caller, seller, item.id, variant, wanted, price, offered, offered)
  returning * into o;
  return private.auto_answer_offer(o.id);
end;
$$;
