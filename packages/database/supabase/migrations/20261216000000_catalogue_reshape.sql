-- The catalogue reshape (variants, part 3).
--
-- Until now every version of a title was its own product: "Adele – 21 (CD)",
-- "Adele – 21 (Vinyl)", "Adele – 21 (CD)" open box, and a game or book once
-- to buy and once to rent. Here they become one product per title:
--
-- * Versions (CD, vinyl, cassette, Blu-ray, PS5, Switch, colours) are the
--   product's variants, labelled in Arabic and English, with the format,
--   platform or colour in their attributes.
-- * Condition is the copy's: open-box and used items become copies of their
--   title's variant, priced on their own. The 7 open-box copies that cost as
--   much as new or more drop to 75% of the new price (to the store's next
--   lower step, …4,750 or …9,750).
-- * A title sold and rented is one shop product with copies for rent
--   (`products.rentable`); the Rent tab lists every rentable product.
-- * Categories: "Vinyl records" and "CDs and cassettes" become Music; the
--   rental categories fold into Games, Books and the new Films. A category
--   no longer has a kind: each tab shows the categories it has products in
--   (`listed_categories`).
-- * `products.group_key` ("other formats") is gone: they're variants now.
--
-- The plan below is the grouping list confirmed on 2026-10-25 (old slug →
-- new slug, name and version). Old addresses (…-cd, …-vinyl, …-open-box,
-- …-rental) stop working; there are no redirects. Products not in the plan,
-- or databases without them (CI, local), are left as they are.

-- ── Rentable products ──────────────────────────────────────────────────────

alter table public.products
  add column rentable boolean not null default false;

comment on column public.products.rentable is
  'Listed on the Rent tab: a rental item, or a product with copies for rent (kept by sync_stock_counts).';

create index products_rentable_listing_idx
  on public.products (status, created_at desc) where rentable;

-- Recomputes a variant's counts and its product's from their available
-- copies (live variants only, for the product), and whether the product can
-- be rented. The flag tells the count triggers that this write comes from
-- here, not from someone setting a count.
create or replace function private.sync_stock_counts(target_product uuid, target_variant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('idea.stock_sync', 'on', true);

  if target_variant is not null then
    update public.product_variants v set
      stock_count = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'sale'
      ),
      rental_stock = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'rental'
      )
    where v.id = target_variant;
  end if;

  update public.products p set
    stock_count = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id
        and v.active
        and s.status = 'available'
        and s.purpose = case when p.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose
    ),
    rental_stock = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.status = 'available' and s.purpose = 'rental'
    ),
    rentable = p.kind = 'rental' or exists (
      select 1 from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.purpose = 'rental'
        and s.status in ('available', 'reserved', 'rented', 'repair')
    )
  where p.id = target_product;

  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

update public.products set rentable = true where kind = 'rental';
update public.products p set rentable = true
where exists (
  select 1 from public.stock_items s
  where s.product_id = p.id and s.purpose = 'rental'
    and s.status in ('available', 'reserved', 'rented', 'repair')
);

-- ── Categories ─────────────────────────────────────────────────────────────

-- Moves the products of `source` into `target` and deletes `source`.
create function pg_temp.fold_category(source text, target text)
returns void
language sql
as $$
  update public.products set category_id = (select id from public.product_categories where slug = target)
  where category_id = (select id from public.product_categories where slug = source)
    and exists (select 1 from public.product_categories where slug = target);
  delete from public.product_categories
  where slug = source and exists (select 1 from public.product_categories where slug = target);
$$;

insert into public.product_categories (slug, name_ar, name_en, kind, position, bulb_multiplier, affiliate_rate)
select 'music', 'الموسيقى', 'Music', 'sale', c.position, c.bulb_multiplier, c.affiliate_rate
from public.product_categories c where c.slug = 'vinyl'
on conflict (slug) do nothing;

insert into public.product_categories (slug, name_ar, name_en, kind, position, bulb_multiplier, affiliate_rate)
select 'films', 'الأفلام', 'Films', 'sale', c.position, c.bulb_multiplier, c.affiliate_rate
from public.product_categories c where c.slug = 'rent-films'
on conflict (slug) do nothing;

select pg_temp.fold_category('vinyl', 'music');
select pg_temp.fold_category('cds-and-cassettes', 'music');
select pg_temp.fold_category('rent-games', 'gaming');
select pg_temp.fold_category('rent-books', 'books');
select pg_temp.fold_category('rent-films', 'films');

-- ── The plan ───────────────────────────────────────────────────────────────

create temporary table reshape_plan (
  old_slug text primary key,
  new_slug text not null,
  name_en text not null,
  name_ar text not null,
  version text not null,
  -- A new price for this item's copies (the open-box ones above new).
  copy_price bigint
) on commit drop;

create temporary table reshape_versions (
  version text primary key,
  label_en text,
  label_ar text,
  attributes jsonb not null,
  position integer not null
) on commit drop;

insert into reshape_versions values
  ('Default', null, null, '{}', 0),
  ('Vinyl', 'Vinyl', 'أسطوانة فينيل', '{"Format": "Vinyl"}', 1),
  ('Vinyl (blue)', 'Blue vinyl', 'أسطوانة فينيل زرقاء', '{"Format": "Vinyl", "Color": "Blue"}', 2),
  ('CD', 'CD', 'قرص CD', '{"Format": "CD"}', 3),
  ('Cassette', 'Cassette', 'كاسيت', '{"Format": "Cassette"}', 4),
  ('Blu-ray', 'Blu-ray', 'Blu-ray', '{"Format": "Blu-ray"}', 5),
  ('PS5', 'PS5', 'PS5', '{"Platform": "PS5"}', 6),
  ('Switch', 'Nintendo Switch', 'Nintendo Switch', '{"Platform": "Nintendo Switch"}', 7),
  ('black', 'Black', 'أسود', '{"Color": "Black"}', 8),
  ('blue', 'Blue', 'أزرق', '{"Color": "Blue"}', 9),
  ('brown', 'Brown', 'بني', '{"Color": "Brown"}', 10);

