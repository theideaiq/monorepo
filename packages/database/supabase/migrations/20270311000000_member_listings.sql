-- People selling (28 October brief, step 14; the selling policy, sections
-- 10 to 13): a person lists one of their own things and sells it to another
-- person, who pays the seller in cash when they meet. The money never
-- passes through The IDEA, and no Bulbs are earned or spent.
--
-- * A seller is 18 or over with a verified identity (the National Card and
--   selfie of step 13). `create_member_listing` takes a product from the
--   catalog or a title, the condition, a description, 3 to 8 photos (the
--   private `member-listing-photos` bucket, "<user id>/…"), the area it's
--   in, a fixed price of at least 1,000 IQD and whether buyers may offer
--   less. A listing runs 30 days and can be renewed; a seller has at most
--   20 live ones.
-- * Anyone can browse live listings (`member_listings_for_sale`,
--   `member_listing`) with the seller's first name and area, never who
--   they are. 18-rated products are hidden from minors.
-- * A buyer (18 or over, with a verified phone while
--   `require_verified_phone` is on) buys at the price, which reserves the
--   listing at once, or offers less when the seller allows it
--   (`buy_member_listing`). An offer stands for 72 hours; the seller
--   accepts it or not (`answer_member_deal`), and accepting reserves the
--   listing and declines the other offers.
-- * The two arrange the hand-over in messages The IDEA passes on
--   (`send_member_message`); no contact details pass between them. The
--   seller marks it sold, or either side calls it off and the listing is
--   live again (`finish_member_deal`).
-- * Support take down a listing that breaks the policy
--   (`take_down_member_listing`); `sweep_member_listings` (the API's cron)
--   expires what's due.

create type public.member_listing_status as enum ('active', 'reserved', 'sold', 'removed', 'expired');
create type public.member_deal_status as enum (
  'sent', 'accepted', 'declined', 'withdrawn', 'expired', 'completed', 'cancelled'
);

-- ── Listings ───────────────────────────────────────────────────────────────

create table public.member_listings (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 2001) unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 200),
  condition public.product_condition not null,
  description text not null check (char_length(trim(description)) between 10 and 2000),
  -- Paths in `member-listing-photos`, under the seller's folder.
  photos text[] not null check (cardinality(photos) between 3 and 8),
  -- Where the item is (a delivery zone's governorate).
  governorate text not null check (char_length(governorate) between 2 and 60),
  price bigint not null check (price >= 1000),
  accepts_offers boolean not null default false,
  status public.member_listing_status not null default 'active',
  expires_at timestamptz not null default now() + interval '30 days',
  sold_at timestamptz,
  -- Set when support take it down.
  removed_reason text check (char_length(removed_reason) <= 500),
  removed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.member_listings is
  'A person selling one of their own things, paid in cash to them. Seen by the seller and staff; everyone else sees live ones through member_listings_for_sale, without the seller''s identity.';

create index member_listings_user_idx on public.member_listings (user_id, created_at desc);
create index member_listings_live_idx on public.member_listings (created_at desc) where status = 'active';
create index member_listings_due_idx on public.member_listings (expires_at) where status = 'active';
create index member_listings_product_idx on public.member_listings (product_id);
create index member_listings_variant_idx on public.member_listings (variant_id);
create index member_listings_removed_by_idx on public.member_listings (removed_by);

create trigger set_updated_at before update on public.member_listings
  for each row execute function private.set_updated_at();

alter table public.member_listings enable row level security;

create policy "Sellers and staff see listings" on public.member_listings
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

revoke all on public.member_listings from anon, authenticated;
grant select on public.member_listings to authenticated;
grant all on public.member_listings to service_role;

-- ── Deals ──────────────────────────────────────────────────────────────────

create table public.member_deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.member_listings (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  -- 'buy' at the listed price, or an 'offer' below it.
  kind text not null check (kind in ('buy', 'offer')),
  note text check (char_length(note) <= 1000),
  status public.member_deal_status not null,
  expires_at timestamptz not null,
  answered_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.member_deals is
  'A buyer''s purchase or offer on a person''s listing, and its outcome. Written only by functions.';

-- One live deal per buyer per listing, and one accepted deal per listing.
create unique index member_deals_live_idx on public.member_deals (listing_id, buyer_id)
  where status in ('sent', 'accepted');
create unique index member_deals_accepted_idx on public.member_deals (listing_id)
  where status = 'accepted';
create index member_deals_buyer_idx on public.member_deals (buyer_id, created_at desc);
create index member_deals_due_idx on public.member_deals (expires_at) where status = 'sent';

create trigger set_updated_at before update on public.member_deals
  for each row execute function private.set_updated_at();

alter table public.member_deals enable row level security;

create policy "Buyers, sellers and staff see deals" on public.member_deals
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1 from public.member_listings l
      where l.id = listing_id and l.user_id = (select auth.uid())
    )
    or (select private.is_staff())
  );

