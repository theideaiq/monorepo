-- Get offers from shops (28 October brief, step 14; the selling policy,
-- section 14): instead of listing an item, a member describes it and shops
-- send offers to buy it.
--
-- * A member (18 or over, with a verified phone while
--   `require_verified_phone` is on) asks for offers on one item
--   (`create_sell_request`): a product from the catalog or a title, its
--   condition, a description, 3 to 8 photos (the private
--   `sell-request-photos` bucket, "<user id>/…") and the area it's in. A
--   request is open for 7 days; a member has at most 5 open.
-- * Approved shops (owners and admins) see open requests with the member's
--   first name and area only (`open_sell_requests`), and send one offer
--   each (`make_sell_offer`): an amount, how they check the item (they
--   collect it, or the member brings it to a branch), how they pay (cash or
--   transfer) and a note. An offer stands for 72 hours, or until the
--   request closes; a shop may withdraw it while it waits.
-- * The member accepts one offer or none (`answer_sell_offer`,
--   `close_sell_request`); accepting declines the others. The shop that
--   made it is the buyer: The IDEA passes on the offers and the messages
--   (`send_sell_message`), but doesn't buy, price or guarantee anything,
--   and takes no fee. The shop marks the sale done, or either side calls
--   it off (`finish_sell_offer`).
-- * No contact details pass between them; they arrange the hand-over in
--   the messages. `sweep_sell_requests` (the API's cron) expires what's
--   due.

create type public.sell_request_status as enum ('open', 'accepted', 'completed', 'closed', 'expired');
create type public.sell_offer_status as enum (
  'sent', 'accepted', 'declined', 'withdrawn', 'expired', 'completed', 'cancelled'
);

-- ── Requests ───────────────────────────────────────────────────────────────

create table public.sell_requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- What it is, when it isn't in the catalog (or to add to what is).
  title text not null check (char_length(trim(title)) between 2 and 200),
  condition public.product_condition not null,
  description text not null check (char_length(trim(description)) between 10 and 2000),
  -- Paths in `sell-request-photos`, under the member's folder.
  photos text[] not null check (cardinality(photos) between 3 and 8),
  -- Where the item is (a delivery zone's governorate).
  governorate text not null check (char_length(governorate) between 2 and 60),
  status public.sell_request_status not null default 'open',
  expires_at timestamptz not null default now() + interval '7 days',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sell_requests is
  'A member asking shops for offers on one of their items. Seen by the member and staff; shops see open ones through open_sell_requests, without the member''s identity.';

create index sell_requests_user_idx on public.sell_requests (user_id, created_at desc);
create index sell_requests_open_idx on public.sell_requests (expires_at) where status = 'open';
create index sell_requests_product_idx on public.sell_requests (product_id);
create index sell_requests_variant_idx on public.sell_requests (variant_id);

create trigger set_updated_at before update on public.sell_requests
  for each row execute function private.set_updated_at();

alter table public.sell_requests enable row level security;

create policy "Members and staff see requests" on public.sell_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

revoke all on public.sell_requests from anon, authenticated;
grant select on public.sell_requests to authenticated;
grant all on public.sell_requests to service_role;

-- ── Offers ─────────────────────────────────────────────────────────────────

create table public.sell_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sell_requests (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  amount bigint not null check (amount > 0),
  -- The shop collects the item, or the member brings it to a branch.
  check_method text not null check (check_method in ('collect', 'drop_off')),
  pay_method text not null check (pay_method in ('cash', 'transfer')),
  note text check (char_length(note) <= 1000),
  status public.sell_offer_status not null default 'sent',
  expires_at timestamptz not null,
  answered_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sell_offers is
  'A shop''s offer to buy a member''s item: amount, how it checks the item and pays, and the outcome. Written only by functions.';

-- One live offer per shop per request.
create unique index sell_offers_live_idx on public.sell_offers (request_id, seller_id)
  where status in ('sent', 'accepted');
create index sell_offers_seller_idx on public.sell_offers (seller_id, status, created_at desc);
create index sell_offers_due_idx on public.sell_offers (expires_at) where status = 'sent';
create index sell_offers_created_by_idx on public.sell_offers (created_by);

create trigger set_updated_at before update on public.sell_offers
  for each row execute function private.set_updated_at();

alter table public.sell_offers enable row level security;

create policy "Members, shops and staff see offers" on public.sell_offers
  for select to authenticated
  using (
    (select private.can_see_seller(seller_id))
    or exists (
      select 1 from public.sell_requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
  );

revoke all on public.sell_offers from anon, authenticated;
grant select on public.sell_offers to authenticated;
grant all on public.sell_offers to service_role;

-- ── Messages ───────────────────────────────────────────────────────────────

create table public.sell_messages (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.sell_offers (id) on delete cascade,
  -- Written by the shop (its people) or the member.
  from_shop boolean not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp()
);

comment on table public.sell_messages is
  'Messages between a member and a shop about one offer, passed on by The IDEA. Written only by send_sell_message.';

create index sell_messages_offer_idx on public.sell_messages (offer_id, id);
create index sell_messages_author_idx on public.sell_messages (author_id);

alter table public.sell_messages enable row level security;

create policy "Both sides and staff see messages" on public.sell_messages
  for select to authenticated
  using (exists (select 1 from public.sell_offers o where o.id = offer_id));

revoke all on public.sell_messages from anon, authenticated;
grant all on public.sell_messages to service_role;

-- The message's author stays private: each side sees "you" or the other side.
grant select (id, offer_id, from_shop, body, created_at) on public.sell_messages to authenticated;

-- ── Photos ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sell-request-photos', 'sell-request-photos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Whether the caller works at an approved shop (not The IDEA).
create function private.works_at_a_shop()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sellers s
    where s.status = 'approved' and not s.is_house and s.organization_id is not null
      and private.is_org_member(s.organization_id)
  );
$$;

-- Whether the caller may see a request's photo: its member, staff, or a
-- shop while the request is open (or after its offer was accepted).
create function private.can_see_sell_photo(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sell_requests r
    where path = any (r.photos)
      and (
        r.user_id = (select auth.uid())
        or private.has_staff_role('{support}')
        or (r.status = 'open' and private.works_at_a_shop())
        or exists (
          select 1 from public.sell_offers o
          where o.request_id = r.id and o.status in ('accepted', 'completed')
            and private.can_see_seller(o.seller_id)
        )
      )
  );
$$;

revoke all on function private.works_at_a_shop() from public, anon;
revoke all on function private.can_see_sell_photo(text) from public, anon;
grant execute on function private.works_at_a_shop() to authenticated;
grant execute on function private.can_see_sell_photo(text) to authenticated;

create policy "Members upload photos of their items"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sell-request-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members, shops and support see item photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sell-request-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.can_see_sell_photo(name))
    )
  );