insert into reshape_plan (old_slug, new_slug, name_en, name_ar, version, copy_price) values
  ('a-thousand-splendid-suns-rental', 'a-thousand-splendid-suns', 'A Thousand Splendid Suns – Khaled Hosseini', 'ألف شمس ساطعة – خالد حسيني', 'Default', null),
  ('aaron-parks-little-big-cd-used', 'aaron-parks-little-big', 'Aaron Parks – Little Big', 'Aaron Parks – Little Big', 'CD', null),
  ('abba-vinyl', 'abba', 'ABBA', 'ABBA', 'Vinyl', null),
  ('abba-super-trouper-vinyl', 'abba-super-trouper', 'ABBA – Super Trouper', 'ABBA – Super Trouper', 'Vinyl', null),
  ('abba-the-album-vinyl-open-box', 'abba-the-album', 'ABBA – The Album', 'ABBA – The Album', 'Vinyl', null),
  ('abba-the-singles-vinyl-open-box', 'abba-the-singles', 'ABBA – The Singles', 'ABBA – The Singles', 'Vinyl', null),
  ('abba-the-visitors-cd', 'abba-the-visitors', 'ABBA – The Visitors', 'ABBA – The Visitors', 'CD', null),
  ('abba-the-visitors-vinyl', 'abba-the-visitors', 'ABBA – The Visitors', 'ABBA – The Visitors', 'Vinyl', null),
  ('ac-dc-blow-up-your-video-vinyl', 'ac-dc-blow-up-your-video', 'AC/DC – Blow Up Your Video', 'AC/DC – Blow Up Your Video', 'Vinyl', null),
  ('ac-dc-dirty-deeds-done-dirt-cheap-cd-open-box', 'ac-dc-dirty-deeds-done-dirt-cheap', 'AC/DC – Dirty Deeds Done Dirt Cheap', 'AC/DC – Dirty Deeds Done Dirt Cheap', 'CD', null),
  ('ac-dc-flick-of-the-switch-vinyl-open-box', 'ac-dc-flick-of-the', 'AC/DC – Flick of the Switch', 'AC/DC – Flick of the Switch', 'Vinyl', null),
  ('ac-dc-live-cd-open-box', 'ac-dc-live', 'AC/DC – Live', 'AC/DC – Live', 'CD', null),
  ('adele-19-cd-used', 'adele-19', 'Adele – 19', 'Adele – 19', 'CD', null),
  ('adele-19-vinyl', 'adele-19', 'Adele – 19', 'Adele – 19', 'Vinyl', null),
  ('adele-21-cd', 'adele-21', 'Adele – 21', 'Adele – 21', 'CD', null),
  ('adele-21-cd-open-box', 'adele-21', 'Adele – 21', 'Adele – 21', 'CD', null),
  ('adele-21-vinyl', 'adele-21', 'Adele – 21', 'Adele – 21', 'Vinyl', null),
  ('adele-25-cd', 'adele-25', 'Adele – 25', 'Adele – 25', 'CD', null),
  ('adele-25-cd-open-box', 'adele-25', 'Adele – 25', 'Adele – 25', 'CD', null),
  ('adele-25-vinyl', 'adele-25', 'Adele – 25', 'Adele – 25', 'Vinyl', null),
  ('akai-gx-4400d', 'akai-gx-4400d', 'Akai GX-4400D reel-to-reel tape deck', 'مسجّل بكرات Akai GX-4400D', 'Default', null),
  ('akai-gx-630d', 'akai-gx-630d', 'Akai GX-630D reel-to-reel tape deck', 'مسجّل بكرات Akai GX-630D', 'Default', null),
  ('akai-gx-747', 'akai-gx-747', 'Akai GX-747 reel-to-reel tape deck', 'مسجّل بكرات Akai GX-747', 'Default', null),
  ('alan-wake-2-ps5-rental', 'alan-wake-2', 'Alan Wake 2', 'Alan Wake 2', 'PS5', null),
  ('alfa-mist-antiphon-cd-used', 'alfa-mist-antiphon', 'Alfa Mist – Antiphon', 'Alfa Mist – Antiphon', 'CD', null),
  ('alfa-mist-bring-backs-cd-used', 'alfa-mist-bring-backs', 'Alfa Mist – Bring Backs', 'Alfa Mist – Bring Backs', 'CD', null),
  ('alfa-mist-structuralism-cd-used', 'alfa-mist-structuralism', 'Alfa Mist – Structuralism', 'Alfa Mist – Structuralism', 'CD', null),
  ('amazon-echo-dot-5th-gen', 'amazon-echo-dot-5th-gen', 'Amazon Echo Dot (5th Gen)', 'Amazon Echo Dot (الجيل الخامس)', 'Default', null),
  ('ambrose-akinmusire-origami-harvest-cd-used', 'ambrose-akinmusire-origami-harvest', 'Ambrose Akinmusire – Origami Harvest', 'Ambrose Akinmusire – Origami Harvest', 'CD', null),
  ('amy-macdonald-this-is-the-life-cd-open-box', 'amy-macdonald-this-is-the-life', 'Amy Macdonald – This is the Life', 'Amy Macdonald – This is the Life', 'CD', null),
  ('amy-winehouse-vinyl', 'amy-winehouse', 'Amy Winehouse', 'Amy Winehouse', 'Vinyl', null),
  ('amy-winehouse-back-to-black-cd', 'amy-winehouse-back-to', 'Amy Winehouse – Back to Black', 'Amy Winehouse – Back to Black', 'CD', null),
  ('amy-winehouse-frank-cd', 'amy-winehouse-frank', 'Amy Winehouse – Frank', 'Amy Winehouse – Frank', 'CD', null),
  ('animal-crossing-new-horizons', 'animal-crossing-new-horizons', 'Animal Crossing: New Horizons', 'Animal Crossing: New Horizons', 'Switch', null),
  ('antonio-sanchez-channels-of-energy-cd-used', 'antonio-sanchez-channels-of-energy', 'Antonio Sánchez – Channels of Energy', 'Antonio Sánchez – Channels of Energy', 'CD', null),
  ('arctic-monkeys-am-vinyl', 'arctic-monkeys-am', 'Arctic Monkeys – AM', 'Arctic Monkeys – AM', 'Vinyl', null),
  ('ariana-grande-eternal-sunshine-vinyl', 'ariana-grande-eternal-sunshine', 'Ariana Grande – Eternal Sunshine', 'Ariana Grande – Eternal Sunshine', 'Vinyl', null),
  ('ariana-grande-sweetener-cd', 'ariana-grande-sweetener', 'Ariana Grande – Sweetener', 'Ariana Grande – Sweetener', 'CD', null),
  ('ariana-grande-thank-u-next-vinyl', 'ariana-grande-thank-u-next', 'Ariana Grande – Thank U, Next', 'Ariana Grande – Thank U, Next', 'Vinyl', null),
  ('asap-rocky-at-long-last-asap-vinyl', 'asap-rocky-at-long-last-asap', 'A$AP Rocky – At. Long. Last. A$AP', 'A$AP Rocky – At. Long. Last. A$AP', 'Vinyl', null),
  ('ashley-henry-beautiful-vinyl-hunter-cd-used', 'ashley-henry-beautiful-vinyl-hunter', 'Ashley Henry – Beautiful Vinyl Hunter', 'Ashley Henry – Beautiful Vinyl Hunter', 'CD', null),
  ('ashley-henry-easter-cd-used', 'ashley-henry-easter', 'Ashley Henry – Easter', 'Ashley Henry – Easter', 'CD', null),
  ('assassins-creed-mirage-ps5-rental', 'assassins-creed-mirage', 'Assassin''s Creed Mirage', 'Assassin''s Creed Mirage', 'PS5', null),
  ('astro-bot-ps5', 'astro-bot', 'Astro Bot', 'Astro Bot', 'PS5', null),
  ('astro-bot-ps5-rental', 'astro-bot', 'Astro Bot', 'Astro Bot', 'PS5', null),
  ('atomic-habits-book', 'atomic-habits', 'Atomic Habits – James Clear', 'العادات الذرية – جيمس كلير', 'Default', null),
  ('atomic-habits-rental', 'atomic-habits', 'Atomic Habits – James Clear', 'العادات الذرية – جيمس كلير', 'Default', null),
  ('attack-on-titan-season-3-ost-cd', 'attack-on-titan-season-3-ost', 'Attack on Titan Season 3 OST', 'Attack on Titan Season 3 OST', 'CD', null),
  ('audio-technica-at-lp60x', 'audio-technica-at-lp60x', 'Audio-Technica AT-LP60X turntable', 'مشغل أسطوانات Audio-Technica AT-LP60X', 'Default', null),
  ('aurora-vinyl', 'aurora', 'Aurora', 'Aurora', 'Vinyl', null),
  ('aurora-the-gods-we-can-touch-cd', 'aurora-the-gods-we-can-touch', 'Aurora – The Gods We Can Touch', 'Aurora – The Gods We Can Touch', 'CD', null),
  ('avatar-the-way-of-water-blu-ray-rental', 'avatar-the-way-of-water', 'Avatar: The Way of Water', 'Avatar: The Way of Water', 'Blu-ray', null),
  ('avishai-cohen-arvoles-cd-used', 'avishai-cohen-arvoles', 'Avishai Cohen – Arvoles', 'Avishai Cohen – Arvoles', 'CD', null),
  ('avril-lavigne-vinyl', 'avril-lavigne', 'Avril Lavigne', 'Avril Lavigne', 'Vinyl', null),
  ('avril-lavigne-under-my-skin-asian-version-cd-open-box', 'avril-lavigne-under-my-skin-asian-version', 'Avril Lavigne – Under My Skin (Asian Version)', 'Avril Lavigne – Under My Skin (Asian Version)', 'CD', null),
  ('azazeel-rental', 'azazeel', 'Azazeel – Youssef Ziedan', 'عزازيل – يوسف زيدان', 'Default', null),
  ('baldurs-gate-3-ps5-rental', 'baldurs-gate-3', 'Baldur''s Gate 3', 'Baldur''s Gate 3', 'PS5', null),
  ('ben-wendel-the-seasons-cd-used', 'ben-wendel-the-seasons', 'Ben Wendel – The Seasons', 'Ben Wendel – The Seasons', 'CD', null),
  ('bette-midler-experience-the-divine-greatest-hits-cd', 'bette-midler-experience-the-divine-greatest-hits', 'Bette Midler – Experience the Divine: Greatest Hits', 'Bette Midler – Experience the Divine: Greatest Hits', 'CD', null),
  ('beyonce-renaissance-vinyl', 'beyonce-renaissance', 'Beyoncé – RENAISSANCE', 'Beyoncé – RENAISSANCE', 'Vinyl', null),
  ('bill-laurance-swift-cd-used', 'bill-laurance-swift', 'Bill Laurance – Swift', 'Bill Laurance – Swift', 'CD', null),
  ('bill-withers-greatest-hits-vinyl', 'bill-withers-greatest-hits', 'Bill Withers – Greatest Hits', 'Bill Withers – Greatest Hits', 'Vinyl', null),
  ('billie-eilish-vinyl', 'billie-eilish', 'Billie Eilish', 'Billie Eilish', 'Vinyl', null),
  ('billie-eilish-dont-smile-at-me-red-vinyl', 'billie-eilish-dont-smile-at-me-red', 'Billie Eilish – Don''t Smile at Me (red)', 'Billie Eilish – Don''t Smile at Me (red)', 'Vinyl', null),
  ('billie-eilish-happier-than-ever-cd', 'billie-eilish-happier-than-ever', 'Billie Eilish – Happier Than Ever', 'Billie Eilish – Happier Than Ever', 'CD', null),
  ('binker-and-moses-journey-to-the-mountain-of-forever-cd-used', 'binker-and-moses-journey-to-the-mountain-of-forever', 'Binker & Moses – Journey to the Mountain of Forever', 'Binker & Moses – Journey to the Mountain of Forever', 'CD', null),
  ('black-flower-future-flora-cd-used', 'black-flower-future-flora', 'Black Flower – Future Flora', 'Black Flower – Future Flora', 'CD', null),
  ('black-myth-wukong-ps5', 'black-myth-wukong', 'Black Myth: Wukong', 'Black Myth: Wukong', 'PS5', null),
  ('black-myth-wukong-ps5-rental', 'black-myth-wukong', 'Black Myth: Wukong', 'Black Myth: Wukong', 'PS5', null),
  ('blackpink-born-pink-vinyl', 'blackpink-born-pink', 'Blackpink – Born Pink', 'Blackpink – Born Pink', 'Vinyl', null),
  ('blue-lab-beats-xover-cd-used', 'blue-lab-beats-xover', 'Blue Lab Beats – Xover', 'Blue Lab Beats – Xover', 'CD', null),
  ('bob-dylan-the-freewheelin-bob-dylan-vinyl', 'bob-dylan-the-freewheelin-bob-dylan', 'Bob Dylan – The Freewheelin'' Bob Dylan', 'Bob Dylan – The Freewheelin'' Bob Dylan', 'Vinyl', null),
  ('bob-marley-vinyl', 'bob-marley', 'Bob Marley', 'Bob Marley', 'Vinyl', null),
  ('bob-marley-sealed-sealed-vinyl', 'bob-marley-sealed-sealed', 'Bob Marley (sealed) (sealed)', 'Bob Marley (sealed) (sealed)', 'Vinyl', null),
  ('bomb-hip-hop-records-return-of-the-dj-cd-used', 'bomb-hip-hop-records-return-of-the-dj', 'Bomb Hip-Hop Records Return Of The DJ', 'Bomb Hip-Hop Records Return Of The DJ', 'CD', null),
  ('brad-mehldau-finding-gabriel-cd-used', 'brad-mehldau-finding-gabriel', 'Brad Mehldau – Finding Gabriel', 'Brad Mehldau – Finding Gabriel', 'CD', null),
  ('bridget-jones-the-edge-of-reason-ost-cd-open-box', 'bridget-jones-the-edge-of-reason-ost', 'Bridget Jones The Edge of Reason OST', 'Bridget Jones The Edge of Reason OST', 'CD', null),
  ('britney-spears-baby-one-more-time-cd', 'britney-spears-baby-one-more-time', 'Britney Spears – Baby One More Time', 'Britney Spears – Baby One More Time', 'CD', null),
  ('brooklyn-funk-essentials-in-the-buzzbag-cd-used', 'brooklyn-funk-essentials-in-the-buzzbag', 'Brooklyn Funk Essentials – In The BuzzBag', 'Brooklyn Funk Essentials – In The BuzzBag', 'CD', null),
  ('bubsa-runescape-reloaded-parodies-for-runescape-vinyl', 'bubsa-runescape-reloaded-parodies-for-runescape', 'Bubsa – RuneScape Reloaded - Parodies for RuneScape', 'Bubsa – RuneScape Reloaded - Parodies for RuneScape', 'Vinyl', null),
  ('bush-turntable-blue', 'bush-turntable', 'Bush turntable', 'مشغل أسطوانات Bush', 'blue', null),
  ('bush-turntable-brown', 'bush-turntable', 'Bush turntable', 'مشغل أسطوانات Bush', 'brown', null),
  ('byone-turntable', 'byone-turntable', 'ByOne turntable', 'مشغل أسطوانات ByOne', 'Default', null),
  ('camila-cabello-romance-vinyl', 'camila-cabello-romance', 'Camila Cabello – Romance', 'Camila Cabello – Romance', 'Vinyl', null),
  ('canon-eos-1000d', 'canon-eos-1000d', 'Canon EOS 1000D', 'Canon EOS 1000D', 'Default', null),
  ('casio-exilim-zoom-ex-z57', 'casio-exilim-zoom-ex-z57', 'Casio Exilim Zoom EX-Z57', 'Casio Exilim Zoom EX-Z57', 'Default', null),
  ('celine-dion-these-are-special-times-gold-vinyl', 'celine-dion-these-are-special-times-gold', 'Céline Dion – These Are Special Times (gold)', 'Céline Dion – These Are Special Times (gold)', 'Vinyl', null),
  ('childish-gambino-awaken-my-love-blue-vinyl-vinyl', 'childish-gambino-awaken-my-love-blue', 'Childish Gambino – Awaken, My Love! (blue vinyl)', 'Childish Gambino – Awaken, My Love! (blue vinyl)', 'Vinyl', null),
  ('chris-dave-drumhedz-cd-used', 'chris-dave-drumhedz', 'Chris Dave – Drumhedz', 'Chris Dave – Drumhedz', 'CD', null),
  ('chris-potter-circuits-cd-used', 'chris-potter-circuits', 'Chris Potter – Circuits', 'Chris Potter – Circuits', 'CD', null),
  ('christian-scott-ancestral-recall-cd-used', 'christian-scott-ancestral-recall', 'Christian Scott – Ancestral Recall', 'Christian Scott – Ancestral Recall', 'CD', null),
  ('cigarettes-after-sex-vinyl', 'cigarettes-after-sex', 'Cigarettes After Sex', 'Cigarettes After Sex', 'Vinyl', null),
  ('cigarettes-after-sex-cry-cd', 'cigarettes-after-sex-cry', 'Cigarettes After Sex – Cry', 'Cigarettes After Sex – Cry', 'CD', null),
  ('coco-blu-ray-rental', 'coco', 'Coco', 'Coco', 'Blu-ray', null),
  ('coldplay-vinyl', 'coldplay', 'Coldplay', 'Coldplay', 'Vinyl', null),
  ('coldplay-everyday-life-cd-open-box', 'coldplay-everyday-life', 'Coldplay – Everyday Life', 'Coldplay – Everyday Life', 'CD', null),
  ('coldplay-ghost-stories-cd-open-box', 'coldplay-ghost-stories', 'Coldplay – Ghost Stories', 'Coldplay – Ghost Stories', 'CD', null),
  ('coldplay-x-and-y-cd', 'coldplay-x-and-y', 'Coldplay – X&Y', 'Coldplay – X&Y', 'CD', null),
  ('coldplay-x-and-y-cd-open-box', 'coldplay-x-and-y', 'Coldplay – X&Y', 'Coldplay – X&Y', 'CD', 9750),
  ('conan-gray-vinyl', 'conan-gray', 'Conan Gray', 'Conan Gray', 'Vinyl', null),
  ('conan-gray-found-heaven-cd', 'conan-gray-found-heaven', 'Conan Gray – Found Heaven', 'Conan Gray – Found Heaven', 'CD', null),
  ('conan-gray-found-heaven-signed-card-cd', 'conan-gray-found-heaven-signed-card', 'Conan Gray – Found Heaven (Signed Card)', 'Conan Gray – Found Heaven (Signed Card)', 'CD', null),
  ('conan-gray-kid-krow-vinyl', 'conan-gray-kid-krow', 'Conan Gray – Kid Krow', 'Conan Gray – Kid Krow', 'Vinyl', null),
  ('conan-gray-superache-cd', 'conan-gray-superache', 'Conan Gray – Superache', 'Conan Gray – Superache', 'CD', null),
  ('cory-henry-art-of-love-cd-used', 'cory-henry-art-of-love', 'Cory Henry – Art of Love', 'Cory Henry – Art of Love', 'CD', null),
  ('cory-wong-the-optimist-cd-used', 'cory-wong-the-optimist', 'Cory Wong – The Optimist', 'Cory Wong – The Optimist', 'CD', null),
  ('country-nice-n-easy-8-vinyl-box-set-vinyl-open-box', 'country-nice-n-easy-8-vinyl-box-set', 'Country Nice n Easy 8 Vinyl Box Set', 'Country Nice n Easy 8 Vinyl Box Set', 'Vinyl', null),
  ('cream-full-cream-vinyl-open-box', 'cream-full-cream', 'Cream – Full Cream', 'Cream – Full Cream', 'Vinyl', null),
  ('creedence-clearwater-revival-vinyl-open-box', 'creedence-clearwater-revival', 'Creedence Clearwater Revival', 'Creedence Clearwater Revival', 'Vinyl', null),
  ('crime-and-punishment-rental', 'crime-and-punishment', 'Crime and Punishment – Fyodor Dostoevsky', 'الجريمة والعقاب – فيودور دوستويفسكي', 'Default', null),
  ('culture-club-waking-up-with-the-house-on-fire-vinyl-open-box', 'culture-club-waking-up-with-the-house-on-fire', 'Culture Club – Waking Up with the House on Fire', 'Culture Club – Waking Up with the House on Fire', 'Vinyl', null),
  ('cyberpunk-2077-ps5-rental', 'cyberpunk-2077', 'Cyberpunk 2077', 'Cyberpunk 2077', 'PS5', null),
  ('daft-punk-vinyl', 'daft-punk', 'Daft Punk', 'Daft Punk', 'Vinyl', null),
  ('daft-punk-homework-cd-open-box', 'daft-punk-homework', 'Daft Punk – Homework', 'Daft Punk – Homework', 'CD', null),
  ('daft-punk-random-access-memories-vinyl', 'daft-punk-random-access-memories', 'Daft Punk – Random Access Memories', 'Daft Punk – Random Access Memories', 'Vinyl', null),
  ('daryl-hall-and-john-oates-beauty-on-a-back-street-vinyl-open-box', 'daryl-hall-and-john-oates-beauty-on-a-back-street', 'Daryl Hall and John Oates – Beauty on a Back Street', 'Daryl Hall and John Oates – Beauty on a Back Street', 'Vinyl', null),
  ('daryl-hall-and-john-oates-bigger-than-both-of-us-vinyl-open-box', 'daryl-hall-and-john-oates-bigger-than-both-of-us', 'Daryl Hall & John Oates – Bigger Than Both of Us', 'Daryl Hall & John Oates – Bigger Than Both of Us', 'Vinyl', null),
  ('daryl-hall-and-john-oates-h2o-vinyl-open-box', 'daryl-hall-and-john-oates-h2o', 'Daryl Hall & John Oates – H2O', 'Daryl Hall & John Oates – H2O', 'Vinyl', null),
  ('david-bowie-aladdin-sane-vinyl', 'david-bowie-aladdin-sane', 'David Bowie – Aladdin Sane', 'David Bowie – Aladdin Sane', 'Vinyl', null),
  ('david-toop-ocean-of-sound-cd-used', 'david-toop-ocean-of-sound', 'David Toop – Ocean Of Sound', 'David Toop – Ocean Of Sound', 'CD', null),
  ('dead-or-alive-sophisticated-boom-boom-vinyl-open-box', 'dead-or-alive-sophisticated-boom-boom', 'Dead or Alive – Sophisticated Boom Boom', 'Dead or Alive – Sophisticated Boom Boom', 'Vinyl', null),
  ('death-stranding-2-on-the-beach-ps5-rental', 'death-stranding-2', 'Death Stranding 2: On the Beach', 'Death Stranding 2: On the Beach', 'PS5', null),
  ('death-stranding-2-ps5', 'death-stranding-2', 'Death Stranding 2: On the Beach', 'Death Stranding 2: On the Beach', 'PS5', null),
  ('death-stranding-directors-cut-ps5-rental', 'death-stranding-directors-cut', 'Death Stranding Director''s Cut', 'Death Stranding Director''s Cut', 'PS5', null),
  ('deep-work-rental', 'deep-work', 'Deep Work – Cal Newport', 'العمل العميق – كال نيوبورت', 'Default', null),
  ('deftones-around-the-fur-cd-open-box', 'deftones-around-the-fur', 'Deftones – Around the Fur', 'Deftones – Around the Fur', 'CD', null),
  ('demons-souls-ps5-rental', 'demons-souls', 'Demon''s Souls', 'Demon''s Souls', 'PS5', null),
  ('depeche-mode-violator-vinyl', 'depeche-mode-violator', 'Depeche Mode – Violator', 'Depeche Mode – Violator', 'Vinyl', null),
  ('destinys-child-vinyl', 'destinys-child', 'Destiny''s Child', 'Destiny''s Child', 'Vinyl', null),
  ('diablo-iv-ps5-rental', 'diablo-iv', 'Diablo IV', 'Diablo IV', 'PS5', null),
  ('dinosaur-wonder-trail-cd-used', 'dinosaur-wonder-trail', 'Dinosaur – Wonder Trail', 'Dinosaur – Wonder Trail', 'CD', null),
  ('donny-mccaslin-blow-cd-used', 'donny-mccaslin-blow', 'Donny McCaslin – Blow', 'Donny McCaslin – Blow', 'CD', null),
  ('drake-if-youre-reading-this-its-too-late-vinyl', 'drake-if-youre-reading-this-its-too-late', 'Drake – If You''re Reading This It''s Too Late', 'Drake – If You''re Reading This It''s Too Late', 'Vinyl', null),
  ('drake-views-vinyl', 'drake-views', 'Drake – Views', 'Drake – Views', 'Vinyl', null),
  ('dualsense-edge', 'dualsense-edge', 'DualSense Edge wireless controller', 'يد تحكم DualSense Edge', 'Default', null),
  ('dualsense-wireless-controller', 'dualsense-wireless-controller', 'DualSense wireless controller', 'يد تحكم DualSense اللاسلكية', 'Default', null),
  ('dune-rental', 'dune', 'Dune – Frank Herbert', 'كثيب – فرانك هربرت', 'Default', null),
  ('dune-part-two-blu-ray-rental', 'dune-part-two', 'Dune: Part Two', 'Dune: Part Two', 'Blu-ray', null),
  ('eagles-the-long-run-cd', 'eagles-the-long-run', 'Eagles – The Long Run', 'Eagles – The Long Run', 'CD', null),
  ('edith-piaf-vinyl', 'edith-piaf', 'Edith Piaf', 'Edith Piaf', 'Vinyl', null),
  ('edith-piaf-the-legendary-edith-piaf-cd', 'edith-piaf-the-legendary-edith-piaf', 'Édith Piaf – The Legendary Edith Piaf', 'Édith Piaf – The Legendary Edith Piaf', 'CD', null),
  ('educated-rental', 'educated', 'Educated – Tara Westover', 'متعلمة – تارا ويستوفر', 'Default', null),
  ('elton-john-love-songs-cd', 'elton-john-love-songs', 'Elton John – Love Songs', 'Elton John – Love Songs', 'CD', null),
  ('elton-john-something-about-the-way-you-look-tonight-cd-open-box', 'elton-john-something-about-the-way-you-look-tonight', 'Elton John – Something About the Way You Look Tonight', 'Elton John – Something About the Way You Look Tonight', 'CD', null),
  ('elvis-presley-vinyl', 'elvis-presley', 'Elvis Presley', 'Elvis Presley', 'Vinyl', null),
  ('elvis-presley-gold-vinyl', 'elvis-presley-gold', 'Elvis Presley – Gold', 'Elvis Presley – Gold', 'Vinyl', null),
  ('emerson-lake-and-palmer-pictures-at-an-exhibition-vinyl-open-box', 'emerson-lake-and-palmer-pictures-at-an-exhibition', 'Emerson, Lake & Palmer – Pictures at an Exhibition', 'Emerson, Lake & Palmer – Pictures at an Exhibition', 'Vinyl', null),
  ('emerson-lake-and-palmer-trilogy-vinyl-open-box', 'emerson-lake-and-palmer-trilogy', 'Emerson, Lake & Palmer – Trilogy', 'Emerson, Lake & Palmer – Trilogy', 'Vinyl', null),
  ('emile-parisien-double-screening-cd-used', 'emile-parisien-double-screening', 'Émile Parisien – Double Screening', 'Émile Parisien – Double Screening', 'CD', null),
  ('emily-king-scenery-cd-used', 'emily-king-scenery', 'Emily King – Scenery', 'Emily King – Scenery', 'CD', null),
  ('eminem-cd', 'eminem', 'Eminem', 'Eminem', 'CD', null),
  ('eminem-curtain-call-stans-mixtape-bonus-cd-cd', 'eminem-curtain-call-stans-mixtape-bonus', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'CD', null),
  ('eminem-curtain-call-stans-mixtape-bonus-cd-cd-open-box', 'eminem-curtain-call-stans-mixtape-bonus', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'CD', 9750),
  ('eminem-curtain-call-stans-mixtape-bonus-cd-vinyl', 'eminem-curtain-call-stans-mixtape-bonus', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'Eminem – Curtain Call: Stan''s Mixtape (Bonus CD)', 'Vinyl', null),
  ('eminem-music-to-be-murdered-by-vinyl', 'eminem-music-to-be-murdered-by', 'Eminem – Music to Be Murdered By', 'Eminem – Music to Be Murdered By', 'Vinyl', null),
  ('eminem-recovery-vinyl', 'eminem-recovery', 'Eminem – Recovery', 'Eminem – Recovery', 'Vinyl', null),
  ('eminem-relapse-cd-open-box', 'eminem-relapse', 'Eminem – Relapse', 'Eminem – Relapse', 'CD', null),
  ('eminem-relapse-vinyl', 'eminem-relapse', 'Eminem – Relapse', 'Eminem – Relapse', 'Vinyl', null),
  ('eminem-revival-cd-open-box', 'eminem-revival', 'Eminem – Revival', 'Eminem – Revival', 'CD', null),
  ('eminem-stan-cd', 'eminem-stan', 'Eminem – Stan', 'Eminem – Stan', 'CD', null),
  ('eminem-the-marshall-mathers-lp-cd-open-box', 'eminem-the-marshall-mathers-lp', 'Eminem – The Marshall Mathers LP', 'Eminem – The Marshall Mathers LP', 'CD', null),
  ('emma-jean-thackray-yellow-cd-used', 'emma-jean-thackray-yellow', 'Emma-Jean Thackray – Yellow', 'Emma-Jean Thackray – Yellow', 'CD', null),
  ('enya-watermark-cd-open-box', 'enya-watermark', 'Enya – Watermark', 'Enya – Watermark', 'CD', null),
  ('era-cd', 'era', 'Era', 'Era', 'CD', null),
  ('eric-clapton-august-vinyl-open-box', 'eric-clapton-august', 'Eric Clapton – August', 'Eric Clapton – August', 'Vinyl', null),
  ('eric-clapton-just-one-night-vinyl-open-box', 'eric-clapton-just-one-night', 'Eric Clapton – Just One Night', 'Eric Clapton – Just One Night', 'Vinyl', null),
  ('esperanza-spalding-12-little-spells-cd-used', 'esperanza-spalding-12-little-spells', 'Esperanza Spalding – 12 Little Spells', 'Esperanza Spalding – 12 Little Spells', 'CD', null),
  ('evanescence-fallen-cd-open-box', 'evanescence-fallen', 'Evanescence – Fallen', 'Evanescence – Fallen', 'CD', null),
  ('evita-ost-cd-open-box', 'evita-ost', 'Evita OST', 'Evita OST', 'CD', null),
  ('ezra-collective-chapter-7-cd-used', 'ezra-collective-chapter-7', 'Ezra Collective – Chapter 7', 'Ezra Collective – Chapter 7', 'CD', null),
  ('ezra-collective-you-cant-steal-my-joy-cd-used', 'ezra-collective-you-cant-steal-my-joy', 'Ezra Collective – You Can''t Steal My Joy', 'Ezra Collective – You Can''t Steal My Joy', 'CD', null),
  ('faces-2-originals-vinyl-open-box', 'faces-2-originals', 'Faces – 2 Originals', 'Faces – 2 Originals', 'Vinyl', null),
  ('faces-a-nods-as-good-as-a-wink-vinyl-open-box', 'faces-a-nods-as-good-as-a-wink', 'Faces – A Nod''s as Good as a Wink', 'Faces – A Nod''s as Good as a Wink', 'Vinyl', null),
  ('festival-of-light-classical-music-12-vinyl-box-set-vinyl-open-box', 'festival-of-light-classical-music-12-vinyl-box-set', 'Festival of Light Classical Music 12 Vinyl Box Set', 'Festival of Light Classical Music 12 Vinyl Box Set', 'Vinyl', null),
  ('fifty-shades-of-grey-ost-cd-open-box', 'fifty-shades-of-grey-ost', 'Fifty Shades of Grey OST', 'Fifty Shades of Grey OST', 'CD', null),
  ('final-audio-a4000', 'final-audio-a4000', 'Final Audio A4000 earphones', 'سماعات Final Audio A4000', 'Default', null),
  ('final-audio-d8000', 'final-audio-d8000', 'Final Audio D8000 headphones', 'سماعات Final Audio D8000', 'Default', null),
  ('final-fantasy-vii-rebirth-ps5-rental', 'final-fantasy-vii-rebirth', 'Final Fantasy VII Rebirth', 'Final Fantasy VII Rebirth', 'PS5', null),
  ('final-fantasy-xvi-ps5-rental', 'final-fantasy-xvi', 'Final Fantasy XVI', 'Final Fantasy XVI', 'PS5', null),
  ('fleetwood-mac-vinyl', 'fleetwood-mac', 'Fleetwood Mac', 'Fleetwood Mac', 'Vinyl', null),
  ('fleetwood-mac-4-cd-set-cd', 'fleetwood-mac-4-cd-set', 'Fleetwood Mac – 4 CD set', 'Fleetwood Mac – 4 CD set', 'CD', null),
  ('fleetwood-mac-rumors-cd', 'fleetwood-mac-rumors', 'Fleetwood Mac – Rumors', 'Fleetwood Mac – Rumors', 'CD', null),
  ('flying-lotus-cosmogramma-cd-used', 'flying-lotus-cosmogramma', 'Flying Lotus – Cosmogramma', 'Flying Lotus – Cosmogramma', 'CD', null),
  ('foreigner-4-vinyl-open-box', 'foreigner-4', 'Foreigner – 4', 'Foreigner – 4', 'Vinyl', null),
  ('frank-ocean-orange-cd', 'frank-ocean-orange', 'Frank Ocean – Orange', 'Frank Ocean – Orange', 'CD', null),
  ('frank-sinatra-come-back-to-sorrento-vinyl', 'frank-sinatra-come-back-to-sorrento', 'Frank Sinatra – Come Back to Sorrento', 'Frank Sinatra – Come Back to Sorrento', 'Vinyl', null),
  ('frank-sinatra-greatest-hits-vinyl', 'frank-sinatra-greatest-hits', 'Frank Sinatra – Greatest Hits', 'Frank Sinatra – Greatest Hits', 'Vinyl', null),
  ('frank-sinatra-love-vinyl', 'frank-sinatra-love', 'Frank Sinatra – Love', 'Frank Sinatra – Love', 'Vinyl', null),
  ('frank-sinatra-september-song-vinyl', 'frank-sinatra-september-song', 'Frank Sinatra – September Song', 'Frank Sinatra – September Song', 'Vinyl', null),
  ('frank-sinatra-sinatra-80th-live-in-concert-cd', 'frank-sinatra-sinatra-80th-live-in-concert', 'Frank Sinatra – Sinatra 80th: Live in Concert', 'Frank Sinatra – Sinatra 80th: Live in Concert', 'CD', null),
  ('frank-sinatra-the-concert-sinatra-vinyl', 'frank-sinatra-the-concert-sinatra', 'Frank Sinatra – The Concert Sinatra', 'Frank Sinatra – The Concert Sinatra', 'Vinyl', null),
  ('frank-sinatra-the-concert-sinatra-vinyl-open-box', 'frank-sinatra-the-concert-sinatra', 'Frank Sinatra – The Concert Sinatra', 'Frank Sinatra – The Concert Sinatra', 'Vinyl', 24750),
  ('frankenstein-in-baghdad-book', 'frankenstein-in-baghdad', 'Frankenstein in Baghdad – Ahmed Saadawi', 'فرانكشتاين في بغداد – أحمد سعداوي', 'Default', null),
  ('frankenstein-in-baghdad-rental', 'frankenstein-in-baghdad', 'Frankenstein in Baghdad – Ahmed Saadawi', 'فرانكشتاين في بغداد – أحمد سعداوي', 'Default', null),
  ('freddie-mercury-vinyl', 'freddie-mercury', 'Freddie Mercury', 'Freddie Mercury', 'Vinyl', null),
  ('freddie-mercury-mr-bad-guy-vinyl-open-box', 'freddie-mercury-mr-bad-guy', 'Freddie Mercury – Mr. Bad Guy', 'Freddie Mercury – Mr. Bad Guy', 'Vinyl', null),
  ('george-michael-cd', 'george-michael', 'George Michael', 'George Michael', 'CD', null),
  ('george-michael-and-wham-last-christmas-the-original-motion-picture-soundtrack-vinyl', 'george-michael-and-wham-last-christmas-the-original-motion-picture-soundtrack', 'George Michael &  Wham! – Last Christmas: The Original Motion Picture Soundtrack', 'George Michael &  Wham! – Last Christmas: The Original Motion Picture Soundtrack', 'Vinyl', null),
  ('george-michael-older-vinyl', 'george-michael-older', 'George Michael Older', 'George Michael Older', 'Vinyl', null),
  ('ghost-of-tsushima-directors-cut-ps5-rental', 'ghost-of-tsushima-directors-cut', 'Ghost of Tsushima Director''s Cut', 'Ghost of Tsushima Director''s Cut', 'PS5', null),
  ('ghost-of-yotei-ps5', 'ghost-of-yotei', 'Ghost of Yōtei', 'Ghost of Yōtei', 'PS5', null),
  ('ghost-of-yotei-ps5-rental', 'ghost-of-yotei', 'Ghost of Yōtei', 'Ghost of Yōtei', 'PS5', null),
  ('gladiator-blu-ray-rental', 'gladiator', 'Gladiator', 'Gladiator', 'Blu-ray', null),
  ('god-of-war-ragnarok-ps5', 'god-of-war-ragnarok', 'God of War Ragnarök', 'God of War Ragnarök', 'PS5', null),
  ('god-of-war-ragnarok-ps5-rental', 'god-of-war-ragnarok', 'God of War Ragnarök', 'God of War Ragnarök', 'PS5', null),
  ('gogo-penguin-a-humdrum-star-cd-used', 'gogo-penguin-a-humdrum-star', 'GoGo Penguin – A Humdrum Star', 'GoGo Penguin – A Humdrum Star', 'CD', null),
  ('gogo-penguin-live-from-studio-2-cd-used', 'gogo-penguin-live-from-studio-2', 'GoGo Penguin – Live from Studio 2', 'GoGo Penguin – Live from Studio 2', 'CD', null),
  ('gogo-penguin-man-made-object-cd-used', 'gogo-penguin-man-made-object', 'GoGo Penguin – Man Made Object', 'GoGo Penguin – Man Made Object', 'CD', null),
  ('gorillaz-vinyl', 'gorillaz', 'Gorillaz', 'Gorillaz', 'Vinyl', null),
  ('gorillaz-demon-days-cd', 'gorillaz-demon-days', 'Gorillaz – Demon Days', 'Gorillaz – Demon Days', 'CD', null),
  ('gorillaz-e-hash-cd-open-box', 'gorillaz-e-hash', 'Gorillaz – e-Hash', 'Gorillaz – e-Hash', 'CD', null),
  ('gran-turismo-7-ps5', 'gran-turismo-7', 'Gran Turismo 7', 'Gran Turismo 7', 'PS5', null),
  ('gran-turismo-7-ps5-rental', 'gran-turismo-7', 'Gran Turismo 7', 'Gran Turismo 7', 'PS5', null),
  ('grand-theft-auto-v-ps5-rental', 'grand-theft-auto-v', 'Grand Theft Auto V', 'Grand Theft Auto V', 'PS5', null),
  ('green-day-american-idiot-cd', 'green-day-american-idiot', 'Green Day – American Idiot', 'Green Day – American Idiot', 'CD', null),
  ('green-day-american-idiot-cd-dvd-cd-open-box', 'green-day-american-idiot-cd-dvd', 'Green Day – American Idiot (CD+DVD)', 'Green Day – American Idiot (CD+DVD)', 'CD', null),
  ('green-day-dookie-vinyl', 'green-day-dookie', 'Green Day – Dookie', 'Green Day – Dookie', 'Vinyl', null),
  ('guns-n-roses-vinyl', 'guns-n-roses', 'Guns N'' Roses', 'Guns N'' Roses', 'Vinyl', null),
  ('halsey-vinyl', 'halsey', 'Halsey', 'Halsey', 'Vinyl', null),
  ('halsey-manic-clear-vinyl-vinyl', 'halsey-manic-clear', 'Halsey – Manic (clear vinyl)', 'Halsey – Manic (clear vinyl)', 'Vinyl', null),
  ('harry-potter-and-the-philosophers-stone-rental', 'harry-potter-and-the-philosophers-stone', 'Harry Potter and the Philosopher''s Stone – J. K. Rowling', 'هاري بوتر وحجر الفيلسوف – ج. ك. رولينغ', 'Default', null),
  ('harry-styles-cd', 'harry-styles', 'Harry Styles', 'Harry Styles', 'CD', null),
  ('harry-styles-vinyl', 'harry-styles', 'Harry Styles', 'Harry Styles', 'Vinyl', null),
  ('harry-styles-fine-line-vinyl', 'harry-styles-fine-line', 'Harry Styles – Fine Line', 'Harry Styles – Fine Line', 'Vinyl', null),
  ('harry-styles-harry-styles-vinyl', 'harry-styles-harry-styles', 'Harry Styles – Harry Styles', 'Harry Styles – Harry Styles', 'Vinyl', null),
  ('hogwarts-legacy-ps5-rental', 'hogwarts-legacy', 'Hogwarts Legacy', 'Hogwarts Legacy', 'PS5', null),
  ('horizon-forbidden-west-ps5-rental', 'horizon-forbidden-west', 'Horizon Forbidden West', 'Horizon Forbidden West', 'PS5', null),
  ('hozier-hozier-cd', 'hozier-hozier', 'Hozier – Hozier', 'Hozier – Hozier', 'CD', null),
  ('inception-blu-ray-rental', 'inception', 'Inception', 'Inception', 'Blu-ray', null),
  ('inside-out-2-blu-ray-rental', 'inside-out-2', 'Inside Out 2', 'Inside Out 2', 'Blu-ray', null),
  ('interstellar-blu-ray-rental', 'interstellar', 'Interstellar', 'Interstellar', 'Blu-ray', null),
  ('it-takes-two-ps5-rental', 'it-takes-two', 'It Takes Two', 'It Takes Two', 'PS5', null),
  ('j-cole-2014-forest-hills-drive-vinyl', 'j-cole-2014-forest-hills-drive', 'J. Cole – 2014 Forest Hills Drive', 'J. Cole – 2014 Forest Hills Drive', 'Vinyl', null),
  ('jacob-collier-djesse-vol-1-cd-used', 'jacob-collier-djesse-vol-1', 'Jacob Collier – Djesse Vol. 1', 'Jacob Collier – Djesse Vol. 1', 'CD', null),
  ('janis-joplin-i-got-dem-ol-kozmic-blues-again-mama-vinyl-open-box', 'janis-joplin-i-got-dem-ol-kozmic-blues-again-mama', 'Janis Joplin – I Got Dem Ol'' Kozmic Blues Again Mama', 'Janis Joplin – I Got Dem Ol'' Kozmic Blues Again Mama', 'Vinyl', null),
  ('jason-moran-from-the-dancehall-to-the-battlefield-cd-used', 'jason-moran-from-the-dancehall-to-the-battlefield', 'Jason Moran – From the Dancehall to the Battlefield', 'Jason Moran – From the Dancehall to the Battlefield', 'CD', null),
  ('jbl-l112', 'jbl-l112', 'JBL L112 speakers', 'سماعات JBL L112', 'Default', null),
  ('jeff-buckley-grace-cd', 'jeff-buckley-grace', 'Jeff Buckley – Grace', 'Jeff Buckley – Grace', 'CD', null),
  ('jeff-buckley-grace-vinyl', 'jeff-buckley-grace', 'Jeff Buckley – Grace', 'Jeff Buckley – Grace', 'Vinyl', null),
  ('jessica-lauren-almeria-cd-used', 'jessica-lauren-almeria', 'Jessica Lauren – Almeria', 'Jessica Lauren – Almeria', 'CD', null),
  ('jethro-tull-a-jethro-tull-collection-vinyl-open-box', 'jethro-tull-a-jethro-tull-collection', 'Jethro Tull – A Jethro Tull Collection', 'Jethro Tull – A Jethro Tull Collection', 'Vinyl', null),
  ('jethro-tull-aqualung-vinyl-open-box', 'jethro-tull-aqualung', 'Jethro Tull – Aqualung', 'Jethro Tull – Aqualung', 'Vinyl', null),
  ('jethro-tull-benefit-vinyl-open-box', 'jethro-tull-benefit', 'Jethro Tull – Benefit', 'Jethro Tull – Benefit', 'Vinyl', null),
  ('joe-armon-jones-starting-today-cd-used', 'joe-armon-jones-starting-today', 'Joe Armon-Jones – Starting Today', 'Joe Armon-Jones – Starting Today', 'CD', null),
  ('john-bongiovi-the-power-station-years-cd-open-box', 'john-bongiovi-the-power-station-years', 'John Bongiovi – The Power Station Years', 'John Bongiovi – The Power Station Years', 'CD', null),
  ('john-lennon-and-plastic-ono-band-shaved-fish-vinyl-open-box', 'john-lennon-and-plastic-ono-band-shaved-fish', 'John Lennon & Plastic Ono Band – Shaved Fish', 'John Lennon & Plastic Ono Band – Shaved Fish', 'Vinyl', null),
  ('john-wick-chapter-4-blu-ray-rental', 'john-wick-chapter-4', 'John Wick: Chapter 4', 'John Wick: Chapter 4', 'Blu-ray', null),
  ('johnny-cash-vinyl', 'johnny-cash', 'Johnny Cash', 'Johnny Cash', 'Vinyl', null),
  ('joker-blu-ray-rental', 'joker', 'Joker', 'Joker', 'Blu-ray', null),
  ('jose-james-no-beginning-no-end-cd-used', 'jose-james-no-beginning-no-end', 'José James – No Beginning No End', 'José James – No Beginning No End', 'CD', null),
  ('julian-lage-love-hurts-cd-used', 'julian-lage-love-hurts', 'Julian Lage – Love Hurts', 'Julian Lage – Love Hurts', 'CD', null),
  ('julio-iglesias-my-life-the-greatest-hits-cd-open-box', 'julio-iglesias-my-life-the-greatest-hits', 'Julio Iglesias – My Life: The Greatest Hits', 'Julio Iglesias – My Life: The Greatest Hits', 'CD', null),
  ('justin-bieber-cd', 'justin-bieber', 'Justin Bieber', 'Justin Bieber', 'CD', null),
  ('justin-bieber-changes-vinyl', 'justin-bieber-changes', 'Justin Bieber – Changes', 'Justin Bieber – Changes', 'Vinyl', null),
  ('kamasi-washington-the-epic-cd-used', 'kamasi-washington-the-epic', 'Kamasi Washington – The Epic', 'Kamasi Washington – The Epic', 'CD', null),
  ('kansas-two-for-the-show-vinyl-open-box', 'kansas-two-for-the-show', 'Kansas – Two for the Show', 'Kansas – Two for the Show', 'Vinyl', null),
  ('kanye-west-808s-and-heartbreak-cd', 'kanye-west-808s-and-heartbreak', 'Kanye West – 808s & Heartbreak', 'Kanye West – 808s & Heartbreak', 'CD', null),
  ('kanye-west-808s-and-heartbreak-cd-open-box', 'kanye-west-808s-and-heartbreak', 'Kanye West – 808s & Heartbreak', 'Kanye West – 808s & Heartbreak', 'CD', null),
  ('kanye-west-donda-cd', 'kanye-west-donda', 'Kanye West – Donda', 'Kanye West – Donda', 'CD', null),
  ('kanye-west-graduation-cd', 'kanye-west-graduation', 'Kanye West – Graduation', 'Kanye West – Graduation', 'CD', null),
  ('kanye-west-late-registration-cd-open-box', 'kanye-west-late-registration', 'Kanye West – Late Registration', 'Kanye West – Late Registration', 'CD', null),
  ('kanye-west-late-registration-vinyl-open-box', 'kanye-west-late-registration', 'Kanye West – Late Registration', 'Kanye West – Late Registration', 'Vinyl', null),
  ('kanye-west-my-beautiful-dark-twisted-fantasy-cd', 'kanye-west-my-beautiful-dark-twisted-fantasy', 'Kanye West – My Beautiful Dark Twisted Fantasy', 'Kanye West – My Beautiful Dark Twisted Fantasy', 'CD', null),
  ('katy-perry-one-of-the-boys-cd', 'katy-perry-one-of-the-boys', 'Katy Perry – One of the Boys', 'Katy Perry – One of the Boys', 'CD', null),
  ('kendrick-lamar-damn-cd', 'kendrick-lamar-damn', 'Kendrick Lamar – Damn', 'Kendrick Lamar – Damn', 'CD', null),
  ('kendrick-lamar-to-pimp-a-butterfly-vinyl', 'kendrick-lamar-to-pimp-a-butterfly', 'Kendrick Lamar – To Pimp a Butterfly', 'Kendrick Lamar – To Pimp a Butterfly', 'Vinyl', null),
  ('kiefer-happysad-cd-used', 'kiefer-happysad', 'Kiefer – Happysad', 'Kiefer – Happysad', 'CD', null),
  ('king-crimson-cd', 'king-crimson', 'King Crimson', 'King Crimson', 'CD', null),
  ('kokoroko-kokoroko-cd-used', 'kokoroko-kokoroko', 'Kokoroko – Kokoroko', 'Kokoroko – Kokoroko', 'CD', null),
  ('korn-cd', 'korn', 'Korn', 'Korn', 'CD', null),
  ('ksi-dissimulation-vinyl', 'ksi-dissimulation', 'KSI – Dissimulation', 'KSI – Dissimulation', 'Vinyl', null),
  ('lady-gaga-the-fame-vinyl', 'lady-gaga-the-fame', 'Lady Gaga – The Fame', 'Lady Gaga – The Fame', 'Vinyl', null),
  ('lana-del-rey-blue-banisters-cd', 'lana-del-rey-blue-banisters', 'Lana Del Rey – Blue Banisters', 'Lana Del Rey – Blue Banisters', 'CD', null),
  ('lana-del-rey-born-to-die-cd', 'lana-del-rey-born-to-die', 'Lana Del Rey – Born to Die', 'Lana Del Rey – Born to Die', 'CD', null),
  ('lana-del-rey-born-to-die-vinyl', 'lana-del-rey-born-to-die', 'Lana Del Rey – Born to Die', 'Lana Del Rey – Born to Die', 'Vinyl', null),
  ('lana-del-rey-born-to-die-vinyl-open-box', 'lana-del-rey-born-to-die', 'Lana Del Rey – Born to Die', 'Lana Del Rey – Born to Die', 'Vinyl', 44750),
  ('lana-del-rey-born-to-die-the-paradise-edition-cd', 'lana-del-rey-born-to-die-the-paradise-edition', 'Lana Del Rey – Born to Die The Paradise Edition', 'Lana Del Rey – Born to Die The Paradise Edition', 'CD', null),
  ('lana-del-rey-chemtrails-over-the-country-club-cd', 'lana-del-rey-chemtrails-over-the-country-club', 'Lana Del Rey – Chemtrails Over the Country Club', 'Lana Del Rey – Chemtrails Over the Country Club', 'CD', null),
  ('lana-del-rey-chemtrails-over-the-country-club-vinyl', 'lana-del-rey-chemtrails-over-the-country-club', 'Lana Del Rey – Chemtrails Over the Country Club', 'Lana Del Rey – Chemtrails Over the Country Club', 'Vinyl', null),
  ('lana-del-rey-did-you-know-that-theres-a-tunnel-under-ocean-blvd-cd', 'lana-del-rey-did-you-know-that-theres-a-tunnel-under-ocean-blvd', 'Lana Del Rey – Did You Know that There''s a Tunnel Under Ocean Blvd', 'Lana Del Rey – Did You Know that There''s a Tunnel Under Ocean Blvd', 'CD', null),
  ('lana-del-rey-honeymoon-cd', 'lana-del-rey-honeymoon', 'Lana Del Rey – Honeymoon', 'Lana Del Rey – Honeymoon', 'CD', null),
  ('lana-del-rey-honeymoon-vinyl', 'lana-del-rey-honeymoon', 'Lana Del Rey – Honeymoon', 'Lana Del Rey – Honeymoon', 'Vinyl', null),
  ('lana-del-rey-lust-for-life-cd', 'lana-del-rey-lust-for-life', 'Lana Del Rey – Lust for Life', 'Lana Del Rey – Lust for Life', 'CD', null),
  ('lana-del-rey-lust-for-life-vinyl', 'lana-del-rey-lust-for-life', 'Lana Del Rey – Lust for Life', 'Lana Del Rey – Lust for Life', 'Vinyl', null),
  ('lana-del-rey-norman-fucking-rockwell-vinyl', 'lana-del-rey-norman-fucking-rockwell', 'Lana Del Rey – Norman Fucking Rockwell!', 'Lana Del Rey – Norman Fucking Rockwell!', 'Vinyl', null),
  ('lana-del-rey-ultraviolence-cd-open-box', 'lana-del-rey-ultraviolence', 'Lana Del Rey – Ultraviolence', 'Lana Del Rey – Ultraviolence', 'CD', null),
  ('lana-del-rey-ultraviolence-vinyl', 'lana-del-rey-ultraviolence', 'Lana Del Rey – Ultraviolence', 'Lana Del Rey – Ultraviolence', 'Vinyl', null),
  ('lana-del-rey-ultraviolence-vinyl-open-box', 'lana-del-rey-ultraviolence', 'Lana Del Rey – Ultraviolence', 'Lana Del Rey – Ultraviolence', 'Vinyl', null),
  ('lana-del-rey-violet-bent-backwards-over-the-grass-vinyl', 'lana-del-rey-violet-bent-backwards-over-the-grass', 'Lana Del Rey – Violet Bent Backwards Over the Grass', 'Lana Del Rey – Violet Bent Backwards Over the Grass', 'Vinyl', null),
  ('laurent-coulondre-michel-on-my-mind-cd-used', 'laurent-coulondre-michel-on-my-mind', 'Laurent Coulondre – Michel on My Mind', 'Laurent Coulondre – Michel on My Mind', 'CD', null),
  ('led-zeppelin-coda-vinyl', 'led-zeppelin-coda', 'Led Zeppelin – Coda', 'Led Zeppelin – Coda', 'Vinyl', null),
  ('led-zeppelin-ii-vinyl', 'led-zeppelin-ii', 'Led Zeppelin – II', 'Led Zeppelin – II', 'Vinyl', null),
  ('led-zeppelin-iv-cd-open-box', 'led-zeppelin-iv', 'Led Zeppelin – IV', 'Led Zeppelin – IV', 'CD', null),
  ('lemar-the-truth-about-love-cd', 'lemar-the-truth-about-love', 'Lemar – The Truth About Love', 'Lemar – The Truth About Love', 'CD', null),
  ('lewis-capaldi-cd-open-box', 'lewis-capaldi', 'Lewis Capaldi', 'Lewis Capaldi', 'CD', null),
  ('lewis-capaldi-broken-by-desire-to-be-heavenly-sent-vinyl', 'lewis-capaldi-broken-by-desire-to-be-heavenly-sent', 'Lewis Capaldi – Broken by Desire to Be Heavenly Sent', 'Lewis Capaldi – Broken by Desire to Be Heavenly Sent', 'Vinyl', null),
  ('lies-of-p-ps5-rental', 'lies-of-p', 'Lies of P', 'Lies of P', 'PS5', null),
  ('linkin-park-cd', 'linkin-park', 'Linkin Park', 'Linkin Park', 'CD', null),
  ('linkin-park-hybrid-theory-cd', 'linkin-park-hybrid-theory', 'Linkin Park – Hybrid Theory', 'Linkin Park – Hybrid Theory', 'CD', null),
  ('linkin-park-hybrid-theory-vinyl', 'linkin-park-hybrid-theory', 'Linkin Park – Hybrid Theory', 'Linkin Park – Hybrid Theory', 'Vinyl', null),
  ('linkin-park-meteora-vinyl', 'linkin-park-meteora', 'Linkin Park – Meteora', 'Linkin Park – Meteora', 'Vinyl', null),
  ('linkin-park-reanimation-cd', 'linkin-park-reanimation', 'Linkin Park – Reanimation', 'Linkin Park – Reanimation', 'CD', null),
  ('linkin-park-reanimation-vinyl', 'linkin-park-reanimation', 'Linkin Park – Reanimation', 'Linkin Park – Reanimation', 'Vinyl', null),
  ('lionmilk-yums-cd-used', 'lionmilk-yums', 'Lionmilk – YUMS', 'Lionmilk – YUMS', 'CD', null),
  ('lorde-melodrama-vinyl', 'lorde-melodrama', 'Lorde – Melodrama', 'Lorde – Melodrama', 'Vinyl', null),
  ('louis-tomlinson-faith-in-the-future-vinyl', 'louis-tomlinson-faith-in-the-future', 'Louis Tomlinson – Faith in the Future', 'Louis Tomlinson – Faith in the Future', 'Vinyl', null),
  ('louis-tomlinson-walls-vinyl', 'louis-tomlinson-walls', 'Louis Tomlinson – Walls', 'Louis Tomlinson – Walls', 'Vinyl', null),
  ('mac-miller-circles-vinyl', 'mac-miller-circles', 'Mac Miller – Circles', 'Mac Miller – Circles', 'Vinyl', null),
  ('madlib-shades-of-blue-cd-used', 'madlib-shades-of', 'Madlib – Shades of Blue', 'Madlib – Shades of Blue', 'CD', null),
  ('maisha-there-is-a-place-cd-used', 'maisha-there-is-a-place', 'Maisha – There Is A Place', 'Maisha – There Is A Place', 'CD', null),
  ('makaya-mccraven-universal-beings-cd-used', 'makaya-mccraven-universal-beings', 'Makaya McCraven – Universal Beings', 'Makaya McCraven – Universal Beings', 'CD', null),
  ('mammal-hands-shadow-work-cd-used', 'mammal-hands-shadow-work', 'Mammal Hands – Shadow Work', 'Mammal Hands – Shadow Work', 'CD', null),
  ('mans-search-for-meaning-rental', 'mans-search-for-meaning', 'Man''s Search for Meaning – Viktor E. Frankl', 'الإنسان يبحث عن المعنى – فيكتور فرانكل', 'Default', null),
  ('marc-ribot-yru-still-here-cd-used', 'marc-ribot-yru-still-here', 'Marc Ribot – YRU Still Here?', 'Marc Ribot – YRU Still Here?', 'CD', null),
  ('marillion-clutching-at-straws-vinyl-open-box', 'marillion-clutching-at-straws', 'Marillion – Clutching at Straws', 'Marillion – Clutching at Straws', 'Vinyl', null),
  ('mario-kart-8-deluxe', 'mario-kart-8-deluxe', 'Mario Kart 8 Deluxe', 'Mario Kart 8 Deluxe', 'Switch', null),
  ('mario-lanza-the-very-best-of-mario-lanza-cd', 'mario-lanza-the-very-best-of-mario-lanza', 'Mario Lanza – The Very Best of Mario Lanza', 'Mario Lanza – The Very Best of Mario Lanza', 'CD', null),
  ('mark-guiliana-jersey-cd-used', 'mark-guiliana-jersey', 'Mark Guiliana – Jersey', 'Mark Guiliana – Jersey', 'CD', null),
  ('maroon-5-red-pill-blues-vinyl', 'maroon-5-red-pill-blues', 'Maroon 5 – Red Pill Blues', 'Maroon 5 – Red Pill Blues', 'Vinyl', null),
  ('maroon-5-songs-about-jane-cd', 'maroon-5-songs-about-jane', 'Maroon 5 – Songs About Jane', 'Maroon 5 – Songs About Jane', 'CD', null),
  ('marvels-spider-man-2-ps5', 'marvels-spider-man-2', 'Marvel''s Spider-Man 2', 'Marvel''s Spider-Man 2', 'PS5', null),
  ('marvels-spider-man-2-ps5-rental', 'marvels-spider-man-2', 'Marvel''s Spider-Man 2', 'Marvel''s Spider-Man 2', 'PS5', null),
  ('matthew-halsall-on-the-go-cd-used', 'matthew-halsall-on-the-go', 'Matthew Halsall – On the Go', 'Matthew Halsall – On the Go', 'CD', null),
  ('melanie-martinez-after-school-blue-vinyl', 'melanie-martinez-after-school', 'Melanie Martinez – After School', 'Melanie Martinez – After School (blue)', 'Vinyl (blue)', null),
  ('melanie-martinez-after-school-vinyl', 'melanie-martinez-after-school', 'Melanie Martinez – After School', 'Melanie Martinez – After School', 'Vinyl', null),
  ('melanie-martinez-cry-baby-vinyl', 'melanie-martinez-cry-baby', 'Melanie Martinez – Cry Baby', 'Melanie Martinez – Cry Baby', 'Vinyl', null),
  ('melanie-martinez-k-12-cd', 'melanie-martinez-k-12', 'Melanie Martinez – K-12', 'Melanie Martinez – K-12', 'CD', null),
  ('melt-yourself-down-last-evenings-on-earth-cd-used', 'melt-yourself-down-last-evenings-on-earth', 'Melt Yourself Down – Last Evenings on Earth', 'Melt Yourself Down – Last Evenings on Earth', 'CD', null),
  ('men-at-work-business-as-usual-vinyl-open-box', 'men-at-work-business-as-usual', 'Men at Work – Business As Usual', 'Men at Work – Business As Usual', 'Vinyl', null),
  ('men-in-the-sun-book', 'men-in-the-sun', 'Men in the Sun – Ghassan Kanafani', 'رجال في الشمس – غسان كنفاني', 'Default', null),
  ('men-in-the-sun-rental', 'men-in-the-sun', 'Men in the Sun – Ghassan Kanafani', 'رجال في الشمس – غسان كنفاني', 'Default', null),
  ('metallica-death-magnetic-cd-open-box', 'metallica-death-magnetic', 'Metallica – Death Magnetic', 'Metallica – Death Magnetic', 'CD', null),
  ('metallica-master-of-puppets-vinyl', 'metallica-master-of-puppets', 'Metallica – Master of Puppets', 'Metallica – Master of Puppets', 'Vinyl', null),
  ('metallica-metallica-cd-open-box', 'metallica-metallica', 'Metallica – Metallica', 'Metallica – Metallica', 'CD', null),
  ('metallica-poster-poster-vinyl', 'metallica-poster-poster', 'Metallica + poster (poster)', 'Metallica + poster (poster)', 'Vinyl', null),
  ('metallica-ride-the-lightning-cd-open-box', 'metallica-ride-the-lightning', 'Metallica – Ride the Lightning', 'Metallica – Ride the Lightning', 'CD', null),
  ('michael-buble-vinyl', 'michael-buble', 'Michael Bublé', 'Michael Bublé', 'Vinyl', null),
  ('michael-jackson-vinyl', 'michael-jackson', 'Michael Jackson', 'Michael Jackson', 'Vinyl', null),
  ('michael-jackson-bad-cd-open-box', 'michael-jackson-bad', 'Michael Jackson – Bad', 'Michael Jackson – Bad', 'CD', null),
  ('michael-jackson-bad-vinyl-open-box', 'michael-jackson-bad', 'Michael Jackson – Bad', 'Michael Jackson – Bad', 'Vinyl', null),
  ('michael-jackson-thriller-cd', 'michael-jackson-thriller', 'Michael Jackson – Thriller', 'Michael Jackson – Thriller', 'CD', null),
  ('michael-jackson-xscape-vinyl', 'michael-jackson-xscape', 'Michael Jackson – Xscape', 'Michael Jackson – Xscape', 'Vinyl', null),
  ('mika-vinyl', 'mika', 'Mika', 'Mika', 'Vinyl', null),
  ('miley-cyrus-endless-summer-vacation-cd', 'miley-cyrus-endless-summer-vacation', 'Miley Cyrus – Endless Summer Vacation', 'Miley Cyrus – Endless Summer Vacation', 'CD', null),
  ('miley-cyrus-endless-summer-vacation-vinyl', 'miley-cyrus-endless-summer-vacation', 'Miley Cyrus – Endless Summer Vacation', 'Miley Cyrus – Endless Summer Vacation', 'Vinyl', null),
  ('mission-impossible-2-ost-cd-open-box', 'mission-impossible-2-ost', 'Mission Impossible 2 OST', 'Mission Impossible 2 OST', 'CD', null),
  ('mitski-the-land-is-inhospitable-and-so-are-we-vinyl', 'mitski-the-land-is-inhospitable-and-so-are-we', 'Mitski – The Land Is Inhospitable and So Are We', 'Mitski – The Land Is Inhospitable and So Are We', 'Vinyl', null),
  ('mndsgn-yawn-zen-cd-used', 'mndsgn-yawn-zen', 'Mndsgn – Yawn Zen', 'Mndsgn – Yawn Zen', 'CD', null),
  ('moonchild-little-gh-ost-cd-used', 'moonchild-little-gh-ost', 'Moonchild – Little Gh (ost)', 'Moonchild – Little Gh (ost)', 'CD', null),
  ('mortal-kombat-1-ps5-rental', 'mortal-kombat-1', 'Mortal Kombat 1', 'Mortal Kombat 1', 'PS5', null),
  ('moses-boyd-dark-matter-cd-used', 'moses-boyd-dark-matter', 'Moses Boyd – Dark Matter', 'Moses Boyd – Dark Matter', 'CD', null),
  ('motley-crue-hate-into-fire-vinyl-open-box', 'motley-crue-hate-into-fire', 'Mötley Crüe – Hate Into Fire', 'Mötley Crüe – Hate Into Fire', 'Vinyl', null),
  ('motorhead-sealed-deluxe-sealed-deluxe-vinyl', 'motorhead-sealed-deluxe-sealed-deluxe', 'Motörhead (sealed deluxe) (sealed deluxe)', 'Motörhead (sealed deluxe) (sealed deluxe)', 'Vinyl', null),
  ('muse-vinyl', 'muse', 'Muse', 'Muse', 'Vinyl', null),
  ('myele-manzanza-a-love-requited-cd-used', 'myele-manzanza-a-love-requited', 'Myele Manzanza – A Love Requited', 'Myele Manzanza – A Love Requited', 'CD', null),
  ('myths-after-near-future-vinyl', 'myths-after-near-future', 'Myths After Near Future', 'Myths After Near Future', 'Vinyl', null),
  ('nai-palm-needle-paw-cd-used', 'nai-palm-needle-paw', 'Nai Palm – Needle Paw', 'Nai Palm – Needle Paw', 'CD', null),
  ('nat-king-cole-im-in-the-mood-for-love-vinyl', 'nat-king-cole-im-in-the-mood-for-love', 'Nat King Cole – I''m in the Mood for Love', 'Nat King Cole – I''m in the Mood for Love', 'Vinyl', null),
  ('nat-king-cole-love-is-the-thing-vinyl', 'nat-king-cole-love-is-the-thing', 'Nat King Cole – Love Is the Thing', 'Nat King Cole – Love Is the Thing', 'Vinyl', null),
  ('national-panasonic-rq-2106', 'national-panasonic-rq-2106', 'National Panasonic RQ-2106 cassette recorder', 'مسجّل كاسيت National Panasonic RQ-2106', 'Default', null),
  ('niall-horan-heartbreak-weather-vinyl', 'niall-horan-heartbreak-weather', 'Niall Horan – Heartbreak Weather', 'Niall Horan – Heartbreak Weather', 'Vinyl', null),
  ('nicholas-payton-afro-caribbean-mixtape-cd-used', 'nicholas-payton-afro-caribbean-mixtape', 'Nicholas Payton – Afro-Caribbean Mixtape', 'Nicholas Payton – Afro-Caribbean Mixtape', 'CD', null),
  ('nicki-minaj-queen-cd', 'nicki-minaj-queen', 'Nicki Minaj – Queen', 'Nicki Minaj – Queen', 'CD', null),
  ('nik-kershaw-human-racing-vinyl-open-box', 'nik-kershaw-human-racing', 'Nik Kershaw – Human Racing', 'Nik Kershaw – Human Racing', 'Vinyl', null),
  ('nine-inch-nails-pretty-hate-machine-vinyl', 'nine-inch-nails-pretty-hate-machine', 'Nine Inch Nails – Pretty Hate Machine', 'Nine Inch Nails – Pretty Hate Machine', 'Vinyl', null),
  ('nineteen-eighty-four-rental', 'nineteen-eighty-four', 'Nineteen Eighty-Four – George Orwell', '1984 – جورج أورويل', 'Default', null),
  ('nintendo-switch-oled', 'nintendo-switch-oled', 'Nintendo Switch – OLED model', 'Nintendo Switch – طراز OLED', 'Default', null),
  ('nirvana-vinyl', 'nirvana', 'Nirvana', 'Nirvana', 'Vinyl', null),
  ('nirvana-mtv-unplugged-in-new-york-cd', 'nirvana-mtv-unplugged-in-new-york', 'Nirvana – MTV Unplugged in New York', 'Nirvana – MTV Unplugged in New York', 'CD', null),
  ('nirvana-mtv-unplugged-in-new-york-cd-open-box', 'nirvana-mtv-unplugged-in-new-york', 'Nirvana – MTV Unplugged in New York', 'Nirvana – MTV Unplugged in New York', 'CD', 9750),
  ('nirvana-muddy-banks-of-the-wishkah-vinyl', 'nirvana-muddy-banks-of-the-wishkah', 'Nirvana – Muddy Banks of the Wishkah', 'Nirvana – Muddy Banks of the Wishkah', 'Vinyl', null),
  ('nirvana-nevermind-vinyl', 'nirvana-nevermind', 'Nirvana – Nevermind', 'Nirvana – Nevermind', 'Vinyl', null),
  ('nubiyan-twist-freedom-fables-cd-used', 'nubiyan-twist-freedom-fables', 'Nubiyan Twist – Freedom Fables', 'Nubiyan Twist – Freedom Fables', 'CD', null),
  ('nubya-garcia-source-cd-used', 'nubya-garcia-source', 'Nubya Garcia – Source', 'Nubya Garcia – Source', 'CD', null),
  ('olivia-rodrigo-guts-signed-card-cassette', 'olivia-rodrigo-guts-signed-card', 'Olivia Rodrigo – GUTS (Signed Card)', 'Olivia Rodrigo – GUTS (Signed Card)', 'Cassette', null),
  ('olivia-rodrigo-sour-cd', 'olivia-rodrigo-sour', 'Olivia Rodrigo – Sour', 'Olivia Rodrigo – Sour', 'CD', null),
  ('olivia-rodrigo-sour-pink-edition-vinyl', 'olivia-rodrigo-sour-pink-edition', 'Olivia Rodrigo – Sour (pink edition)', 'Olivia Rodrigo – Sour (pink edition)', 'Vinyl', null),
  ('one-direction-2cd-set-2cd-set-cd', 'one-direction-2cd-set-2cd-set', 'One Direction (2CD set) (2CD set)', 'One Direction (2CD set) (2CD set)', 'CD', null),
  ('one-direction-take-me-home-cd', 'one-direction-take-me-home', 'One Direction – Take Me Home', 'One Direction – Take Me Home', 'CD', null),
  ('oppenheimer-blu-ray-rental', 'oppenheimer', 'Oppenheimer', 'Oppenheimer', 'Blu-ray', null),
  ('opus-live-is-life-vinyl-open-box', 'opus-live-is-life', 'Opus – Live Is Life', 'Opus – Live Is Life', 'Vinyl', null),
  ('palace-walk-book', 'palace-walk', 'Palace Walk – Naguib Mahfouz', 'بين القصرين – نجيب محفوظ', 'Default', null),
  ('palace-walk-rental', 'palace-walk', 'Palace Walk – Naguib Mahfouz', 'بين القصرين – نجيب محفوظ', 'Default', null),
  ('parasite-blu-ray-rental', 'parasite', 'Parasite', 'Parasite', 'Blu-ray', null),
  ('pat-metheny-from-this-place-cd-used', 'pat-metheny-from-this-place', 'Pat Metheny – From This Place', 'Pat Metheny – From This Place', 'CD', null),
  ('perry-como-the-best-of-perry-como-cd', 'perry-como-the-best-of-perry-como', 'Perry Como – The Best of Perry Como', 'Perry Como – The Best of Perry Como', 'CD', null),
  ('pink-vinyl', 'pink', 'Pink', 'Pink', 'Vinyl', null),
  ('pink-floyd-cd', 'pink-floyd', 'Pink Floyd', 'Pink Floyd', 'CD', null),
  ('pink-floyd-atom-heart-mother-vinyl', 'pink-floyd-atom-heart-mother', 'Pink Floyd – Atom Heart Mother', 'Pink Floyd – Atom Heart Mother', 'Vinyl', null),
  ('pink-floyd-the-dark-side-of-the-moon-cd', 'pink-floyd-the-dark-side-of-the-moon', 'Pink Floyd – The Dark Side of the Moon', 'Pink Floyd – The Dark Side of the Moon', 'CD', null),
  ('pink-floyd-the-dark-side-of-the-moon-remastered-cd', 'pink-floyd-the-dark-side-of-the-moon-remastered', 'Pink Floyd – The Dark Side of the Moon (Remastered)', 'Pink Floyd – The Dark Side of the Moon (Remastered)', 'CD', null),
  ('playstation-3-slim', 'playstation-3-slim', 'PlayStation 3 Slim', 'PlayStation 3 Slim', 'Default', null),
  ('playstation-classic', 'playstation-classic', 'PlayStation Classic', 'PlayStation Classic', 'Default', null),
  ('playstation-portal', 'playstation-portal', 'PlayStation Portal remote player', 'PlayStation Portal', 'Default', null),
  ('portals-vinyl', 'portals', 'Portals', 'Portals', 'Vinyl', null),
  ('portico-quartet-art-in-the-age-of-automation-cd-used', 'portico-quartet-art-in-the-age-of-automation', 'Portico Quartet – Art in the Age of Automation', 'Portico Quartet – Art in the Age of Automation', 'CD', null),
  ('post-malone-beerbongs-and-bentleys-vinyl', 'post-malone-beerbongs-and-bentleys', 'Post Malone – Beerbongs & Bentleys', 'Post Malone – Beerbongs & Bentleys', 'Vinyl', null),
  ('pride-and-prejudice-rental', 'pride-and-prejudice', 'Pride and Prejudice – Jane Austen', 'كبرياء وتحامل – جين أوستن', 'Default', null),
  ('ps-one', 'ps-one', 'PS one', 'PS one', 'Default', null),
  ('pulp-fiction-ost-cd-open-box', 'pulp-fiction-ost', 'Pulp Fiction OST', 'Pulp Fiction OST', 'CD', null),
  ('punk-vinyl', 'punk', 'Punk', 'Punk', 'Vinyl', null),
  ('queen-vinyl', 'queen', 'Queen', 'Queen', 'Vinyl', null),
  ('queen-a-kind-of-magic-cd-open-box', 'queen-a-kind-of-magic', 'Queen – A Kind of Magic', 'Queen – A Kind of Magic', 'CD', null),
  ('queen-a-kind-of-magic-vinyl', 'queen-a-kind-of-magic', 'Queen – A Kind of Magic', 'Queen – A Kind of Magic', 'Vinyl', null),
  ('queen-a-night-at-the-opera-vinyl', 'queen-a-night-at-the-opera', 'Queen – A Night at the Opera', 'Queen – A Night at the Opera', 'Vinyl', null),
  ('queen-a-night-at-the-opera-vinyl-open-box', 'queen-a-night-at-the-opera', 'Queen – A Night at the Opera', 'Queen – A Night at the Opera', 'Vinyl', null),
  ('queen-greatest-hits-ii-cd', 'queen-greatest-hits-ii', 'Queen – Greatest Hits II', 'Queen – Greatest Hits II', 'CD', null),
  ('queen-jazz-vinyl', 'queen-jazz', 'Queen – Jazz', 'Queen – Jazz', 'Vinyl', null),
  ('queen-sheer-heart-attack-vinyl', 'queen-sheer-heart-attack', 'Queen – Sheer Heart Attack', 'Queen – Sheer Heart Attack', 'Vinyl', null),
  ('queen-the-miracle-cd-open-box', 'queen-the-miracle', 'Queen – The Miracle', 'Queen – The Miracle', 'CD', null),
  ('queens-of-the-stone-age-songs-for-the-deaf-vinyl', 'queens-of-the-stone-age-songs-for-the-deaf', 'Queens of the Stone Age – Songs for the Deaf', 'Queens of the Stone Age – Songs for the Deaf', 'Vinyl', null),
  ('radiohead-vinyl', 'radiohead', 'Radiohead', 'Radiohead', 'Vinyl', null),
  ('radiohead-a-moon-shaped-pool-vinyl-open-box', 'radiohead-a-moon-shaped-pool', 'Radiohead – A Moon Shaped Pool', 'Radiohead – A Moon Shaped Pool', 'Vinyl', null),
  ('radiohead-hail-to-the-thief-cd', 'radiohead-hail-to-the-thief', 'Radiohead – Hail to the Thief', 'Radiohead – Hail to the Thief', 'CD', null),
  ('radiohead-my-iron-lung-cd-open-box', 'radiohead-my-iron-lung', 'Radiohead – My Iron Lung', 'Radiohead – My Iron Lung', 'CD', null),
  ('radiohead-ok-computer-cd', 'radiohead-ok-computer', 'Radiohead – OK Computer', 'Radiohead – OK Computer', 'CD', null),
  ('radiohead-ok-computer-cd-open-box', 'radiohead-ok-computer', 'Radiohead – OK Computer', 'Radiohead – OK Computer', 'CD', 9750),
  ('radiohead-pablo-honey-cd-open-box', 'radiohead-pablo-honey', 'Radiohead – Pablo Honey', 'Radiohead – Pablo Honey', 'CD', null),
  ('radiohead-the-bends-cd', 'radiohead-the-bends', 'Radiohead – The Bends', 'Radiohead – The Bends', 'CD', null),
  ('ramones-dont-come-close-vinyl-open-box', 'ramones-dont-come-close', 'Ramones – Don''t Come Close', 'Ramones – Don''t Come Close', 'Vinyl', null),
  ('ratchet-clank-rift-apart-ps5-rental', 'ratchet-clank-rift-apart', 'Ratchet & Clank: Rift Apart', 'Ratchet & Clank: Rift Apart', 'PS5', null),
  ('red-dead-redemption-2-ps5-rental', 'red-dead-redemption-2', 'Red Dead Redemption 2', 'Red Dead Redemption 2', 'PS5', null),
  ('red-hot-chili-peppers-californication-cd', 'red-hot-chili-peppers-californication', 'Red Hot Chili Peppers – Californication', 'Red Hot Chili Peppers – Californication', 'CD', null),
  ('red-hot-chili-peppers-californication-cd-open-box', 'red-hot-chili-peppers-californication', 'Red Hot Chili Peppers – Californication', 'Red Hot Chili Peppers – Californication', 'CD', 9750),
  ('resident-evil-4-ps5-rental', 'resident-evil-4', 'Resident Evil 4', 'Resident Evil 4', 'PS5', null),
  ('resident-evil-village-ps5-rental', 'resident-evil-village', 'Resident Evil Village', 'Resident Evil Village', 'PS5', null),
  ('returnal-ps5-rental', 'returnal', 'Returnal', 'Returnal', 'PS5', null),
  ('revox-a77', 'revox-a77', 'Revox A77 reel-to-reel tape recorder', 'مسجّل بكرات Revox A77', 'Default', null),
  ('rich-dad-poor-dad-rental', 'rich-dad-poor-dad', 'Rich Dad Poor Dad – Robert T. Kiyosaki', 'الأب الغني والأب الفقير – روبرت كيوساكي', 'Default', null),
  ('richard-marx-repeat-offender-vinyl-open-box', 'richard-marx-repeat-offender', 'Richard Marx – Repeat Offender', 'Richard Marx – Repeat Offender', 'Vinyl', null),
  ('rick-astley-whenever-you-need-somebody-vinyl-open-box', 'rick-astley-whenever-you-need-somebody', 'Rick Astley – Whenever You Need Somebody', 'Rick Astley – Whenever You Need Somebody', 'Vinyl', null),
  ('rina-sawayama-hold-the-girl-vinyl', 'rina-sawayama-hold-the-girl', 'Rina Sawayama – Hold the Girl', 'Rina Sawayama – Hold the Girl', 'Vinyl', null),
  ('robbie-williams-reality-killed-the-video-star-cd', 'robbie-williams-reality-killed-the-video-star', 'Robbie Williams – Reality Killed the Video Star', 'Robbie Williams – Reality Killed the Video Star', 'CD', null),
  ('robert-glasper-black-radio-cd-used', 'robert-glasper-black-radio', 'Robert Glasper – Black Radio', 'Robert Glasper – Black Radio', 'CD', null),
  ('rod-stewart-vinyl', 'rod-stewart', 'Rod Stewart', 'Rod Stewart', 'Vinyl', null),
  ('rush-moving-pictures-vinyl-open-box', 'rush-moving-pictures', 'Rush – Moving Pictures', 'Rush – Moving Pictures', 'Vinyl', null),
  ('rush-prime-mover-vinyl-open-box', 'rush-prime-mover', 'Rush – Prime Mover', 'Rush – Prime Mover', 'Vinyl', null),
  ('sackboy-a-big-adventure-ps5-rental', 'sackboy-a-big-adventure', 'Sackboy: A Big Adventure', 'Sackboy: A Big Adventure', 'PS5', null),
  ('sad-cafe-facades-vinyl-open-box', 'sad-cafe-facades', 'Sad Café – Facades', 'Sad Café – Facades', 'Vinyl', null),
  ('sad-cafe-misplaced-ideals-vinyl-open-box', 'sad-cafe-misplaced-ideals', 'Sad Café – Misplaced Ideals', 'Sad Café – Misplaced Ideals', 'Vinyl', null),
  ('sahel-sounds-new-chronologies-of-sound-cd-used', 'sahel-sounds-new-chronologies-of-sound', 'Sahel Sounds New Chronologies Of Sound', 'Sahel Sounds New Chronologies Of Sound', 'CD', null),
  ('sammy-hagar-three-lock-box-vinyl-open-box', 'sammy-hagar-three-lock-box', 'Sammy Hagar – Three Lock Box', 'Sammy Hagar – Three Lock Box', 'Vinyl', null),
  ('samsung-es90', 'samsung-es90', 'Samsung ES90', 'Samsung ES90', 'Default', null),
  ('sapiens-rental', 'sapiens', 'Sapiens: A Brief History of Humankind – Yuval Noah Harari', 'العاقل: تاريخ مختصر للنوع البشري – يوفال نوح هراري', 'Default', null),
  ('sarathy-korwar-day-to-day-cd-used', 'sarathy-korwar-day-to-day', 'Sarathy Korwar – Day to Day', 'Sarathy Korwar – Day to Day', 'CD', null),
  ('saxon-denim-and-leather-vinyl', 'saxon-denim-and-leather', 'Saxon – Denim and Leather', 'Saxon – Denim and Leather', 'Vinyl', null),
  ('screaming-trees-dust-vinyl-open-box', 'screaming-trees-dust', 'Screaming Trees – Dust', 'Screaming Trees – Dust', 'Vinyl', null),
  ('season-of-migration-to-the-north-book', 'season-of-migration-to-the-north', 'Season of Migration to the North – Tayeb Salih', 'موسم الهجرة إلى الشمال – الطيب صالح', 'Default', null),
  ('season-of-migration-to-the-north-rental', 'season-of-migration-to-the-north', 'Season of Migration to the North – Tayeb Salih', 'موسم الهجرة إلى الشمال – الطيب صالح', 'Default', null),
  ('selena-gomez-rare-vinyl', 'selena-gomez-rare', 'Selena Gomez – Rare', 'Selena Gomez – Rare', 'Vinyl', null),
  ('selena-gomez-rare-vinyl-open-box', 'selena-gomez-rare', 'Selena Gomez – Rare', 'Selena Gomez – Rare', 'Vinyl', null),
  ('shabaka-and-the-ancestors-wisdom-of-elders-cd-used', 'shabaka-and-the-ancestors-wisdom-of-elders', 'Shabaka and the Ancestors – Wisdom of Elders', 'Shabaka and the Ancestors – Wisdom of Elders', 'CD', null),
  ('shai-maestro-the-dream-thief-cd-used', 'shai-maestro-the-dream-thief', 'Shai Maestro – The Dream Thief', 'Shai Maestro – The Dream Thief', 'CD', null),
  ('shawn-mendes-vinyl', 'shawn-mendes', 'Shawn Mendes', 'Shawn Mendes', 'Vinyl', null),
  ('snarky-puppy-culcha-vulcha-cd-used', 'snarky-puppy-culcha-vulcha', 'Snarky Puppy – Culcha Vulcha', 'Snarky Puppy – Culcha Vulcha', 'CD', null),
  ('sons-of-kemet-your-queen-is-a-reptile-cd-used', 'sons-of-kemet-your-queen-is-a-reptile', 'Sons of Kemet – Your Queen Is a Reptile', 'Sons of Kemet – Your Queen Is a Reptile', 'CD', null),
  ('sony-cyber-shot-dsc-h70', 'sony-cyber-shot-dsc-h70', 'Sony Cyber-shot DSC-H70', 'Sony Cyber-shot DSC-H70', 'black', null),
  ('sony-cyber-shot-dsc-p73', 'sony-cyber-shot-dsc-p73', 'Sony Cyber-shot DSC-P73', 'Sony Cyber-shot DSC-P73', 'Default', null),
  ('sony-cyber-shot-dsc-t500', 'sony-cyber-shot-dsc-t500', 'Sony Cyber-shot DSC-T500', 'Sony Cyber-shot DSC-T500', 'black', null),
  ('sony-wh-1000xm5', 'sony-wh-1000xm5', 'Sony WH-1000XM5 headphones', 'سماعات Sony WH-1000XM5', 'Default', null),
  ('spandau-ballet-journeys-to-glory-vinyl-open-box', 'spandau-ballet-journeys-to-glory', 'Spandau Ballet – Journeys to Glory', 'Spandau Ballet – Journeys to Glory', 'Vinyl', null),
  ('spider-man-across-the-spider-verse-blu-ray-rental', 'spider-man-across-the-spider-verse', 'Spider-Man: Across the Spider-Verse', 'Spider-Man: Across the Spider-Verse', 'Blu-ray', null),
  ('spirited-away-blu-ray-rental', 'spirited-away', 'Spirited Away', 'Spirited Away', 'Blu-ray', null),
  ('st-germain-tourist-cd-used', 'st-germain-tourist', 'St Germain – Tourist', 'St Germain – Tourist', 'CD', null),
  ('star-wars-jedi-survivor-ps5-rental', 'star-wars-jedi-survivor', 'Star Wars Jedi: Survivor', 'Star Wars Jedi: Survivor', 'PS5', null),
  ('starship-knee-deep-in-the-hoopla-vinyl-open-box', 'starship-knee-deep-in-the-hoopla', 'Starship – Knee Deep in the Hoopla', 'Starship – Knee Deep in the Hoopla', 'Vinyl', null),
  ('stellar-blade-ps5-rental', 'stellar-blade', 'Stellar Blade', 'Stellar Blade', 'PS5', null),
  ('steve-miller-band-abracadabra-vinyl-open-box', 'steve-miller-band-abracadabra', 'Steve Miller Band – Abracadabra', 'Steve Miller Band – Abracadabra', 'Vinyl', null),
  ('steve-miller-band-fly-like-an-eagle-vinyl-open-box', 'steve-miller-band-fly-like-an-eagle', 'Steve Miller Band – Fly Like an Eagle', 'Steve Miller Band – Fly Like an Eagle', 'Vinyl', null),
  ('steve-miller-band-the-joker-vinyl-open-box', 'steve-miller-band-the-joker', 'Steve Miller Band – The Joker', 'Steve Miller Band – The Joker', 'Vinyl', null),
  ('sting-cd', 'sting', 'Sting', 'Sting', 'CD', null),
  ('street-fighter-6-ps5-rental', 'street-fighter-6', 'Street Fighter 6', 'Street Fighter 6', 'PS5', null),
  ('super-smash-bros-ultimate', 'super-smash-bros-ultimate', 'Super Smash Bros. Ultimate', 'Super Smash Bros. Ultimate', 'Switch', null),
  ('supertramp-breakfast-in-america-vinyl-open-box', 'supertramp-breakfast-in-america', 'Supertramp – Breakfast in America', 'Supertramp – Breakfast in America', 'Vinyl', null),
  ('sylvain-rifflet-troubadours-cd-used', 'sylvain-rifflet-troubadours', 'Sylvain Rifflet – Troubadours', 'Sylvain Rifflet – Troubadours', 'CD', null),
  ('takuya-kuroda-rising-son-cd-used', 'takuya-kuroda-rising-son', 'Takuya Kuroda – Rising Son', 'Takuya Kuroda – Rising Son', 'CD', null),
  ('tame-impala-innerspeaker-vinyl', 'tame-impala-innerspeaker', 'Tame Impala – Innerspeaker', 'Tame Impala – Innerspeaker', 'Vinyl', null),
  ('taylor-mcferrin-early-riser-cd-used', 'taylor-mcferrin-early-riser', 'Taylor McFerrin – Early Riser', 'Taylor McFerrin – Early Riser', 'CD', null),
  ('taylor-swift-vinyl', 'taylor-swift', 'Taylor Swift', 'Taylor Swift', 'Vinyl', null),
  ('taylor-swift-1989-cd', 'taylor-swift-1989', 'Taylor Swift – 1989', 'Taylor Swift – 1989', 'CD', null),
  ('taylor-swift-1989-cd-open-box', 'taylor-swift-1989', 'Taylor Swift – 1989', 'Taylor Swift – 1989', 'CD', null),
  ('taylor-swift-1989-vinyl', 'taylor-swift-1989', 'Taylor Swift – 1989', 'Taylor Swift – 1989', 'Vinyl', null),
  ('taylor-swift-1989-taylors-version-cd', 'taylor-swift-1989-taylors-version', 'Taylor Swift – 1989 Taylor''s Version', 'Taylor Swift – 1989 Taylor''s Version', 'CD', null),
  ('taylor-swift-fearless-taylors-version-cd', 'taylor-swift-fearless-taylors-version', 'Taylor Swift – Fearless (Taylor’s version)', 'Taylor Swift – Fearless Taylor''s Version', 'CD', null),
  ('taylor-swift-fearless-taylors-version-vinyl', 'taylor-swift-fearless-taylors-version', 'Taylor Swift – Fearless (Taylor’s version)', 'Taylor Swift – Fearless (Taylor’s version)', 'Vinyl', null),
  ('taylor-swift-folklore-cd', 'taylor-swift-folklore', 'Taylor Swift – Folklore', 'Taylor Swift – Folklore', 'CD', null),
  ('taylor-swift-folklore-vinyl', 'taylor-swift-folklore', 'Taylor Swift – Folklore', 'Taylor Swift – Folklore', 'Vinyl', null),
  ('taylor-swift-lover-vinyl', 'taylor-swift-lover', 'Taylor Swift – Lover', 'Taylor Swift – Lover', 'Vinyl', null),
  ('taylor-swift-midnights-vinyl', 'taylor-swift-midnights', 'Taylor Swift – Midnights', 'Taylor Swift – Midnights', 'Vinyl', null),
  ('taylor-swift-red-deluxe-cd', 'taylor-swift-red-deluxe', 'Taylor Swift – Red Deluxe', 'Taylor Swift – Red Deluxe', 'CD', null),
  ('taylor-swift-red-taylors-version-cd', 'taylor-swift-red-taylors-version', 'Taylor Swift – Red Taylor''s Version', 'Taylor Swift – Red Taylor''s Version', 'CD', null),
  ('taylor-swift-reputation-vinyl', 'taylor-swift-reputation', 'Taylor Swift – Reputation', 'Taylor Swift – Reputation', 'Vinyl', null),
  ('taylor-swift-speak-now-cd', 'taylor-swift-speak-now', 'Taylor Swift – Speak Now', 'Taylor Swift – Speak Now', 'CD', null),
  ('taylor-swift-speak-now-vinyl', 'taylor-swift-speak-now', 'Taylor Swift – Speak Now', 'Taylor Swift – Speak Now', 'Vinyl', null),
  ('taylor-swift-speak-now-taylors-version-cd', 'taylor-swift-speak-now-taylors-version', 'Taylor Swift – Speak Now Taylor''s Version', 'Taylor Swift – Speak Now Taylor''s Version', 'CD', null),
  ('taylor-swift-speak-now-taylors-version-vinyl', 'taylor-swift-speak-now-taylors-version', 'Taylor Swift – Speak Now Taylor''s Version', 'Taylor Swift – Speak Now Taylor''s Version', 'Vinyl', null),
  ('taylor-swift-the-tortured-poets-department-cd', 'taylor-swift-the-tortured-poets-department', 'Taylor Swift – THE TORTURED POETS DEPARTMENT', 'Taylor Swift – THE TORTURED POETS DEPARTMENT', 'CD', null),
  ('taylor-swift-the-tortured-poets-department-vinyl', 'taylor-swift-the-tortured-poets-department', 'Taylor Swift – THE TORTURED POETS DEPARTMENT', 'Taylor Swift – THE TORTURED POETS DEPARTMENT', 'Vinyl', null),
  ('tekken-8-ps5', 'tekken-8', 'Tekken 8', 'Tekken 8', 'PS5', null),
  ('tekken-8-ps5-rental', 'tekken-8', 'Tekken 8', 'Tekken 8', 'PS5', null),
  ('ten-years-after-recorded-live-vinyl-open-box', 'ten-years-after-recorded-live', 'Ten Years After – Recorded Live', 'Ten Years After – Recorded Live', 'Vinyl', null),
  ('ten-years-after-undead-vinyl-open-box', 'ten-years-after-undead', 'Ten Years After – Undead', 'Ten Years After – Undead', 'Vinyl', null),
  ('the-1975-the-1975-vinyl', 'the-1975-the-1975', 'The 1975 – The 1975', 'The 1975 – The 1975', 'Vinyl', null),
  ('the-48-laws-of-power-rental', 'the-48-laws-of-power', 'The 48 Laws of Power – Robert Greene', 'كيف تمسك بزمام القوة – روبرت غرين', 'Default', null),
  ('the-alan-parsons-project-eve-vinyl-open-box', 'the-alan-parsons-project-eve', 'The Alan Parsons Project – Eve', 'The Alan Parsons Project – Eve', 'Vinyl', null),
  ('the-alan-parsons-project-eye-in-the-sky-vinyl-open-box', 'the-alan-parsons-project-eye-in-the-sky', 'The Alan Parsons Project – Eye in the Sky', 'The Alan Parsons Project – Eye in the Sky', 'Vinyl', null),
  ('the-alan-parsons-project-the-turn-of-a-friendly-card-vinyl-open-box', 'the-alan-parsons-project-the-turn-of-a-friendly-card', 'The Alan Parsons Project – The Turn of a Friendly Card', 'The Alan Parsons Project – The Turn of a Friendly Card', 'Vinyl', null),
  ('the-bamboo-stalk-rental', 'the-bamboo-stalk', 'The Bamboo Stalk – Saud Alsanousi', 'ساق البامبو – سعود السنعوسي', 'Default', null),
  ('the-barron-knights-latest-and-greatest-cd', 'the-barron-knights-latest-and-greatest', 'The Barron Knights – Latest & Greatest', 'The Barron Knights – Latest & Greatest', 'CD', null),
  ('the-beatles-a-hard-days-night-vinyl', 'the-beatles-a-hard-days-night', 'The Beatles – A Hard Day’s Night', 'The Beatles – A Hard Day’s Night', 'Vinyl', null),
  ('the-beatles-let-it-be-vinyl', 'the-beatles-let-it-be', 'The Beatles – Let It Be', 'The Beatles – Let It Be', 'Vinyl', null),
  ('the-beatles-magical-mystery-tour-vinyl', 'the-beatles-magical-mystery-tour', 'The Beatles – Magical Mystery Tour', 'The Beatles – Magical Mystery Tour', 'Vinyl', null),
  ('the-beatles-rubber-soul-vinyl', 'the-beatles-rubber-soul', 'The Beatles – Rubber Soul', 'The Beatles – Rubber Soul', 'Vinyl', null),
  ('the-beatles-yellow-submarine-vinyl', 'the-beatles-yellow-submarine', 'The Beatles – Yellow Submarine', 'The Beatles – Yellow Submarine', 'Vinyl', null),
  ('the-comet-is-coming-trust-in-the-lifeforce-of-the-deep-mystery-cd-used', 'the-comet-is-coming-trust-in-the-lifeforce-of-the-deep-mystery', 'The Comet Is Coming – Trust In The Lifeforce Of The Deep Mystery', 'The Comet Is Coming – Trust In The Lifeforce Of The Deep Mystery', 'CD', null),
  ('the-corrs-forgiven-not-forgotten-cd-open-box', 'the-corrs-forgiven-not-forgotten', 'The Corrs – Forgiven, Not Forgotten', 'The Corrs – Forgiven, Not Forgotten', 'CD', null),
  ('the-creek-vinyl', 'the-creek', 'The Creek', 'The Creek', 'Vinyl', null),
  ('the-cure-greatest-hits-cd', 'the-cure-greatest-hits', 'The Cure – Greatest Hits', 'The Cure – Greatest Hits', 'CD', null),
  ('the-da-vinci-code-rental', 'the-da-vinci-code', 'The Da Vinci Code – Dan Brown', 'شيفرة دافنشي – دان براون', 'Default', null),
  ('the-dark-knight-blu-ray-rental', 'the-dark-knight', 'The Dark Knight', 'The Dark Knight', 'Blu-ray', null),
  ('the-doors-vinyl', 'the-doors', 'The Doors', 'The Doors', 'Vinyl', null),
  ('the-godfather-blu-ray-rental', 'the-godfather', 'The Godfather', 'The Godfather', 'Blu-ray', null),
  ('the-grand-budapest-hotel-blu-ray-rental', 'the-grand-budapest-hotel', 'The Grand Budapest Hotel', 'The Grand Budapest Hotel', 'Blu-ray', null),
  ('the-great-gatsby-rental', 'the-great-gatsby', 'The Great Gatsby – F. Scott Fitzgerald', 'غاتسبي العظيم – ف. سكوت فيتزجيرالد', 'Default', null),
  ('the-hobbit-rental', 'the-hobbit', 'The Hobbit – J. R. R. Tolkien', 'الهوبيت – ج. ر. ر. تولكين', 'Default', null),
  ('the-jacksons-destiny-vinyl-open-box', 'the-jacksons-destiny', 'The Jacksons – Destiny', 'The Jacksons – Destiny', 'Vinyl', null),
  ('the-kite-runner-rental', 'the-kite-runner', 'The Kite Runner – Khaled Hosseini', 'عدّاء الطائرة الورقية – خالد حسيني', 'Default', null),
  ('the-last-of-us-part-i-ps5-rental', 'the-last-of-us-part-i', 'The Last of Us Part I', 'The Last of Us Part I', 'PS5', null),
  ('the-last-of-us-part-ii-remastered-ps5-rental', 'the-last-of-us-part-ii-remastered', 'The Last of Us Part II Remastered', 'The Last of Us Part II Remastered', 'PS5', null),
  ('the-lion-king-collection-ost-cd-open-box', 'the-lion-king-collection-ost', 'The Lion King Collection OST', 'The Lion King Collection OST', 'CD', null),
  ('the-little-prince-book', 'the-little-prince', 'The Little Prince – Antoine de Saint-Exupéry', 'الأمير الصغير – أنطوان دو سانت إكزوبيري', 'Default', null),
  ('the-little-prince-rental', 'the-little-prince', 'The Little Prince – Antoine de Saint-Exupéry', 'الأمير الصغير – أنطوان دو سانت إكزوبيري', 'Default', null),
  ('the-lord-of-the-rings-the-fellowship-of-the-ring-blu-ray-rental', 'the-lord-of-the-rings-the-fellowship-of-the-ring', 'The Lord of the Rings: The Fellowship of the Ring', 'The Lord of the Rings: The Fellowship of the Ring', 'Blu-ray', null),
  ('the-lumineers-brightside-vinyl', 'the-lumineers-brightside', 'The Lumineers – Brightside', 'The Lumineers – Brightside', 'Vinyl', null),
  ('the-matrix-blu-ray-rental', 'the-matrix', 'The Matrix', 'The Matrix', 'Blu-ray', null),
  ('the-moody-blues-caught-live-5-vinyl-open-box', 'the-moody-blues-caught-live-5', 'The Moody Blues – Caught Live + 5', 'The Moody Blues – Caught Live + 5', 'Vinyl', null),
  ('the-prophet-book', 'the-prophet', 'The Prophet – Kahlil Gibran', 'النبي – جبران خليل جبران', 'Default', null),
  ('the-prophet-rental', 'the-prophet', 'The Prophet – Kahlil Gibran', 'النبي – جبران خليل جبران', 'Default', null),
  ('the-psychology-of-money-book', 'the-psychology-of-money', 'The Psychology of Money – Morgan Housel', 'سيكولوجية المال – مورغان هاوسل', 'Default', null),
  ('the-psychology-of-money-rental', 'the-psychology-of-money', 'The Psychology of Money – Morgan Housel', 'سيكولوجية المال – مورغان هاوسل', 'Default', null),
  ('the-rolling-stones-vinyl', 'the-rolling-stones', 'The Rolling Stones', 'The Rolling Stones', 'Vinyl', null),
  ('the-shadows-20-golden-greats-vinyl-open-box', 'the-shadows-20-golden-greats', 'The Shadows – 20 Golden Greats', 'The Shadows – 20 Golden Greats', 'Vinyl', null),
  ('the-shadows-silver-album-vinyl-open-box', 'the-shadows-silver-album', 'The Shadows – Silver Album', 'The Shadows – Silver Album', 'Vinyl', null),
  ('the-shadows-simply-shadows-vinyl-open-box', 'the-shadows-simply-shadows', 'The Shadows – Simply Shadows', 'The Shadows – Simply Shadows', 'Vinyl', null),
  ('the-smiths-vinyl', 'the-smiths', 'The Smiths', 'The Smiths', 'Vinyl', null),
  ('the-vampire-diaries-ost-cd-open-box', 'the-vampire-diaries-ost', 'The Vampire Diaries OST', 'The Vampire Diaries OST', 'CD', null),
  ('the-weeknd-cd', 'the-weeknd', 'The Weeknd', 'The Weeknd', 'CD', null),
  ('the-weeknd-after-hours-cd', 'the-weeknd-after-hours', 'The Weeknd – After Hours', 'The Weeknd – After Hours', 'CD', null),
  ('the-weeknd-after-hours-vinyl', 'the-weeknd-after-hours', 'The Weeknd – After Hours', 'The Weeknd – After Hours', 'Vinyl', null),
  ('the-weeknd-dawn-fm-cd', 'the-weeknd-dawn-fm', 'The Weeknd – Dawn FM', 'The Weeknd – Dawn FM', 'CD', null),
  ('the-weeknd-echoes-of-silence-cd', 'the-weeknd-echoes-of-silence', 'The Weeknd – Echoes of Silence', 'The Weeknd – Echoes of Silence', 'CD', null),
  ('the-weeknd-echoes-of-silence-vinyl', 'the-weeknd-echoes-of-silence', 'The Weeknd – Echoes of Silence', 'The Weeknd – Echoes of Silence', 'Vinyl', null),
  ('the-weeknd-house-of-balloons-cd', 'the-weeknd-house-of-balloons', 'The Weeknd – House of Balloons', 'The Weeknd – House of Balloons', 'CD', null),
  ('the-weeknd-kiss-land-cd', 'the-weeknd-kiss-land', 'The Weeknd – Kiss Land', 'The Weeknd – Kiss Land', 'CD', null),
  ('the-weeknd-kiss-land-vinyl', 'the-weeknd-kiss-land', 'The Weeknd – Kiss Land', 'The Weeknd – Kiss Land', 'Vinyl', null),
  ('the-weeknd-my-dear-melancholy-cd', 'the-weeknd-my-dear-melancholy', 'The Weeknd – My Dear Melancholy', 'The Weeknd – My Dear Melancholy', 'CD', null),
  ('the-weeknd-starboy-cd', 'the-weeknd-starboy', 'The Weeknd – Starboy', 'The Weeknd – Starboy', 'CD', null),
  ('the-weeknd-starboy-vinyl-open-box', 'the-weeknd-starboy', 'The Weeknd – Starboy', 'The Weeknd – Starboy', 'Vinyl', null),
  ('the-weeknd-the-highlights-cd', 'the-weeknd-the-highlights', 'The Weeknd – The Highlights', 'The Weeknd – The Highlights', 'CD', null),
  ('the-weeknd-thursday-cd', 'the-weeknd-thursday', 'The Weeknd – Thursday', 'The Weeknd – Thursday', 'CD', null),
  ('thin-lizzy-jailbreak-vinyl', 'thin-lizzy-jailbreak', 'Thin Lizzy – Jailbreak', 'Thin Lizzy – Jailbreak', 'Vinyl', null),
  ('thinking-fast-and-slow-rental', 'thinking-fast-and-slow', 'Thinking, Fast and Slow – Daniel Kahneman', 'التفكير السريع والبطيء – دانيال كانمان', 'Default', null),
  ('thundercat-drunk-cd-used', 'thundercat-drunk', 'Thundercat – Drunk', 'Thundercat – Drunk', 'CD', null),
  ('tigran-hamasyan-the-call-within-cd-used', 'tigran-hamasyan-the-call-within', 'Tigran Hamasyan – The Call Within', 'Tigran Hamasyan – The Call Within', 'CD', null),
  ('timex-expedition', 'timex-expedition', 'Timex Expedition watch', 'ساعة Timex Expedition', 'Default', null),
  ('timex-expedition-vinyl', 'timex-expedition', 'Timex Expedition watch', 'Timex – Expedition (أسطوانة فينيل)', 'Default', null),
  ('to-kill-a-mockingbird-rental', 'to-kill-a-mockingbird', 'To Kill a Mockingbird – Harper Lee', 'أن تقتل طائراً بريئاً – هاربر لي', 'Default', null),
  ('tom-odell-vinyl', 'tom-odell', 'Tom Odell', 'Tom Odell', 'Vinyl', null),
  ('tom-odell-long-way-down-vinyl', 'tom-odell-long-way-down', 'Tom Odell – Long Way Down', 'Tom Odell – Long Way Down', 'Vinyl', null),
  ('top-gun-maverick-blu-ray-rental', 'top-gun-maverick', 'Top Gun: Maverick', 'Top Gun: Maverick', 'Blu-ray', null),
  ('touch-ringtones-cd-used', 'touch-ringtones', 'Touch Ringtones', 'Touch Ringtones', 'CD', null),
  ('traffic-john-barleycorn-must-die-vinyl-open-box', 'traffic-john-barleycorn-must-die', 'Traffic – John Barleycorn Must Die', 'Traffic – John Barleycorn Must Die', 'Vinyl', null),
  ('traffic-on-the-road-vinyl-open-box', 'traffic-on-the-road', 'Traffic – On the Road', 'Traffic – On the Road', 'Vinyl', null),
  ('travis-scott-astroworld-vinyl', 'travis-scott-astroworld', 'Travis Scott – Astroworld', 'Travis Scott – Astroworld', 'Vinyl', null),
  ('travis-the-man-who-cd-open-box', 'travis-the-man-who', 'Travis – The Man Who', 'Travis – The Man Who', 'CD', null),
  ('turntable', 'turntable', 'Turntable', 'مشغل أسطوانات', 'Default', null),
  ('tyler-perrys-why-did-i-get-married-ost-cd-open-box', 'tyler-perrys-why-did-i-get-married-ost', 'Tyler Perry''s Why Did I Get Married OST', 'Tyler Perry''s Why Did I Get Married OST', 'CD', null),
  ('tyler-the-creator-flower-boy-vinyl', 'tyler-the-creator-flower-boy', 'Tyler, the Creator – Flower Boy', 'Tyler, the Creator – Flower Boy', 'Vinyl', null),
  ('tyler-the-creator-goblin-vinyl', 'tyler-the-creator-goblin', 'Tyler, the Creator – Goblin', 'Tyler, the Creator – Goblin', 'Vinyl', null),
  ('uncharted-legacy-of-thieves-collection-ps5-rental', 'uncharted-legacy-of-thieves-collection', 'Uncharted: Legacy of Thieves Collection', 'Uncharted: Legacy of Thieves Collection', 'PS5', null),
  ('van-halen-diver-down-vinyl-open-box', 'van-halen-diver-down', 'Van Halen – Diver Down', 'Van Halen – Diver Down', 'Vinyl', null),
  ('van-halen-ou812-vinyl-open-box', 'van-halen-ou812', 'Van Halen – OU812', 'Van Halen – OU812', 'Vinyl', null),
  ('various-artists-euphoria-season-2-soundtrack-vinyl', 'various-artists-euphoria-season-2-soundtrack', 'Various Artists – Euphoria: Season 2 Soundtrack', 'Various Artists – Euphoria: Season 2 Soundtrack', 'Vinyl', null),
  ('various-artists-road-kill-vol-1-3-cd-used', 'various-artists-road-kill-vol-1-3', 'Various Artists Road Kill Vol. 1-3', 'Various Artists Road Kill Vol. 1-3', 'CD', null),
  ('vels-trio-celestial-greens-cd-used', 'vels-trio-celestial-greens', 'Vels Trio – Celestial Greens', 'Vels Trio – Celestial Greens', 'CD', null),
  ('verushka-ost-cd-open-box', 'verushka-ost', 'Verushka OST', 'Verushka OST', 'CD', null),
  ('vinyl-inner-sleeves-50', 'vinyl-inner-sleeves-50', 'Anti-static inner sleeves (50 pack)', 'أغلفة داخلية مضادة للكهرباء الساكنة (50 قطعة)', 'Default', null),
  ('vinyl-record-cleaning-kit', 'vinyl-record-cleaning-kit', 'Vinyl record cleaning kit', 'طقم تنظيف أسطوانات الفينيل', 'Default', null),
  ('virgin-babylon-records-one-minute-older-cd-used', 'virgin-babylon-records-one-minute-older', 'Virgin Babylon Records One Minute Older', 'Virgin Babylon Records One Minute Older', 'CD', null),
  ('westlife-vinyl', 'westlife', 'Westlife', 'Westlife', 'Vinyl', null),
  ('wham-cd', 'wham', 'Wham!', 'Wham!', 'CD', null),
  ('wham-last-christmas-vinyl', 'wham-last-christmas', 'Wham! – Last Christmas', 'Wham! – Last Christmas', 'Vinyl', null),
  ('whitesnake-live-in-the-heart-of-the-city-vinyl-open-box', 'whitesnake-live-in-the-heart-of-the-city', 'Whitesnake – Live… In the Heart of the City', 'Whitesnake – Live… In the Heart of the City', 'Vinyl', null),
  ('whitney-houston-i-wish-you-love-more-from-the-bodyguard-vinyl', 'whitney-houston-i-wish-you-love-more-from-the-bodyguard', 'Whitney Houston – I Wish You Love More from the Bodyguard', 'Whitney Houston – I Wish You Love More from the Bodyguard', 'Vinyl', null),
  ('whitney-houston-my-love-is-your-love-cd', 'whitney-houston-my-love-is-your-love', 'Whitney Houston – My Love Is Your Love', 'Whitney Houston – My Love Is Your Love', 'CD', null),
  ('will-young-anything-is-possible-evergreen-cd-open-box', 'will-young-anything-is-possible-evergreen', 'Will Young – Anything is Possible/Evergreen', 'Will Young – Anything is Possible/Evergreen', 'CD', null),
  ('will-young-keep-on-cd', 'will-young-keep-on', 'Will Young – Keep On', 'Will Young – Keep On', 'CD', null),
  ('willie-rosario-back-to-the-future-vinyl', 'willie-rosario-back-to-the-future', 'Willie Rosario – Back to the Future', 'Willie Rosario – Back to the Future', 'Vinyl', null),
  ('yazz-ahmed-la-saboteuse-cd-used', 'yazz-ahmed-la-saboteuse', 'Yazz Ahmed – La Saboteuse', 'Yazz Ahmed – La Saboteuse', 'CD', null),
  ('yes-cd', 'yes', 'Yes', 'Yes', 'CD', null),
  ('your-name-blu-ray-rental', 'your-name', 'Your Name', 'Your Name', 'Blu-ray', null),
  ('yussef-kamaal-black-focus-cd-used', 'yussef-kamaal-black-focus', 'Yussef Kamaal – Black Focus', 'Yussef Kamaal – Black Focus', 'CD', null),
  ('zack-sekoff-remixes-cd-used', 'zack-sekoff-remixes', 'Zack Sekoff – Remixes', 'Zack Sekoff – Remixes', 'CD', null),
  ('zelda-tears-of-the-kingdom', 'zelda-tears-of-the-kingdom', 'The Legend of Zelda: Tears of the Kingdom', 'The Legend of Zelda: Tears of the Kingdom', 'Switch', null)