revoke all on public.member_deals from anon, authenticated;
grant select on public.member_deals to authenticated;
grant all on public.member_deals to service_role;

-- ── Messages ───────────────────────────────────────────────────────────────

create table public.member_messages (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.member_deals (id) on delete cascade,
  from_seller boolean not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp()
);

comment on table public.member_messages is
  'Messages between a buyer and a seller about one deal, passed on by The IDEA. Written only by send_member_message.';

create index member_messages_deal_idx on public.member_messages (deal_id, id);
create index member_messages_author_idx on public.member_messages (author_id);

alter table public.member_messages enable row level security;

create policy "Both sides and staff see messages" on public.member_messages
  for select to authenticated
  using (exists (select 1 from public.member_deals d where d.id = deal_id));

revoke all on public.member_messages from anon, authenticated;
grant all on public.member_messages to service_role;
grant select (id, deal_id, from_seller, body, created_at) on public.member_messages to authenticated;

-- ── Photos ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-listing-photos', 'member-listing-photos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Whether the caller may see a listing's photo: anyone while it's live; its
-- seller, support and the buyers it has dealt with at any time.
create function private.can_see_listing_photo(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.member_listings l
    where path = any (l.photos)
      and (
        l.status = 'active'
        or l.user_id = (select auth.uid())
        or private.has_staff_role('{support}')
        or exists (
          select 1 from public.member_deals d
          where d.listing_id = l.id and d.buyer_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function private.can_see_listing_photo(text) from public;
grant execute on function private.can_see_listing_photo(text) to anon, authenticated;

create policy "Sellers upload photos of their listings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Listing photos while they can be seen"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'member-listing-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.can_see_listing_photo(name))
    )
  );

create policy "Sellers delete photos of their listings"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── Helpers ────────────────────────────────────────────────────────────────

-- Why the caller can't sell or buy between people right now, or null.
create function private.member_trade_problem(member uuid, selling boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when member is null then 'Sign in first'
    when exists (select 1 from public.profiles p where p.id = member and p.banned_at is not null)
      then 'Account suspended'
    when not private.is_adult(member)
      then case when selling then 'You need to be 18 or over to sell' else 'You need to be 18 or over to buy from people' end
    when selling and not private.identity_verified(member) then 'Verify your identity first'
    when not selling and (select s.require_verified_phone from public.store_settings s)
      and not private.has_verified_phone(member)
      then 'Verify your phone number first'
  end;
$$;

revoke all on function private.member_trade_problem(uuid, boolean) from public, anon, authenticated;

-- Ends the live deals on a listing that is no longer for sale: waiting offers
-- are declined and an accepted deal is cancelled, and their buyers are told.
create function private.end_member_deals(listing public.member_listings)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.member_deals;
begin
  for d in
    update public.member_deals set
      status = case when status = 'accepted' then 'cancelled' else 'declined' end::public.member_deal_status,
      answered_at = coalesce(answered_at, now()),
      finished_at = case when status = 'accepted' then now() else finished_at end
    where listing_id = listing.id and status in ('sent', 'accepted')
    returning *
  loop
    perform private.notify(
      d.buyer_id, 'order',
      case when d.status = 'cancelled' then 'member_deal_cancelled' else 'member_offer_declined' end,
      jsonb_build_object('listing_id', listing.id, 'number', listing.number, 'title', listing.title),
      '/pass/selling#buying'
    );
  end loop;
end;
$$;

revoke all on function private.end_member_deals(public.member_listings) from public, anon, authenticated;

-- ── Listing ────────────────────────────────────────────────────────────────

create function private.create_member_listing(
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean default false,
  variant uuid default null
)
returns public.member_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  problem text := private.member_trade_problem(caller, true);
  version public.product_variants;
  made public.member_listings;
begin
  if problem is not null then
    raise exception '%', problem using errcode = case
      when caller is null or problem = 'Account suspended' then 'insufficient_privilege'
      else 'check_violation'
    end;
  end if;
  if (
    select count(*) from public.member_listings l
    where l.user_id = caller and l.status in ('active', 'reserved')
  ) >= 20 then
    raise exception 'At most 20 live listings' using errcode = 'check_violation';
  end if;
  if cardinality(coalesce(photos, '{}')) not between 3 and 8
    or (select count(distinct f) from unnest(photos) f) <> cardinality(photos)
    or exists (
      select 1 from unnest(photos) f
      where split_part(f, '/', 1) <> caller::text
        or not exists (
          select 1 from storage.objects o where o.bucket_id = 'member-listing-photos' and o.name = f
        )
    )
  then
    raise exception 'Add 3 to 8 photos of the item' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.delivery_zones z
    where z.active and z.governorate = lower(trim(create_member_listing.governorate))
  ) then
    raise exception 'Choose the area the item is in' using errcode = 'check_violation';
  end if;
  if price is null or price < 1000 then
    raise exception 'The price is at least 1,000 IQD' using errcode = 'check_violation';
  end if;
  if variant is not null then
    select * into version from public.product_variants v where v.id = variant;
    if version.id is null then
      raise exception 'Product not found' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.member_listings (
    user_id, product_id, variant_id, title, condition, description, photos, governorate,
    price, accepts_offers
  )
  values (
    caller, version.product_id, version.id, trim(title), condition, trim(description), photos,
    lower(trim(create_member_listing.governorate)), price, coalesce(accepts_offers, false)
  )
  returning * into made;
  return made;
end;
$$;

create function public.create_member_listing(
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean default false,
  variant uuid default null
)
returns public.member_listings
language sql
security invoker
set search_path = ''
as $$
  select private.create_member_listing(
    title, condition, description, photos, governorate, price, accepts_offers, variant
  )
$$;

-- The seller changes the price, offers or description of a live listing.
create function private.update_member_listing(
  target uuid,
  price bigint,
  accepts_offers boolean,
  description text
)
returns public.member_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.member_listings;
begin
  select * into l from public.member_listings x
  where x.id = target and x.user_id = (select auth.uid())
  for update;
  if l.id is null then
    raise exception 'Listing not found' using errcode = 'no_data_found';
  end if;
  if l.status <> 'active' then
    raise exception 'Only a live listing can be changed' using errcode = 'check_violation';
  end if;
  if price is null or price < 1000 then
    raise exception 'The price is at least 1,000 IQD' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(description, ''))) not between 10 and 2000 then
    raise exception 'Describe the item' using errcode = 'check_violation';
  end if;

  update public.member_listings set
    price = update_member_listing.price,
    accepts_offers = coalesce(update_member_listing.accepts_offers, false),
    description = trim(update_member_listing.description)
  where id = target
  returning * into l;
  -- Turning offers off declines the ones waiting.
  if not l.accepts_offers then
    perform private.end_member_deals(l);
  end if;
  return l;