create policy "Members delete photos of their items"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sell-request-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── Asking for offers ──────────────────────────────────────────────────────

create function private.create_sell_request(
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  variant uuid default null
)
returns public.sell_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  version public.product_variants;
  made public.sell_requests;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles p where p.id = caller and p.banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_adult(caller) then
    raise exception 'You need to be 18 or over to sell' using errcode = 'check_violation';
  end if;
  if (select s.require_verified_phone from public.store_settings s)
    and not private.has_verified_phone(caller)
  then
    raise exception 'Verify your phone number first' using errcode = 'check_violation';
  end if;
  if (
    select count(*) from public.sell_requests r where r.user_id = caller and r.status = 'open'
  ) >= 5 then
    raise exception 'At most 5 open requests' using errcode = 'check_violation';
  end if;
  if cardinality(coalesce(photos, '{}')) not between 3 and 8
    or (select count(distinct f) from unnest(photos) f) <> cardinality(photos)
    or exists (
      select 1 from unnest(photos) f
      where split_part(f, '/', 1) <> caller::text
        or not exists (
          select 1 from storage.objects o where o.bucket_id = 'sell-request-photos' and o.name = f
        )
    )
  then
    raise exception 'Add 3 to 8 photos of the item' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.delivery_zones z
    where z.active and z.governorate = lower(trim(create_sell_request.governorate))
  ) then
    raise exception 'Choose the area the item is in' using errcode = 'check_violation';
  end if;
  if variant is not null then
    select * into version from public.product_variants v where v.id = variant;
    if version.id is null then
      raise exception 'Product not found' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.sell_requests (
    user_id, product_id, variant_id, title, condition, description, photos, governorate
  )
  values (
    caller, version.product_id, version.id, trim(title), condition, trim(description), photos,
    lower(trim(create_sell_request.governorate))
  )
  returning * into made;
  return made;
