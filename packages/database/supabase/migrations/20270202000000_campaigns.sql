-- Prices, part 3 (owner's master brief, step 7, section 9): campaigns.
--
-- * Staff (editors and marketing) create seasonal campaigns: a name, a
--   description, a start and an end, and publish them.
-- * Approved shops opt in with their own discount, a share off every
--   listing of theirs while the campaign runs, and are featured on the
--   campaign's page. They can change or withdraw it until it ends.
-- * A campaign's discount is a sale: `sale_price` now gives the lower of a
--   listing's own sale and its shop's campaign price, so checkout, offers
--   (a listing on sale takes none), price history and "was" prices follow
--   it, and `sale_ends` tells when the lower price ends.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  description_en text check (char_length(description_en) <= 2000),
  description_ar text check (char_length(description_ar) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '60 days')
);

comment on table public.campaigns is
  'Seasonal campaigns staff run; shops opt in with their own discount.';

create index campaigns_dates_idx on public.campaigns (starts_at, ends_at);
create index campaigns_created_by_idx on public.campaigns (created_by);

create trigger set_updated_at before update on public.campaigns
  for each row execute function private.set_updated_at();

create table public.campaign_entries (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  discount_rate integer not null check (discount_rate between 5 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, seller_id)
);

comment on table public.campaign_entries is
  'A shop in a campaign, with its share off every listing while the campaign runs. Written only by functions.';

create index campaign_entries_seller_idx on public.campaign_entries (seller_id);

create trigger set_updated_at before update on public.campaign_entries
  for each row execute function private.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_entries enable row level security;

-- Published campaigns are public; staff see drafts too and write them.
create policy "Anyone can read published campaigns" on public.campaigns
  for select to anon, authenticated
  using (published or (select private.has_staff_role('{editor,marketing}')));
create policy "Staff add campaigns" on public.campaigns
  for insert to authenticated
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Staff change campaigns" on public.campaigns
  for update to authenticated
  using ((select private.has_staff_role('{editor,marketing}')))
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Staff delete draft campaigns" on public.campaigns
  for delete to authenticated
  using (not published and (select private.has_staff_role('{editor,marketing}')));

-- Which shops take part is public (the campaign page features them).
create policy "Anyone can read campaign entries" on public.campaign_entries
  for select to anon, authenticated using (true);

grant select on public.campaigns, public.campaign_entries to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;

-- ── Taking part ────────────────────────────────────────────────────────────

-- A shop opts in (or changes its discount) until the campaign ends.
create function private.join_campaign(campaign uuid, seller uuid, rate integer)
returns public.campaign_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.campaigns;
  saved public.campaign_entries;
