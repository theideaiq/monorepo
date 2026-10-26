-- Program revision v1, step 3: catalogue fixes.
--
-- * Six categories, each a filter on /store: Music · Games · Books · Films ·
--   Audio · Tech. Gaming becomes Games; cameras, gadgets, laptops and
--   phones fold into Tech.
-- * An age rating (PEGI 3, 7, 12, 16 or 18) on products, set for every
--   game; under-18 Passes will hide PEGI 18 items (step 4).
-- * Prices moved into the revision's bands by format and edition:
--     games      released in the last 6 months 99,750, up to 2 years
--                79,750, older 59,750;
--     books      Arabic paperbacks 14,750, other paperbacks 19,750;
--     films      Blu-ray 29,750 (4K 44,750);
--     vinyl      54,750 up to 89,750: coloured editions from 69,750,
--                nothing above 89,750; used copies 24,750 to 44,750;
--     CDs        19,750, new releases (2025 on) 24,750; special editions
--                (signed, multi-disc, CD+DVD) keep their price; used
--                copies 9,750 to 14,750.
--   Consoles, accessories, hi-fi and cameras keep their prices (they are
--   priced from cost). Open-box copies are never dearer than 75% of the
--   new price, rounded down to the store's …4,750 / …9,750 steps.
-- * The two 250 IQD placeholders get real prices.
-- * Drafts with a photo and a copy in stock are published; the rest stay
--   drafts.
-- * One copy of each Nintendo Switch game for sale is moved to rent.
--
-- On a fresh local database (migrations run before the seed) every step
-- finds nothing to change.

-- ── Categories ─────────────────────────────────────────────────────────────

update public.product_categories
set slug = 'games', name_en = 'Games', name_ar = 'الألعاب'
where slug = 'gaming'
  and not exists (select 1 from public.product_categories where slug = 'games');

insert into public.product_categories (slug, name_ar, name_en, position)
select 'tech', 'التقنية', 'Tech', 6
where exists (
  select 1 from public.product_categories
  where slug in ('cameras', 'gadgets', 'laptops', 'phones')
)
on conflict (slug) do nothing;

update public.products p
set category_id = (select id from public.product_categories where slug = 'tech')
from public.product_categories c
where c.id = p.category_id
  and c.slug in ('cameras', 'gadgets', 'laptops', 'phones')
  and exists (select 1 from public.product_categories where slug = 'tech');

delete from public.product_categories
where slug in ('cameras', 'gadgets', 'laptops', 'phones')
  and exists (select 1 from public.product_categories where slug = 'tech');

update public.product_categories c
set position = o.position
from (values
  ('music', 1), ('games', 2), ('books', 3), ('films', 4), ('audio', 5), ('tech', 6)
) as o (slug, position)
where c.slug = o.slug;

-- ── Age ratings ────────────────────────────────────────────────────────────

alter table public.products
  add column age_rating smallint check (age_rating in (3, 7, 12, 16, 18));

comment on column public.products.age_rating is
  'PEGI age rating (3, 7, 12, 16 or 18) shown on the product page; null when it has none.';

update public.products p
set age_rating = r.rating
from (values
  ('alan-wake-2', 18), ('animal-crossing-new-horizons', 3),
  ('assassins-creed-mirage', 18), ('astro-bot', 7), ('baldurs-gate-3', 18),
  ('black-myth-wukong', 16), ('cyberpunk-2077', 18),
  ('death-stranding-2', 18), ('death-stranding-directors-cut', 18),
  ('demons-souls', 16), ('diablo-iv', 18), ('final-fantasy-vii-rebirth', 16),
  ('final-fantasy-xvi', 18), ('ghost-of-tsushima-directors-cut', 18),
  ('ghost-of-yotei', 18), ('god-of-war-ragnarok', 18),
  ('gran-turismo-7', 3), ('grand-theft-auto-v', 18), ('hogwarts-legacy', 16),
  ('horizon-forbidden-west', 16), ('it-takes-two', 12), ('lies-of-p', 16),
  ('mario-kart-8-deluxe', 3), ('marvels-spider-man-2', 16),
  ('mortal-kombat-1', 18), ('ratchet-clank-rift-apart', 7),
  ('red-dead-redemption-2', 18), ('resident-evil-4', 18),
  ('resident-evil-village', 18), ('returnal', 16),
  ('sackboy-a-big-adventure', 7), ('star-wars-jedi-survivor', 16),
  ('stellar-blade', 18), ('street-fighter-6', 12),
  ('super-smash-bros-ultimate', 12), ('tekken-8', 16),
  ('the-last-of-us-part-i', 18), ('the-last-of-us-part-ii-remastered', 18),
  ('zelda-tears-of-the-kingdom', 12),
  ('uncharted-legacy-of-thieves-collection', 16)
) as r (slug, rating)
where p.slug = r.slug;