end;
$$;

create function public.update_member_listing(
  target uuid,
  price bigint,
  accepts_offers boolean,
  description text
)
returns public.member_listings
language sql
security invoker
set search_path = ''
as $$ select private.update_member_listing(target, price, accepts_offers, description) $$;

-- The seller takes a listing down; its live deals end.
create function private.remove_member_listing(target uuid)
returns public.member_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.member_listings;
begin
  update public.member_listings set status = 'removed'
  where id = target and user_id = (select auth.uid()) and status in ('active', 'reserved', 'expired')
  returning * into l;
  if l.id is null then
    raise exception 'This listing can''t be removed' using errcode = 'check_violation';
  end if;
  perform private.end_member_deals(l);
  return l;
end;
$$;

create function public.remove_member_listing(target uuid)
returns public.member_listings
language sql
security invoker
set search_path = ''
as $$ select private.remove_member_listing(target) $$;

-- The seller puts an expired listing back for another 30 days.
create function private.renew_member_listing(target uuid)
returns public.member_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  problem text := private.member_trade_problem(caller, true);
  l public.member_listings;
begin
  if problem is not null then
    raise exception '%', problem using errcode = 'check_violation';
  end if;
  if (
    select count(*) from public.member_listings x
    where x.user_id = caller and x.status in ('active', 'reserved')
  ) >= 20 then
    raise exception 'At most 20 live listings' using errcode = 'check_violation';
  end if;
  update public.member_listings set status = 'active', expires_at = now() + interval '30 days'
  where id = target and user_id = caller and status = 'expired'
  returning * into l;
  if l.id is null then
    raise exception 'Only an expired listing can be renewed' using errcode = 'check_violation';
  end if;
  return l;