;

-- ── Merging ────────────────────────────────────────────────────────────────

-- Folds the plan's products into one product per new slug. The product
-- kept (the "survivor") is the one already at the new slug, else the new
-- copy for sale; each version gets a variant (the survivor's own one for
-- its version), every copy and reference moves to the survivor and its
-- variant, and the other products are deleted.
do $$
declare
  grp record;
  survivor public.products;
  version record;
  primary_member public.products;
  member record;
  target_variant uuid;
  versions integer;
  live_slug text;
begin
  for grp in select distinct new_slug from reshape_plan order by new_slug loop
    -- The members still in this database, best survivor first.
    create temporary table members on commit drop as
      select p.*, r.version, r.copy_price, r.name_en as new_name_en, r.name_ar as new_name_ar,
        cat.slug as category_slug
      from public.products p
      join reshape_plan r on r.old_slug = p.slug
      left join public.product_categories cat on cat.id = p.category_id
      where r.new_slug = grp.new_slug;

    if not exists (select 1 from members) then
      drop table members;
      continue;
    end if;

    select slug into live_slug from public.products
    where slug = grp.new_slug and slug not in (select slug from members);
    if live_slug is not null then
      raise exception 'Reshape: % is taken by a product outside its group', grp.new_slug;
    end if;

    select p.* into survivor from public.products p
    join members m on m.id = p.id
    order by (m.slug = grp.new_slug) desc, (m.kind = 'sale') desc, (m.condition = 'new') desc,
      (m.status = 'active') desc, m.created_at, m.id
    limit 1;

    select count(distinct m.version) into versions from members m;

    -- One variant per version, priced like its copy for sale, new.
    for version in
      select v.* from reshape_versions v
      where v.version in (select m.version from members m)
      order by v.position
    loop
      select p.* into primary_member from public.products p
      join members m on m.id = p.id
      where m.version = version.version
      order by (m.id = survivor.id) desc, (m.kind = 'sale') desc, (m.condition = 'new') desc,
        (m.status = 'active') desc, m.created_at, m.id
      limit 1;

      if primary_member.id = survivor.id then
        select v.id into target_variant from public.product_variants v
        where v.product_id = survivor.id
        order by v.position, v.created_at limit 1;
        update public.product_variants set
          label_en = version.label_en,
          label_ar = version.label_ar,
          attributes = version.attributes,
          position = version.position
        where id = target_variant;
      else
        insert into public.product_variants (
          product_id, label_en, label_ar, attributes, price, compare_at_price,
          images, position, stock_count, rental_stock
        )
        values (
          survivor.id, version.label_en, version.label_ar, version.attributes,
          primary_member.price, primary_member.compare_at_price,
          case
            when primary_member.images is distinct from survivor.images then primary_member.images
            else '{}'
          end,
          version.position, 0, 0
        )
        returning id into target_variant;
      end if;

      -- Every member of this version: its copies (priced on their own when
      -- they aren't the variant's new copies for sale) and references.
      for member in select m.* from members m where m.version = version.version loop
        update public.stock_items s set
          price = case
            when s.purpose <> 'sale' then s.price
            when member.copy_price is not null then member.copy_price
            when member.id = primary_member.id and member.condition = 'new' then s.price
            else coalesce(s.price, member.price)
          end,
          product_id = survivor.id,
          variant_id = target_variant
        where s.product_id = member.id;

        if member.id <> survivor.id then
          update public.order_items set product_id = survivor.id, variant_id = target_variant
          where product_id = member.id;
          update public.rentals set product_id = survivor.id, variant_id = target_variant
          where product_id = member.id;
          update public.cart_items c set product_id = survivor.id, variant_id = target_variant
          where c.product_id = member.id and not exists (
            select 1 from public.cart_items o
            where o.user_id = c.user_id and o.product_id = survivor.id
              and o.variant_id = target_variant and o.condition is not distinct from c.condition
          );
          insert into public.wishlist_items (user_id, product_id, created_at)
          select w.user_id, survivor.id, w.created_at from public.wishlist_items w
          where w.product_id = member.id
          on conflict do nothing;
          update public.product_reviews r set product_id = survivor.id
          where r.product_id = member.id and not exists (
            select 1 from public.product_reviews o
            where o.product_id = survivor.id and o.user_id = r.user_id
          );
          update public.trade_ins set product_id = survivor.id where product_id = member.id;
          update public.bulb_entries set product_id = survivor.id where product_id = member.id;
          update public.quote_lines set product_id = survivor.id where product_id = member.id;
        end if;
      end loop;
    end loop;

    -- The title itself: its new name, the best of its members' details, no
    -- condition notes (each copy has its own), no format in the description
    -- once there are several.
    update public.products p set
      slug = grp.new_slug,
      name_en = (select m.new_name_en from members m limit 1),
      name_ar = (select m.new_name_ar from members m limit 1),
      kind = case when exists (select 1 from members m where m.kind = 'sale') then 'sale' else 'rental' end::public.product_kind,
      status = case when exists (select 1 from members m where m.status = 'active') then 'active' else p.status end,
      featured = exists (select 1 from members m where m.featured),
      condition = 'new',
      rental_tier = (select max(m.rental_tier) from members m),
      images = case
        when cardinality(p.images) > 0 then p.images
        else coalesce((select m.images from members m where cardinality(m.images) > 0 order by m.created_at limit 1), p.images)
      end,
      details = case when versions > 1 then p.details - 'Format' - 'Platform' - 'Color' else p.details end,
      description_en = (
        select case when versions > 1 then regexp_replace(d, ',? on (CD|vinyl|cassette)\.', '.', 'g') else d end
        from regexp_replace(coalesce(p.description_en, ''),
          ' (Open box: opened before, checked by us and complete\.|Used: played before and checked by us\.)', '', 'g') d
      ),
      description_ar = (
        select case when versions > 1 then regexp_replace(d, '،? على (قرص CD|أسطوانة فينيل|كاسيت)\.', '.', 'g') else d end
        from regexp_replace(coalesce(p.description_ar, ''),
          ' (علبة مفتوحة: فُتحت من قبل، وفحصناها وهي كاملة\.|مستعمل: استُخدم من قبل وفحصناه\.)', '', 'g') d
      )
    where p.id = survivor.id;

    -- A merged title sold in the shop sits in its shop category.
    update public.products p set category_id = coalesce((
      select m.category_id from members m where m.kind = 'sale' and m.category_id is not null
      order by (m.id = survivor.id) desc limit 1
    ), p.category_id)
    where p.id = survivor.id;

    delete from public.products where id in (select m.id from members m where m.id <> survivor.id);

    perform private.sync_product_variants(survivor.id);
    drop table members;
  end loop;