-- ── Price bands ────────────────────────────────────────────────────────────

-- The largest store price (…4,750 or …9,750) at or below `amount`.
create function pg_temp.price_step(amount numeric)
returns bigint
language sql
immutable
as $$ select (floor((amount - 4750) / 5000) * 5000 + 4750)::bigint $$;

create temporary table band_prices (
  variant_id uuid primary key,
  old_price bigint not null,
  new_price bigint not null
) on commit drop;

-- Games, by release date (26 Oct 2026: two years back is 26 Oct 2024).
insert into band_prices
select v.id, v.price, g.price
from (values
  ('alan-wake-2', 59750), ('animal-crossing-new-horizons', 59750),
  ('assassins-creed-mirage', 59750), ('astro-bot', 59750),
  ('baldurs-gate-3', 59750), ('black-myth-wukong', 59750),
  ('cyberpunk-2077', 59750), ('death-stranding-2', 79750),
  ('death-stranding-directors-cut', 59750), ('demons-souls', 59750),
  ('diablo-iv', 59750), ('final-fantasy-vii-rebirth', 59750),
  ('final-fantasy-xvi', 59750), ('ghost-of-tsushima-directors-cut', 59750),
  ('ghost-of-yotei', 79750), ('god-of-war-ragnarok', 59750),
  ('gran-turismo-7', 59750), ('grand-theft-auto-v', 59750),
  ('hogwarts-legacy', 59750), ('horizon-forbidden-west', 59750),
  ('it-takes-two', 59750), ('lies-of-p', 59750),
  ('mario-kart-8-deluxe', 59750), ('marvels-spider-man-2', 59750),
  ('mortal-kombat-1', 59750), ('ratchet-clank-rift-apart', 59750),
  ('red-dead-redemption-2', 59750), ('resident-evil-4', 59750),
  ('resident-evil-village', 59750), ('returnal', 59750),
  ('sackboy-a-big-adventure', 59750), ('star-wars-jedi-survivor', 59750),
  ('stellar-blade', 59750), ('street-fighter-6', 59750),
  ('super-smash-bros-ultimate', 59750), ('tekken-8', 59750),
  ('the-last-of-us-part-i', 59750), ('the-last-of-us-part-ii-remastered', 59750),
  ('zelda-tears-of-the-kingdom', 59750),
  ('uncharted-legacy-of-thieves-collection', 59750)
) as g (slug, price)
join public.products p on p.slug = g.slug
join public.product_variants v on v.product_id = p.id;

-- Books: Arabic paperbacks 14,750, the others 19,750.
insert into band_prices
select v.id, v.price,
  case when p.slug in (
    'azazeel', 'frankenstein-in-baghdad', 'men-in-the-sun', 'palace-walk',
    'season-of-migration-to-the-north', 'the-bamboo-stalk'
  ) then 14750 else 19750 end
from public.products p
join public.product_categories c on c.id = p.category_id and c.slug = 'books'
join public.product_variants v on v.product_id = p.id
on conflict (variant_id) do nothing;

-- Films: Blu-ray 29,750, 4K 44,750.
insert into band_prices
select v.id, v.price,
  case when coalesce(v.attributes ->> 'Format', p.details ->> 'Format') ~* '4k|uhd'
    then 44750 else 29750 end