end;
$$;

create function public.renew_member_listing(target uuid)
returns public.member_listings
language sql
security invoker
set search_path = ''
as $$ select private.renew_member_listing(target) $$;

-- ── Browsing ───────────────────────────────────────────────────────────────

-- Live listings, newest first: for one product, in one area, or matching a
-- search. The seller shows by first name only.
create function private.member_listings_for_sale(
  product uuid default null,
  governorate text default null,
  search text default null
)
returns table (
  id uuid,
  number bigint,
  product_id uuid,
  variant_id uuid,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean,
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.number, l.product_id, l.variant_id, l.title, l.condition, l.description,
    l.photos, l.governorate, l.price, l.accepts_offers, l.expires_at, l.created_at,
    private.first_name(l.user_id), l.user_id is not distinct from (select auth.uid())
  from public.member_listings l
  left join public.products p on p.id = l.product_id
  where l.status = 'active' and l.expires_at > now()
    and (member_listings_for_sale.product is null or l.product_id = member_listings_for_sale.product)
    and (
      member_listings_for_sale.governorate is null
      or l.governorate = lower(trim(member_listings_for_sale.governorate))
    )
    and (
      nullif(trim(coalesce(search, '')), '') is null
      or l.title ilike '%' || replace(replace(replace(trim(search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    and not (p.age_rating is not distinct from 18 and private.is_minor((select auth.uid())))
    and not exists (
      select 1 from public.profiles x where x.id = l.user_id and x.banned_at is not null
    )
  order by l.created_at desc
  limit 200;
$$;

create function public.member_listings_for_sale(
  product uuid default null,
  governorate text default null,
  search text default null
)
returns table (
  id uuid,
  number bigint,
  product_id uuid,
  variant_id uuid,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean,
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  mine boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.member_listings_for_sale(product, governorate, search) $$;

-- One listing by its number: while it's live, or for its seller and the
-- buyers who dealt on it.
create function private.member_listing(listing_number bigint)
returns table (
  id uuid,
  number bigint,
  product_id uuid,
  variant_id uuid,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean,
  status public.member_listing_status,
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.number, l.product_id, l.variant_id, l.title, l.condition, l.description,
    l.photos, l.governorate, l.price, l.accepts_offers, l.status, l.expires_at, l.created_at,
    private.first_name(l.user_id), l.user_id is not distinct from (select auth.uid())
  from public.member_listings l
  left join public.products p on p.id = l.product_id
  where l.number = listing_number
    and not (p.age_rating is not distinct from 18 and private.is_minor((select auth.uid())))
    and (
      (l.status = 'active' and l.expires_at > now()
        and not exists (select 1 from public.profiles x where x.id = l.user_id and x.banned_at is not null))
      or l.user_id = (select auth.uid())
      or exists (
        select 1 from public.member_deals d
        where d.listing_id = l.id and d.buyer_id = (select auth.uid())
      )
    );
$$;

create function public.member_listing(listing_number bigint)
returns table (
  id uuid,
  number bigint,
  product_id uuid,
  variant_id uuid,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  price bigint,
  accepts_offers boolean,
  status public.member_listing_status,
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  mine boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.member_listing(listing_number) $$;

-- The caller's deals, as buyer or seller, with the listing and the other
-- side's first name.
create function private.my_member_deals()
returns table (
  id uuid,
  listing_id uuid,
  listing_number bigint,
  title text,
  photos text[],
  governorate text,
  price bigint,
  listing_status public.member_listing_status,
  amount bigint,
  kind text,
  note text,
  status public.member_deal_status,
  expires_at timestamptz,
  created_at timestamptz,
  selling boolean,
  other_first_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, l.id, l.number, l.title, l.photos, l.governorate, l.price, l.status,
    d.amount, d.kind, d.note, d.status, d.expires_at, d.created_at,
    l.user_id = (select auth.uid()),
    private.first_name(case when l.user_id = (select auth.uid()) then d.buyer_id else l.user_id end)
  from public.member_deals d
  join public.member_listings l on l.id = d.listing_id
  where (d.buyer_id = (select auth.uid()) or l.user_id = (select auth.uid()))
    and d.created_at > now() - interval '90 days'
  order by d.created_at desc
  limit 200;
$$;

create function public.my_member_deals()
returns table (
  id uuid,
  listing_id uuid,
  listing_number bigint,
  title text,
  photos text[],
  governorate text,
  price bigint,
  listing_status public.member_listing_status,
  amount bigint,
  kind text,
  note text,
  status public.member_deal_status,
  expires_at timestamptz,
  created_at timestamptz,
  selling boolean,
  other_first_name text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_member_deals() $$;

-- ── Buying ─────────────────────────────────────────────────────────────────

-- Buys at the price (no amount, or the full price), which reserves the
-- listing, or offers less when the seller allows offers.
create function private.buy_member_listing(target uuid, amount bigint default null, note text default null)
returns public.member_deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  problem text := private.member_trade_problem(caller, false);
  l public.member_listings;
  buying boolean;
  made public.member_deals;
begin
  if problem is not null then
    raise exception '%', problem using errcode = case
      when caller is null or problem = 'Account suspended' then 'insufficient_privilege'
      else 'check_violation'
    end;
  end if;
  select * into l from public.member_listings x where x.id = target for update;
  if l.id is null or l.status <> 'active' or l.expires_at <= now() then
    raise exception 'This item isn''t for sale' using errcode = 'check_violation';
  end if;
  if l.user_id = caller then
    raise exception 'You can''t buy your own item' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.member_deals d
    where d.listing_id = target and d.buyer_id = caller and d.status in ('sent', 'accepted')
  ) then
    raise exception 'You already have an offer on this' using errcode = 'unique_violation';
  end if;
  if (
    select count(*) from public.member_deals d where d.buyer_id = caller and d.status = 'sent'
  ) >= 10 then
    raise exception 'At most 10 offers waiting at once' using errcode = 'check_violation';
  end if;
  buying := amount is null or amount >= l.price;
  if not buying and (not l.accepts_offers or amount <= 0) then
    raise exception 'This item is sold at its price' using errcode = 'check_violation';
  end if;

  insert into public.member_deals (listing_id, buyer_id, amount, kind, note, status, expires_at, answered_at)
  values (
    target, caller, case when buying then l.price else amount end,
    case when buying then 'buy' else 'offer' end,
    nullif(left(trim(coalesce(note, '')), 1000), ''),
    case when buying then 'accepted' else 'sent' end::public.member_deal_status,
    case when buying then now() else least(l.expires_at, now() + interval '72 hours') end,
    case when buying then now() end
  )
  returning * into made;

  if buying then
    update public.member_listings set status = 'reserved' where id = target;
    update public.member_deals set status = 'declined', answered_at = now()
    where listing_id = target and status = 'sent';
  end if;
  perform private.notify(
    l.user_id, 'order', case when buying then 'member_listing_bought' else 'member_offer_received' end,
    jsonb_build_object('listing_id', l.id, 'number', l.number, 'title', l.title, 'amount', made.amount),
    '/pass/selling#listings'
  );
  return made;
end;
$$;

create function public.buy_member_listing(target uuid, amount bigint default null, note text default null)
returns public.member_deals
language sql
security invoker
set search_path = ''
as $$ select private.buy_member_listing(target, amount, note) $$;

-- The buyer takes back an offer still waiting for the seller.
create function private.withdraw_member_deal(target uuid)
returns public.member_deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.member_deals;
begin
  update public.member_deals set status = 'withdrawn'
  where id = target and buyer_id = (select auth.uid()) and status = 'sent'
  returning * into d;
  if d.id is null then
    raise exception 'Only an offer waiting for an answer can be withdrawn' using errcode = 'check_violation';
  end if;
  return d;
end;
$$;

create function public.withdraw_member_deal(target uuid)
returns public.member_deals
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_member_deal(target) $$;

-- The seller accepts an offer (reserving the listing and declining the
-- rest) or declines it.
create function private.answer_member_deal(target uuid, accept boolean)
returns public.member_deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.member_deals;
  l public.member_listings;
begin
  select * into d from public.member_deals x where x.id = target for update;
  select * into l from public.member_listings x where x.id = d.listing_id for update;
  if d.id is null or l.user_id is distinct from (select auth.uid()) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if d.status <> 'sent' or d.expires_at <= now() or l.status <> 'active' then
    raise exception 'This offer can''t be answered now' using errcode = 'check_violation';
  end if;

  update public.member_deals set
    status = case when accept then 'accepted' else 'declined' end::public.member_deal_status,
    answered_at = now()
  where id = target
  returning * into d;
  if accept then
    update public.member_listings set status = 'reserved' where id = l.id;
    update public.member_deals set status = 'declined', answered_at = now()
    where listing_id = l.id and id <> target and status = 'sent';
  end if;
  perform private.notify(
    d.buyer_id, 'order', case when accept then 'member_offer_accepted' else 'member_offer_declined' end,
    jsonb_build_object('listing_id', l.id, 'number', l.number, 'title', l.title, 'amount', d.amount),
    '/pass/selling#buying'
  );
  return d;
end;
$$;

create function public.answer_member_deal(target uuid, accept boolean)
returns public.member_deals
language sql
security invoker
set search_path = ''
as $$ select private.answer_member_deal(target, accept) $$;

-- After a deal is agreed: the seller marks the item sold, or either side
-- calls it off and the listing is live again (or expired, if its time ran
-- out).
create function private.finish_member_deal(target uuid, done boolean)
returns public.member_deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.member_deals;
  l public.member_listings;
  seller boolean;
begin
  select * into d from public.member_deals x where x.id = target for update;
  select * into l from public.member_listings x where x.id = d.listing_id for update;
  seller := l.user_id = (select auth.uid());
  if d.id is null or not (seller or d.buyer_id = (select auth.uid())) then
    raise exception 'Deal not found' using errcode = 'no_data_found';
  end if;
  if d.status <> 'accepted' then
    raise exception 'Only an agreed sale can be finished' using errcode = 'check_violation';
  end if;
  if done and not seller then
    raise exception 'The seller marks the item sold' using errcode = 'check_violation';
  end if;

  update public.member_deals set
    status = case when done then 'completed' else 'cancelled' end::public.member_deal_status,
    finished_at = now()
  where id = target
  returning * into d;
  update public.member_listings set
    status = case
      when done then 'sold'
      when expires_at <= now() then 'expired'
      else 'active'
    end::public.member_listing_status,
    sold_at = case when done then now() end
  where id = l.id;

  perform private.notify(
    case when seller then d.buyer_id else l.user_id end, 'order',
    case when done then 'member_deal_completed' else 'member_deal_cancelled' end,
    jsonb_build_object('listing_id', l.id, 'number', l.number, 'title', l.title),
    case when seller then '/pass/selling#buying' else '/pass/selling#listings' end
  );
  return d;
end;
$$;

create function public.finish_member_deal(target uuid, done boolean)
returns public.member_deals
language sql
security invoker
set search_path = ''
as $$ select private.finish_member_deal(target, done) $$;

-- ── Messages ───────────────────────────────────────────────────────────────

-- Writes to the other side about a deal, while it waits or once agreed.
create function private.send_member_message(target uuid, body text)
returns public.member_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  d public.member_deals;
  l public.member_listings;
  seller boolean;
  made public.member_messages;
begin
  select * into d from public.member_deals x where x.id = target;
  select * into l from public.member_listings x where x.id = d.listing_id;
  seller := l.user_id = caller;
  if d.id is null or not (seller or d.buyer_id = caller) then
    raise exception 'Deal not found' using errcode = 'no_data_found';
  end if;
  if d.status not in ('sent', 'accepted') then
    raise exception 'This deal is closed' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles p where p.id = caller and p.banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if char_length(trim(coalesce(body, ''))) not between 1 and 2000 then
    raise exception 'Write a message' using errcode = 'check_violation';
  end if;

  insert into public.member_messages (deal_id, from_seller, author_id, body)
  values (target, seller, caller, trim(body))
  returning * into made;

  perform private.notify(
    case when seller then d.buyer_id else l.user_id end, 'order', 'member_message',
    jsonb_build_object('listing_id', l.id, 'number', l.number, 'title', l.title),
    case when seller then '/pass/selling#buying' else '/pass/selling#listings' end
  );
  return made;
end;
$$;

create function public.send_member_message(target uuid, body text)
returns public.member_messages
language sql
security invoker
set search_path = ''
as $$ select private.send_member_message(target, body) $$;

-- ── Support ────────────────────────────────────────────────────────────────

-- Support take down a listing that breaks the selling policy, saying why;
-- its live deals end and the seller is told.
create function private.take_down_member_listing(target uuid, reason text)
returns public.member_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.member_listings;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if char_length(trim(coalesce(reason, ''))) not between 5 and 500 then
    raise exception 'Say why' using errcode = 'check_violation';
  end if;
  update public.member_listings set
    status = 'removed', removed_reason = trim(reason), removed_by = (select auth.uid())
  where id = target and status in ('active', 'reserved', 'expired')
  returning * into l;
  if l.id is null then
    raise exception 'This listing can''t be taken down' using errcode = 'check_violation';
  end if;
  perform private.end_member_deals(l);
  perform private.notify(
    l.user_id, 'order', 'member_listing_removed',
    jsonb_build_object('listing_id', l.id, 'number', l.number, 'title', l.title, 'reason', l.removed_reason),
    '/pass/selling#listings'
  );
  return l;
end;
$$;

create function public.take_down_member_listing(target uuid, reason text)
returns public.member_listings
language sql
security invoker
set search_path = ''
as $$ select private.take_down_member_listing(target, reason) $$;

-- ── Deadlines ──────────────────────────────────────────────────────────────

-- The API's cron: offers past their 72 hours and live listings past their
-- 30 days expire. Returns how many listings expired.
create function private.sweep_member_listings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired integer;
begin
  update public.member_deals set status = 'expired'
  where status = 'sent' and expires_at <= now();
  update public.member_listings set status = 'expired'
  where status = 'active' and expires_at <= now();
  get diagnostics expired = row_count;
  return expired;
end;
$$;

create function public.sweep_member_listings()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.sweep_member_listings() $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid) from public, anon;
revoke all on function public.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid) from public, anon;
grant execute on function private.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid) to authenticated;
grant execute on function public.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid) to authenticated;

revoke all on function private.update_member_listing(uuid, bigint, boolean, text) from public, anon;
revoke all on function public.update_member_listing(uuid, bigint, boolean, text) from public, anon;
grant execute on function private.update_member_listing(uuid, bigint, boolean, text) to authenticated;
grant execute on function public.update_member_listing(uuid, bigint, boolean, text) to authenticated;

revoke all on function private.remove_member_listing(uuid) from public, anon;
revoke all on function public.remove_member_listing(uuid) from public, anon;
grant execute on function private.remove_member_listing(uuid) to authenticated;
grant execute on function public.remove_member_listing(uuid) to authenticated;

revoke all on function private.renew_member_listing(uuid) from public, anon;
revoke all on function public.renew_member_listing(uuid) from public, anon;
grant execute on function private.renew_member_listing(uuid) to authenticated;
grant execute on function public.renew_member_listing(uuid) to authenticated;

revoke all on function private.member_listings_for_sale(uuid, text, text) from public;
revoke all on function public.member_listings_for_sale(uuid, text, text) from public;
grant execute on function private.member_listings_for_sale(uuid, text, text) to anon, authenticated;
grant execute on function public.member_listings_for_sale(uuid, text, text) to anon, authenticated;

revoke all on function private.member_listing(bigint) from public;
revoke all on function public.member_listing(bigint) from public;
grant execute on function private.member_listing(bigint) to anon, authenticated;
grant execute on function public.member_listing(bigint) to anon, authenticated;

revoke all on function private.my_member_deals() from public, anon;
revoke all on function public.my_member_deals() from public, anon;
grant execute on function private.my_member_deals() to authenticated;
grant execute on function public.my_member_deals() to authenticated;

revoke all on function private.buy_member_listing(uuid, bigint, text) from public, anon;
revoke all on function public.buy_member_listing(uuid, bigint, text) from public, anon;
grant execute on function private.buy_member_listing(uuid, bigint, text) to authenticated;
grant execute on function public.buy_member_listing(uuid, bigint, text) to authenticated;

revoke all on function private.withdraw_member_deal(uuid) from public, anon;
revoke all on function public.withdraw_member_deal(uuid) from public, anon;
grant execute on function private.withdraw_member_deal(uuid) to authenticated;
grant execute on function public.withdraw_member_deal(uuid) to authenticated;

revoke all on function private.answer_member_deal(uuid, boolean) from public, anon;
revoke all on function public.answer_member_deal(uuid, boolean) from public, anon;
grant execute on function private.answer_member_deal(uuid, boolean) to authenticated;
grant execute on function public.answer_member_deal(uuid, boolean) to authenticated;

revoke all on function private.finish_member_deal(uuid, boolean) from public, anon;
revoke all on function public.finish_member_deal(uuid, boolean) from public, anon;
grant execute on function private.finish_member_deal(uuid, boolean) to authenticated;
grant execute on function public.finish_member_deal(uuid, boolean) to authenticated;

revoke all on function private.send_member_message(uuid, text) from public, anon;
revoke all on function public.send_member_message(uuid, text) from public, anon;
grant execute on function private.send_member_message(uuid, text) to authenticated;
grant execute on function public.send_member_message(uuid, text) to authenticated;

revoke all on function private.take_down_member_listing(uuid, text) from public, anon;
revoke all on function public.take_down_member_listing(uuid, text) from public, anon;
grant execute on function private.take_down_member_listing(uuid, text) to authenticated;
grant execute on function public.take_down_member_listing(uuid, text) to authenticated;

revoke all on function private.sweep_member_listings() from public, anon, authenticated;
revoke all on function public.sweep_member_listings() from public, anon, authenticated;
grant execute on function private.sweep_member_listings() to service_role;
grant execute on function public.sweep_member_listings() to service_role;