begin
  if not private.can_list_for(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.campaigns c where c.id = campaign and c.published;
  if target.id is null or target.ends_at <= now() then
    raise exception 'This campaign is closed' using errcode = 'check_violation';
  end if;
  insert into public.campaign_entries as e (campaign_id, seller_id, discount_rate)
  values (campaign, seller, rate)
  on conflict (campaign_id, seller_id) do update set discount_rate = excluded.discount_rate
  returning * into saved;
  perform private.record_seller_prices(seller);
  return saved;
end;
$$;

create function private.leave_campaign(campaign uuid, seller uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_list_for(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.campaign_entries e where e.campaign_id = campaign and e.seller_id = seller;
  perform private.record_seller_prices(seller);
end;
$$;

create function public.join_campaign(campaign uuid, seller uuid, rate integer)
returns public.campaign_entries
language sql
security invoker
set search_path = ''
as $$ select private.join_campaign(campaign, seller, rate) $$;

create function public.leave_campaign(campaign uuid, seller uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.leave_campaign(campaign, seller) $$;

-- ── Prices ─────────────────────────────────────────────────────────────────

-- The share off a seller's listings from the campaigns running now.
create function private.campaign_rate(seller uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(e.discount_rate)
  from public.campaign_entries e
  join public.campaigns c on c.id = e.campaign_id
  where e.seller_id = seller and c.published and c.starts_at <= now() and c.ends_at > now();
$$;

-- The listing's sale price now: its own sale's or its shop's campaign
-- price, whichever is lower, or null.
create or replace function private.sale_price(seller uuid, variant uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select least(
    (
      select min(x.sale_price) from public.listing_sales x
      where x.seller_id = seller and x.variant_id = variant and x.condition = wanted
        and x.starts_at <= now() and x.ends_at > now()
    ),
    (
      select r.price - floor(r.price * rate.rate / 100)::bigint
      from (select private.campaign_rate(seller) as rate) rate
      cross join (select private.regular_price(seller, variant, wanted) as price) r
      where rate.rate is not null and r.price is not null
    )
  );
$$;

-- When the listing's lower price ends: its sale's or its campaign's end.
create function private.sale_ends(seller uuid, variant uuid, wanted public.product_condition)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    (
      select max(x.ends_at) from public.listing_sales x
      where x.seller_id = seller and x.variant_id = variant and x.condition = wanted
        and x.starts_at <= now() and x.ends_at > now()
    ),
    (
      select max(c.ends_at) from public.campaign_entries e
      join public.campaigns c on c.id = e.campaign_id
      where e.seller_id = seller and c.published and c.starts_at <= now() and c.ends_at > now()
    )
  );
$$;

-- Records the price of every listing of a seller (after its campaign
-- discount changed).
create function private.record_seller_prices(seller uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing record;
begin
  for listing in
    select distinct s.variant_id, s.condition from public.stock_items s
    where s.seller_id = seller and s.purpose = 'sale' and s.status = 'available'
  loop
    perform private.record_listing_price(listing.variant_id, seller, listing.condition);
  end loop;
end;
$$;

revoke all on function private.campaign_rate(uuid) from public, anon, authenticated;
revoke all on function private.sale_ends(uuid, uuid, public.product_condition) from public, anon, authenticated;
revoke all on function private.record_seller_prices(uuid) from public, anon, authenticated;
revoke all on function private.join_campaign(uuid, uuid, integer) from public, anon;
revoke all on function public.join_campaign(uuid, uuid, integer) from public, anon;
grant execute on function private.join_campaign(uuid, uuid, integer) to authenticated;
grant execute on function public.join_campaign(uuid, uuid, integer) to authenticated;
revoke all on function private.leave_campaign(uuid, uuid) from public, anon;
revoke all on function public.leave_campaign(uuid, uuid) from public, anon;
grant execute on function private.leave_campaign(uuid, uuid) to authenticated;
grant execute on function public.leave_campaign(uuid, uuid) to authenticated;

-- The daily sweep also records the prices of shops whose campaigns
-- started or ended since.
create or replace function public.sweep_listing_sales()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing record;
  shop record;
  changed integer := 0;
begin
  for listing in
    select distinct x.seller_id, x.variant_id, x.condition from public.listing_sales x
    where (x.starts_at between now() - interval '1 day' and now())
       or (x.ends_at between now() - interval '1 day' and now())
  loop
    perform private.record_listing_price(listing.variant_id, listing.seller_id, listing.condition);
    changed := changed + 1;
  end loop;
  for shop in
    select distinct e.seller_id from public.campaign_entries e
    join public.campaigns c on c.id = e.campaign_id
    where c.published
      and ((c.starts_at between now() - interval '1 day' and now())
        or (c.ends_at between now() - interval '1 day' and now()))
  loop
    perform private.record_seller_prices(shop.seller_id);
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

-- ── The campaign page ──────────────────────────────────────────────────────

-- A published campaign's listings for sale: each taking part shop's
-- listings with their price now and before, cheapest first.
create function private.campaign_listings(campaign_slug text)
returns table (
  product_id uuid,
  slug text,
  name_en text,
  name_ar text,
  images text[],
  variant_id uuid,
  condition public.product_condition,
  seller_id uuid,
  seller_name text,
  regular_price bigint,
  price bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name_en, p.name_ar, p.images, l.variant_id, l.condition, l.seller_id, sl.name,
    private.regular_price(l.seller_id, l.variant_id, l.condition),
    private.listing_price(l.seller_id, l.variant_id, l.condition)
  from public.campaigns c
  join public.campaign_entries e on e.campaign_id = c.id
  join public.sellers sl on sl.id = e.seller_id and sl.status = 'approved'
  cross join lateral (
    select distinct s.variant_id, s.condition, s.seller_id, s.product_id
    from public.stock_items s
    where s.seller_id = e.seller_id and s.purpose = 'sale' and s.status = 'available'
  ) l
  join public.products p on p.id = l.product_id and p.status = 'active'
  join public.product_variants v on v.id = l.variant_id and v.active
  where c.slug = campaign_slug and c.published
  order by 11, p.name_en
  limit 500;
$$;

create function public.campaign_listings(campaign_slug text)
returns table (
  product_id uuid,
  slug text,
  name_en text,
  name_ar text,
  images text[],
  variant_id uuid,
  condition public.product_condition,
  seller_id uuid,
  seller_name text,
  regular_price bigint,
  price bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.campaign_listings(campaign_slug) $$;

revoke all on function private.campaign_listings(text) from public;
grant execute on function private.campaign_listings(text) to anon, authenticated;
revoke all on function public.campaign_listings(text) from public;
grant execute on function public.campaign_listings(text) to anon, authenticated;

-- ── What customers see: when a campaign's price ends ───────────────────────

-- A product's offers, cheapest first: the price (a sale's or a campaign's
-- while it runs, with when it ends), the lowest in the last 30 days, the honest "was"
-- price and the listing's quantity deals.
create or replace function private.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint,
  sale_ends_at timestamptz,
  deals jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.variant_id, o.condition, o.purpose, o.available, o.price, o.seller_id, o.seller_name,
    case when o.purpose = 'sale' then private.lowest_price_30d(o.variant_id, o.seller_id, o.condition) end,
    case when o.purpose = 'sale' then private.was_price(o.variant_id, o.seller_id, o.condition) end,
    case when o.purpose = 'sale' then private.sale_ends(o.seller_id, o.variant_id, o.condition) end,
    case when o.purpose = 'sale' then (
      select coalesce(jsonb_agg(jsonb_build_object('min_quantity', d.min_quantity, 'discount_rate', d.discount_rate)
        order by d.min_quantity), '[]'::jsonb)
      from public.quantity_deals d
      where d.seller_id = o.seller_id and d.variant_id = o.variant_id and d.condition = o.condition
    ) end
  from (
    select
      s.variant_id,
      s.condition,
      s.purpose,
      count(*)::integer as available,
      least(
        min(coalesce(s.price, v.price)) filter (where s.purpose = 'sale'),
        case when s.purpose = 'sale' then private.sale_price(s.seller_id, s.variant_id, s.condition) end
      ) as price,
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

create or replace function public.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint,
  sale_ends_at timestamptz,
  deals jsonb
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;