from public.products p
join public.product_categories c on c.id = p.category_id and c.slug = 'films'
join public.product_variants v on v.product_id = p.id
on conflict (variant_id) do nothing;

-- Music: vinyl and CDs (cassettes keep their price).
insert into band_prices
select v.id, v.price,
  case
    when format = 'vinyl' and coloured then least(greatest(v.price, 69750), 89750)
    when format = 'vinyl' then least(greatest(v.price, 54750), 89750)
    when special then v.price
    when released >= 2025 then 24750
    else least(greatest(v.price, 19750), 24750)
  end
from (
  select v.*,
    lower(coalesce(v.attributes ->> 'Format', p.details ->> 'Format')) as format,
    coalesce(p.details ->> 'Edition', '') ~* '\m(blue|red|gold|clear|pink|green|yellow|orange|purple|white|colou?red|splatter|marble)\M'
      or v.attributes ? 'Color' as coloured,
    coalesce(p.details ->> 'Edition', '') ~* 'signed|2cd|cd\+dvd|\mbox\M' as special,
    substring(p.details ->> 'Released' from '\d{4}')::int as released
  from public.products p
  join public.product_categories c on c.id = p.category_id and c.slug = 'music'
  join public.product_variants v on v.product_id = p.id
) as v
where v.format in ('vinyl', 'cd')
on conflict (variant_id) do nothing;

-- The two placeholder prices.
insert into band_prices
select v.id, v.price, f.price
from (values ('final-audio-a4000', 224750), ('frank-ocean-orange', 19750)) as f (slug, price)
join public.products p on p.slug = f.slug
join public.product_variants v on v.product_id = p.id
on conflict (variant_id) do update set new_price = excluded.new_price;

update public.product_variants v
set price = b.new_price,
  compare_at_price = case when v.compare_at_price > b.new_price then v.compare_at_price end
from band_prices b
where b.variant_id = v.id and b.new_price <> b.old_price;

-- Copies priced on their own: used ones into their band, open-box ones
-- never dearer than 75% of new.
update public.stock_items s
set price = case
    when s.condition = 'open_box' then least(s.price, pg_temp.price_step(v.price * 0.75))
    when format = 'vinyl' then least(greatest(s.price, 24750), 44750)
    when format = 'cd' then least(greatest(s.price, 9750), 14750)
    else s.price
  end
from (
  select v.id, v.price,
    lower(coalesce(v.attributes ->> 'Format', p.details ->> 'Format')) as format
  from public.product_variants v
  join public.products p on p.id = v.product_id
) as v
where v.id = s.variant_id
  and s.purpose = 'sale'
  and s.price is not null
  and s.condition in ('open_box', 'used')
  and s.variant_id in (select variant_id from band_prices);

-- ── Drafts ─────────────────────────────────────────────────────────────────

update public.products p
set status = 'active'
where p.status = 'draft'
  and coalesce(array_length(p.images, 1), 0) > 0
  and exists (
    select 1 from public.stock_items s
    where s.product_id = p.id and s.status = 'available' and s.purpose = 'sale'
  );

-- ── Nintendo Switch games to rent ──────────────────────────────────────────

update public.stock_items s
set purpose = 'rental'
where s.id in (
  select distinct on (s.product_id) s.id
  from public.stock_items s
  join public.products p on p.id = s.product_id
  where p.slug in (
    'mario-kart-8-deluxe', 'super-smash-bros-ultimate',
    'zelda-tears-of-the-kingdom', 'animal-crossing-new-horizons'
  )
    and s.purpose = 'sale' and s.status = 'available' and s.condition = 'new'
    and (
      select count(*) from public.stock_items o
      where o.product_id = s.product_id and o.purpose = 'sale' and o.status = 'available'
    ) > 1
    and not exists (
      select 1 from public.stock_items o
      where o.product_id = s.product_id and o.purpose = 'rental'
    )
  order by s.product_id, s.created_at desc
);