end;
$$;

create function public.create_sell_request(
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  variant uuid default null
)
returns public.sell_requests
language sql
security invoker
set search_path = ''
as $$ select private.create_sell_request(title, condition, description, photos, governorate, variant) $$;

-- The member ends a request without choosing an offer.
create function private.close_sell_request(target uuid)
returns public.sell_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.sell_requests;
begin
  update public.sell_requests set status = 'closed', closed_at = now()
  where id = target and user_id = (select auth.uid()) and status = 'open'
  returning * into r;
  if r.id is null then
    raise exception 'This request isn''t open' using errcode = 'check_violation';
  end if;
  update public.sell_offers set status = 'declined', answered_at = now()
  where request_id = target and status = 'sent';
  return r;
end;
$$;

create function public.close_sell_request(target uuid)
returns public.sell_requests
language sql
security invoker
set search_path = ''
as $$ select private.close_sell_request(target) $$;

-- ── What shops see ─────────────────────────────────────────────────────────

-- Open requests for a shop: the item, its photos and area, the member's
-- first name, and the shop's own live offer if it made one.
create function private.open_sell_requests(seller uuid)
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
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  offer_id uuid,
  offer_amount bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.number, r.product_id, r.variant_id, r.title, r.condition, r.description,
    r.photos, r.governorate, r.expires_at, r.created_at, private.first_name(r.user_id),
    o.id, o.amount
  from public.sell_requests r
  join public.sellers s on s.id = seller
  left join public.sell_offers o
    on o.request_id = r.id and o.seller_id = seller and o.status = 'sent'
  where r.status = 'open' and r.expires_at > now()
    and s.status = 'approved' and not s.is_house
    and private.can_see_seller(seller)
    -- Never the shop's own people's items.
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id = s.organization_id and m.user_id = r.user_id
    )
  order by r.created_at desc
  limit 200;
$$;

create function public.open_sell_requests(seller uuid)
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
  expires_at timestamptz,
  created_at timestamptz,
  first_name text,
  offer_id uuid,
  offer_amount bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_sell_requests(seller) $$;

-- ── Offers ─────────────────────────────────────────────────────────────────

create function private.make_sell_offer(
  request uuid,
  seller uuid,
  amount bigint,
  check_method text,
  pay_method text,
  note text default null
)
returns public.sell_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.sell_requests;
  shop public.sellers;
  made public.sell_offers;
begin
  select * into shop from public.sellers s where s.id = seller;
  if shop.id is null or shop.is_house or shop.status <> 'approved' or not private.can_list_for(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into r from public.sell_requests x where x.id = request for update;
  if r.id is null or r.status <> 'open' or r.expires_at <= now() then
    raise exception 'This request isn''t open' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.organization_members m
    where m.organization_id = shop.organization_id and m.user_id = r.user_id
  ) then
    raise exception 'You can''t make an offer on your own item' using errcode = 'check_violation';
  end if;
  if amount is null or amount <= 0 then
    raise exception 'Offer an amount' using errcode = 'check_violation';
  end if;
  if check_method not in ('collect', 'drop_off') or pay_method not in ('cash', 'transfer') then
    raise exception 'Say how you check the item and pay' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.sell_offers o
    where o.request_id = request and o.seller_id = seller and o.status in ('sent', 'accepted')
  ) then
    raise exception 'Your shop already has an offer on this' using errcode = 'unique_violation';
  end if;

  insert into public.sell_offers (
    request_id, seller_id, amount, check_method, pay_method, note, expires_at, created_by
  )
  values (
    request, seller, amount, check_method, pay_method,
    nullif(left(trim(coalesce(note, '')), 1000), ''),
    least(r.expires_at, now() + interval '72 hours'), (select auth.uid())
  )
  returning * into made;

  perform private.notify(
    r.user_id, 'order', 'sell_offer_received',
    jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title, 'amount', amount, 'shop', shop.name),
    '/pass/selling#offers'
  );
  return made;
end;
$$;

create function public.make_sell_offer(
  request uuid,
  seller uuid,
  amount bigint,
  check_method text,
  pay_method text,
  note text default null
)
returns public.sell_offers
language sql
security invoker
set search_path = ''
as $$ select private.make_sell_offer(request, seller, amount, check_method, pay_method, note) $$;

