-- Store trust (owner decisions of 4 November 2026, PR 2): what the website
-- needs to show a shop's record honestly and the copy a buyer gets.
--
-- * `sellers.score_lines`: how many order lines the shop's 90-day score is
--   built on, refreshed with it, so a shop with no orders yet shows as new
--   rather than as "100%".
-- * `seller_offers.photos`: a shop's own photos of a listing that isn't new
--   (open box, refurbished, used), 3 to 10, set with `set_offer_photos`.
--   Product pages show them beside the condition (`offer_photos`).
-- Schema only: the website and Partners use it in the next change.

-- ── The lines behind a shop's score ───────────────────────────────────────

alter table public.sellers
  add column score_lines integer not null default 0 check (score_lines >= 0);

comment on column public.sellers.score_lines is
  'The order lines in 90 days that `score` is built on, refreshed with it; 0 means the shop has no record yet.';

create function private.seller_score_lines(shop uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.order_items i
  where i.seller_id = shop and i.ready_by > now() - interval '90 days'
$$;

revoke all on function private.seller_score_lines(uuid) from public, anon, authenticated;

create or replace function public.refresh_seller_scores()
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
    score_lines = private.seller_score_lines(s.id),
    score_updated_at = now()
  where not s.is_house;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.refresh_seller_scores() from public, anon, authenticated;
grant execute on function public.refresh_seller_scores() to service_role;

-- ── Photos of a listing that isn't new ────────────────────────────────────

alter table public.seller_offers
  add column photos text[] not null default '{}'
    check (cardinality(photos) <= 10);

comment on column public.seller_offers.photos is
  'The shop''s own photos of this copy (open box, refurbished or used): none, or 3 to 10. Never on new listings.';

create function private.set_offer_photos(offer uuid, photos text[])
returns public.seller_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.seller_offers;
  photo text;
begin
  select * into listing from public.seller_offers o where o.id = offer for update;
  if listing.id is null or not private.can_list_for(listing.seller_id) then
    raise exception 'Only owners and admins of the shop can add photos to its listing'
      using errcode = '42501';
  end if;
  if listing.condition = 'new' then
    raise exception 'New listings use the product''s pictures' using errcode = 'check_violation';
  end if;
  photos := coalesce(photos, '{}');
  if cardinality(photos) <> 0 and cardinality(photos) not between 3 and 10 then
    raise exception 'Add 3 to 10 photos of the copy' using errcode = 'check_violation';
  end if;
  foreach photo in array photos loop
    if photo !~ '^https://' then
      raise exception 'Photos are uploaded images' using errcode = 'check_violation';
    end if;
  end loop;
  update public.seller_offers o set photos = set_offer_photos.photos, updated_at = now()
  where o.id = offer
  returning * into listing;
  return listing;
end;
$$;

create function public.set_offer_photos(offer uuid, photos text[])
returns public.seller_offers
language sql
security invoker
set search_path = ''
as $$ select private.set_offer_photos(offer, photos) $$;

comment on function public.set_offer_photos(uuid, text[]) is
  'A shop''s owners and admins set the photos of a listing that isn''t new: none, or 3 to 10.';

revoke all on function private.set_offer_photos(uuid, text[]) from public, anon;
revoke all on function public.set_offer_photos(uuid, text[]) from public, anon;
grant execute on function private.set_offer_photos(uuid, text[]) to authenticated;
grant execute on function public.set_offer_photos(uuid, text[]) to authenticated;

-- The photos product pages show: active listings of approved shops that
-- have them, never The IDEA's own (its copies use the product's pictures).
create function private.offer_photos(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  seller_id uuid,
  photos text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.variant_id, o.condition, o.seller_id, o.photos
  from public.seller_offers o
  join public.product_variants v on v.id = o.variant_id
  join public.sellers s on s.id = o.seller_id
  where v.product_id = offer_product
    and o.active
    and o.condition <> 'new'
    and cardinality(o.photos) > 0
    and s.status = 'approved'
    and not s.is_house
$$;

create function public.offer_photos(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  seller_id uuid,
  photos text[]
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.offer_photos(offer_product) $$;

comment on function public.offer_photos(uuid) is
  'The shops'' own photos of a product''s listings that aren''t new, for its page.';

revoke all on function private.offer_photos(uuid) from public;
revoke all on function public.offer_photos(uuid) from public;
grant execute on function private.offer_photos(uuid) to anon, authenticated, service_role;
grant execute on function public.offer_photos(uuid) to anon, authenticated, service_role;