end;
$$;

-- ── Retired columns ────────────────────────────────────────────────────────

drop index if exists public.products_group_key_idx;
alter table public.products drop column group_key;
alter table public.product_categories drop column kind;

-- ── Listings ───────────────────────────────────────────────────────────────

-- The categories a tab lists: the shop's (`for_rent` false: with products
-- for sale) or the Rent tab's (with rentable products), in their order.
-- Visitors see active products only (products' RLS), so a category shows
-- once it has something to buy or rent.
create function public.listed_categories(for_rent boolean default false)
returns setof public.product_categories
language sql
stable
security invoker
set search_path = ''
as $$
  select c.* from public.product_categories c
  where exists (
    select 1 from public.products p
    where p.category_id = c.id and p.status = 'active'
      and case when for_rent then p.rentable else p.kind = 'sale' end
  )
  order by c.position, c.name_en;
$$;

comment on function public.listed_categories(boolean) is
  'The categories with active products for sale (default) or for rent, in their order.';

revoke all on function public.listed_categories(boolean) from public;
grant execute on function public.listed_categories(boolean) to anon, authenticated, service_role;

-- Search by tab: the shop finds products for sale, the Rent tab every
-- rentable product.
create or replace function public.search_products(
  search_term text,
  search_kind public.product_kind default null,
  search_category text default null
)
returns setof public.products
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    select
      private.normalize_search(left(search_term, 100)) as q,
      replace(replace(replace(
        private.normalize_search(left(search_term, 100)),
        '\', '\\'), '%', '\%'), '_', '\_') as pattern
  )
  select p.*
  from public.products p
  cross join term t
  left join public.product_categories c on c.id = p.category_id
  cross join lateral (
    select
      private.product_search_text(
        p.name_ar, p.name_en, p.description_ar, p.description_en, p.details, p.variant_text
      ) as doc,
      private.normalize_search(p.name_en) as en,
      private.normalize_search(p.name_ar) as ar
  ) s
  where t.q <> ''
    and p.status = 'active'
    and (
      search_kind is null
      or (search_kind = 'rental' and p.rentable)
      or (search_kind = 'sale' and p.kind = 'sale')
    )
    and (search_category is null or c.slug = search_category)
    and (
      s.doc like '%' || t.pattern || '%'
      or t.q operator(extensions.<%) s.doc
      or not exists (
        select 1 from regexp_split_to_table(t.q, ' ') w (word)
        where strpos(s.doc, w.word) = 0
      )
    )
  order by
    case
      when s.en = t.q or s.ar = t.q then 0
      when starts_with(s.en, t.q) or starts_with(s.ar, t.q) then 1
      when strpos(s.en, t.q) > 0 or strpos(s.ar, t.q) > 0 then 2
      when strpos(s.doc, t.q) > 0 then 3
      when not exists (
        select 1 from regexp_split_to_table(t.q, ' ') w (word)
        where strpos(s.doc, w.word) = 0
      ) then 4
      else 5
    end,
    extensions.word_similarity(t.q, s.doc) desc,
    p.featured desc,
    p.created_at desc,
    p.id;
$$;