-- The shop takes back an offer still waiting for the member.
create function private.withdraw_sell_offer(target uuid)
returns public.sell_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sell_offers;
begin
  select * into o from public.sell_offers x where x.id = target for update;
  if o.id is null or not private.can_list_for(o.seller_id) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if o.status <> 'sent' then
    raise exception 'Only an offer waiting for an answer can be withdrawn' using errcode = 'check_violation';
  end if;
  update public.sell_offers set status = 'withdrawn' where id = target returning * into o;
  return o;
end;
$$;

create function public.withdraw_sell_offer(target uuid)
returns public.sell_offers
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_sell_offer(target) $$;

-- The member accepts an offer (declining the rest) or declines it.
create function private.answer_sell_offer(target uuid, accept boolean)
returns public.sell_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sell_offers;
  r public.sell_requests;
  shop public.sellers;
begin
  select * into o from public.sell_offers x where x.id = target for update;
  select * into r from public.sell_requests x where x.id = o.request_id for update;
  if o.id is null or r.user_id is distinct from (select auth.uid()) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if o.status <> 'sent' or o.expires_at <= now() or r.status <> 'open' then
    raise exception 'This offer can''t be answered now' using errcode = 'check_violation';
  end if;
  select * into shop from public.sellers s where s.id = o.seller_id;

  if not accept then
    update public.sell_offers set status = 'declined', answered_at = now()
    where id = target returning * into o;
    return o;
  end if;

  update public.sell_offers set status = 'accepted', answered_at = now()
  where id = target returning * into o;
  update public.sell_offers set status = 'declined', answered_at = now()
  where request_id = r.id and id <> target and status = 'sent';
  update public.sell_requests set status = 'accepted' where id = r.id;
  perform private.notify_org_admins(
    shop.organization_id, 'sell_offer_accepted',
    jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title, 'amount', o.amount),
    '/selling/get-offers'
  );
  return o;
end;
$$;

create function public.answer_sell_offer(target uuid, accept boolean)
returns public.sell_offers
language sql
security invoker
set search_path = ''
as $$ select private.answer_sell_offer(target, accept) $$;

-- After an accepted offer: the shop marks the sale done, or either side
-- calls it off.
create function private.finish_sell_offer(target uuid, done boolean)
returns public.sell_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sell_offers;
  r public.sell_requests;
  shop public.sellers;
  member boolean;
begin
  select * into o from public.sell_offers x where x.id = target for update;
  select * into r from public.sell_requests x where x.id = o.request_id for update;
  member := r.user_id = (select auth.uid());
  if o.id is null or not (member or private.can_list_for(o.seller_id)) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if o.status <> 'accepted' then
    raise exception 'Only an accepted offer can be finished' using errcode = 'check_violation';
  end if;
  if done and member then
    raise exception 'The shop marks the sale done' using errcode = 'check_violation';
  end if;
  select * into shop from public.sellers s where s.id = o.seller_id;

  update public.sell_offers set
    status = case when done then 'completed' else 'cancelled' end::public.sell_offer_status,
    finished_at = now()
  where id = target
  returning * into o;
  update public.sell_requests set
    status = case when done then 'completed' else 'closed' end::public.sell_request_status,
    closed_at = now()
  where id = r.id;

  if member then
    perform private.notify_org_admins(
      shop.organization_id, 'sell_offer_cancelled',
      jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title),
      '/selling/get-offers'
    );
  else
    perform private.notify(
      r.user_id, 'order', case when done then 'sell_offer_completed' else 'sell_offer_cancelled' end,
      jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title, 'shop', shop.name),
      '/pass/selling#offers'
    );
  end if;
  return o;
end;
$$;

create function public.finish_sell_offer(target uuid, done boolean)
returns public.sell_offers
language sql
security invoker
set search_path = ''
as $$ select private.finish_sell_offer(target, done) $$;

-- ── Messages ───────────────────────────────────────────────────────────────

-- Writes to the other side about an offer, while it waits or once accepted.
create function private.send_sell_message(target uuid, body text)
returns public.sell_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  o public.sell_offers;
  r public.sell_requests;
  shop public.sellers;
  member boolean;
  made public.sell_messages;
begin
  select * into o from public.sell_offers x where x.id = target;
  select * into r from public.sell_requests x where x.id = o.request_id;
  member := r.user_id = caller;
  if o.id is null or not (member or private.can_list_for(o.seller_id)) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if o.status not in ('sent', 'accepted') then
    raise exception 'This offer is closed' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(body, ''))) not between 1 and 2000 then
    raise exception 'Write a message' using errcode = 'check_violation';
  end if;
  select * into shop from public.sellers s where s.id = o.seller_id;

  insert into public.sell_messages (offer_id, from_shop, author_id, body)
  values (target, not member, caller, trim(body))
  returning * into made;

  if member then
    perform private.notify_org_admins(
      shop.organization_id, 'sell_message',
      jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title),
      '/selling/get-offers'
    );
  else
    perform private.notify(
      r.user_id, 'order', 'sell_message',
      jsonb_build_object('request_id', r.id, 'number', r.number, 'title', r.title, 'shop', shop.name),
      '/pass/selling#offers'
    );
  end if;
  return made;
end;
$$;

create function public.send_sell_message(target uuid, body text)
returns public.sell_messages
language sql
security invoker
set search_path = ''
as $$ select private.send_sell_message(target, body) $$;

-- ── Deadlines ──────────────────────────────────────────────────────────────

-- The API's cron: offers past their 72 hours and requests past their 7
-- days expire. Returns how many requests expired.
create function public.sweep_sell_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired integer;
begin
  update public.sell_offers set status = 'expired'
  where status = 'sent' and expires_at <= now();
  update public.sell_requests set status = 'expired', closed_at = now()
  where status = 'open' and expires_at <= now();
  get diagnostics expired = row_count;
  return expired;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.create_sell_request(text, public.product_condition, text, text[], text, uuid) from public, anon;
revoke all on function public.create_sell_request(text, public.product_condition, text, text[], text, uuid) from public, anon;
grant execute on function private.create_sell_request(text, public.product_condition, text, text[], text, uuid) to authenticated;
grant execute on function public.create_sell_request(text, public.product_condition, text, text[], text, uuid) to authenticated;

revoke all on function private.close_sell_request(uuid) from public, anon;
revoke all on function public.close_sell_request(uuid) from public, anon;
grant execute on function private.close_sell_request(uuid) to authenticated;
grant execute on function public.close_sell_request(uuid) to authenticated;

revoke all on function private.open_sell_requests(uuid) from public, anon;
revoke all on function public.open_sell_requests(uuid) from public, anon;
grant execute on function private.open_sell_requests(uuid) to authenticated;
grant execute on function public.open_sell_requests(uuid) to authenticated;

revoke all on function private.make_sell_offer(uuid, uuid, bigint, text, text, text) from public, anon;
revoke all on function public.make_sell_offer(uuid, uuid, bigint, text, text, text) from public, anon;
grant execute on function private.make_sell_offer(uuid, uuid, bigint, text, text, text) to authenticated;
grant execute on function public.make_sell_offer(uuid, uuid, bigint, text, text, text) to authenticated;

revoke all on function private.withdraw_sell_offer(uuid) from public, anon;
revoke all on function public.withdraw_sell_offer(uuid) from public, anon;
grant execute on function private.withdraw_sell_offer(uuid) to authenticated;
grant execute on function public.withdraw_sell_offer(uuid) to authenticated;

revoke all on function private.answer_sell_offer(uuid, boolean) from public, anon;
revoke all on function public.answer_sell_offer(uuid, boolean) from public, anon;
grant execute on function private.answer_sell_offer(uuid, boolean) to authenticated;
grant execute on function public.answer_sell_offer(uuid, boolean) to authenticated;

revoke all on function private.finish_sell_offer(uuid, boolean) from public, anon;
revoke all on function public.finish_sell_offer(uuid, boolean) from public, anon;
grant execute on function private.finish_sell_offer(uuid, boolean) to authenticated;
grant execute on function public.finish_sell_offer(uuid, boolean) to authenticated;

revoke all on function private.send_sell_message(uuid, text) from public, anon;
revoke all on function public.send_sell_message(uuid, text) from public, anon;
grant execute on function private.send_sell_message(uuid, text) to authenticated;
grant execute on function public.send_sell_message(uuid, text) to authenticated;

revoke all on function public.sweep_sell_requests() from public, anon, authenticated;
grant execute on function public.sweep_sell_requests() to service_role;
