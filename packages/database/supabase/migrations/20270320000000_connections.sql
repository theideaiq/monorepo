-- Connections and standards (brief section 25).
--
-- * Product data: each product keeps the IDs it was looked up by
--   (`products.external_ids`, e.g. {"openlibrary": "OL…", "musicbrainz":
--   "…", "discogs": "123", "igdb": "…", "tmdb": "movie/…", "bgg": "…",
--   "scryfall": "…", "pokemontcg": "…"}). Barcodes are GTINs (EAN-13,
--   UPC-A, ISBN-13); the apps check the digit before saving.
-- * "Import your list" (Pass → Saved → Lists): `import_list_items` puts
--   what matches the catalog (by ISBN or barcode, an external ID, or the
--   title and creator) in the list with price-drop and back-in-stock
--   alerts, and keeps the rest as wanted items (`wanted_items`, Notify me).
--   When a matching product goes live, the wanted item joins the list and
--   the member is told (`wanted_in_store`).
-- * "Vinyl from artists you listen to": `music_tastes` holds the artists
--   from the member's Spotify or Last.fm (written by the API after the
--   member connects); `vinyl_from_my_artists` lists the Store's vinyl by
--   those artists. Spotify's refresh token stays in `private.music_tokens`.

-- ── External IDs ───────────────────────────────────────────────────────────

alter table public.products
  add column external_ids jsonb not null default '{}'::jsonb
    check (jsonb_typeof(external_ids) = 'object');

comment on column public.products.external_ids is
  'The IDs the product was looked up by, per source (openlibrary, googlebooks, musicbrainz, discogs, igdb, tmdb, bgg, scryfall, pokemontcg).';

create index products_external_ids_idx on public.products using gin (external_ids jsonb_path_ops);

-- ── Wanted items ───────────────────────────────────────────────────────────

create table public.wanted_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid references public.saved_lists (id) on delete cascade,
  source text not null check (source in ('goodreads', 'storygraph', 'letterboxd', 'discogs', 'steam')),
  kind text not null check (kind in ('book', 'film', 'record', 'game')),
  title text not null check (char_length(title) between 1 and 300),
  creator text check (char_length(creator) <= 200),
  year integer check (year between 1000 and 3000),
  -- ISBN-13 or another GTIN, digits only.
  barcode text check (barcode ~ '^[0-9]{8,14}$'),
  -- The source's own ID, e.g. {"discogs": "123"} or {"steam": "730"}.
  external_ids jsonb not null default '{}'::jsonb check (jsonb_typeof(external_ids) = 'object'),
  -- Set once a product matching it went live and joined the list.
  product_id uuid references public.products (id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.wanted_items is
  'Items a member imported that the catalog doesn''t have yet (Notify me); they join the list when a matching product goes live.';

create unique index wanted_items_unique_idx on public.wanted_items
  (user_id, source, coalesce(barcode, ''), lower(title), coalesce(lower(creator), ''));
create index wanted_items_list_idx on public.wanted_items (list_id);
create index wanted_items_product_idx on public.wanted_items (product_id);
create index wanted_items_barcode_idx on public.wanted_items (barcode) where matched_at is null;
create index wanted_items_open_idx on public.wanted_items (lower(title)) where matched_at is null;

alter table public.wanted_items enable row level security;

create policy "Members see their wanted items" on public.wanted_items
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members remove their wanted items" on public.wanted_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.wanted_items from anon, authenticated;
grant select, delete on public.wanted_items to authenticated;

-- The live product an imported item names: by barcode (a variant's or the
-- product's details ISBN), by external ID, else by the folded title (and
-- creator, when given) in the right category.
create function private.match_product(
  item_kind text,
  item_title text,
  item_creator text,
  item_barcode text,
  item_ids jsonb
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found uuid;
  family text := case item_kind
    when 'book' then 'books' when 'film' then 'films'
    when 'record' then 'music' when 'game' then 'games' end;
begin
  if item_barcode is not null then
    select v.product_id into found
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.barcode = item_barcode and v.active and p.status = 'active'
    limit 1;
    if found is not null then
      return found;
    end if;
  end if;

  if item_ids is not null and item_ids <> '{}'::jsonb then
    select p.id into found
    from public.products p
    where p.status = 'active' and p.external_ids @> item_ids
    limit 1;
    if found is not null then
      return found;
    end if;
  end if;

  select p.id into found
  from public.products p
  join public.product_categories c on c.id = p.category_id
  left join public.product_categories parent on parent.id = c.parent_id
  where p.status = 'active'
    and coalesce(parent.slug, c.slug) = family
    and private.normalize_search(p.name_en) = private.normalize_search(item_title)
    and (
      item_creator is null
      or private.normalize_search(coalesce(p.details ->> 'Artist', p.details ->> 'Author', item_creator))
        = private.normalize_search(item_creator)
    )
  order by p.created_at
  limit 1;
  return found;
end;
$$;

-- Imports a member's list: matched items join `list` with alerts on; the
-- rest are kept as wanted. At most 2,000 items a call.
create function private.import_list_items(list uuid, items jsonb)
returns table (matched integer, wanted integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item jsonb;
  product uuid;
  item_source text;
  item_kind text;
  item_title text;
  item_creator text;
  item_barcode text;
  item_ids jsonb;
  matched_count integer := 0;
  wanted_count integer := 0;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.saved_lists l where l.id = list and l.user_id = caller) then
    raise exception 'Not your list' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 2000 then
    raise exception 'Up to 2,000 items at a time' using errcode = 'check_violation';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    item_source := item ->> 'source';
    item_kind := item ->> 'kind';
    item_title := nullif(left(trim(coalesce(item ->> 'title', '')), 300), '');
    item_creator := nullif(left(trim(coalesce(item ->> 'creator', '')), 200), '');
    item_barcode := nullif(regexp_replace(coalesce(item ->> 'barcode', ''), '[^0-9]', '', 'g'), '');
    item_ids := coalesce(item -> 'external_ids', '{}'::jsonb);
    if item_title is null
      or item_source not in ('goodreads', 'storygraph', 'letterboxd', 'discogs', 'steam')
      or item_kind not in ('book', 'film', 'record', 'game') then
      continue;
    end if;
    if item_barcode is not null and item_barcode !~ '^[0-9]{8,14}$' then
      item_barcode := null;
    end if;
    if jsonb_typeof(item_ids) <> 'object' then
      item_ids := '{}'::jsonb;
    end if;

    product := private.match_product(item_kind, item_title, item_creator, item_barcode, item_ids);
    if product is not null then
      insert into public.wishlist_items (user_id, product_id, list_id, notify)
      values (caller, product, list, true)
      on conflict do nothing;
      matched_count := matched_count + 1;
    else
      insert into public.wanted_items (user_id, list_id, source, kind, title, creator, year, barcode, external_ids)
      values (
        caller, list, item_source, item_kind, item_title, item_creator,
        case when (item ->> 'year') ~ '^[0-9]{4}$' then (item ->> 'year')::integer end,
        item_barcode, item_ids
      )
      on conflict do nothing;
      wanted_count := wanted_count + 1;
    end if;
  end loop;

  return query select matched_count, wanted_count;
end;
$$;

create function public.import_list_items(list uuid, items jsonb)
returns table (matched integer, wanted integer)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.import_list_items(list, items) $$;

comment on function public.import_list_items(uuid, jsonb) is
  'Imports a member''s list (Goodreads, StoryGraph, Letterboxd, Discogs, Steam): matches join the list with alerts, the rest are wanted (Notify me).';

-- When a product goes live, the wanted items it matches join their lists
-- and their members are told.
create function private.match_wanted_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted public.wanted_items;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return null;
  end if;
  for wanted in
    select w.* from public.wanted_items w
    where w.matched_at is null
      and (
        w.barcode in (select v.barcode from public.product_variants v where v.product_id = new.id and v.barcode is not null)
        or (w.external_ids <> '{}'::jsonb and new.external_ids @> w.external_ids)
        or private.normalize_search(w.title) = private.normalize_search(new.name_en)
      )
  loop
    if private.match_product(wanted.kind, wanted.title, wanted.creator, wanted.barcode, wanted.external_ids) = new.id then
      update public.wanted_items set product_id = new.id, matched_at = now() where id = wanted.id;
      insert into public.wishlist_items (user_id, product_id, list_id, notify)
      values (wanted.user_id, new.id, wanted.list_id, true)
      on conflict do nothing;
      perform private.notify(
        wanted.user_id, 'system', 'wanted_in_store',
        jsonb_build_object('name_en', new.name_en, 'name_ar', new.name_ar),
        '/store/' || new.slug
      );
    end if;
  end loop;
  return null;
end;
$$;

create trigger match_wanted_items
  after insert or update of status on public.products
  for each row execute function private.match_wanted_items();

-- ── Music tastes ───────────────────────────────────────────────────────────

create table public.music_tastes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('spotify', 'lastfm')),
  -- The Spotify display name or the Last.fm username.
  account text not null check (char_length(account) between 1 and 100),
  -- Folded artist names, most listened first.
  artists text[] not null default '{}' check (cardinality(artists) <= 200),
  updated_at timestamptz not null default now()
);

comment on table public.music_tastes is
  'The artists a member listens to, from Spotify or Last.fm (written by the API), for "Vinyl from artists you listen to".';

alter table public.music_tastes enable row level security;

create policy "Members see their music connection" on public.music_tastes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members disconnect their music" on public.music_tastes
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.music_tastes from anon, authenticated;
grant select, delete on public.music_tastes to authenticated;

create table private.music_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

comment on table private.music_tokens is
  'Spotify refresh tokens, to update a member''s artists (service role only).';

alter table private.music_tokens enable row level security;

create policy "No client access" on private.music_tokens
  as restrictive for all to anon, authenticated
  using (false);

-- Disconnecting forgets the token too.
create function private.forget_music_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.music_tokens t where t.user_id = old.user_id;
  return null;
end;
$$;

create trigger forget_music_token
  after delete on public.music_tastes
  for each row execute function private.forget_music_token();

-- Saves what the API read from Spotify or Last.fm (service role).
create function public.save_music_taste(
  member uuid,
  provider text,
  account text,
  artists text[],
  refresh_token text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into public.music_tastes (user_id, provider, account, artists, updated_at)
  values (
    member, provider, left(account, 100),
    (select coalesce(array_agg(a order by n), '{}') from (
      select distinct on (private.normalize_search(x)) private.normalize_search(x) as a, n
      from unnest(artists) with ordinality as t (x, n)
      where private.normalize_search(x) <> ''
      order by private.normalize_search(x), n
    ) folded where n <= 200),
    now()
  )
  on conflict on constraint music_tastes_pkey do update
    set provider = excluded.provider, account = excluded.account,
        artists = excluded.artists, updated_at = now();
  if refresh_token is not null then
    insert into private.music_tokens (user_id, refresh_token)
    values (member, refresh_token)
    on conflict on constraint music_tokens_pkey do update
      set refresh_token = excluded.refresh_token, updated_at = now();
  end if;
end;
$$;

comment on function public.save_music_taste(uuid, text, text, text[], text) is
  'Saves a member''s artists from Spotify or Last.fm (and Spotify''s refresh token); the API only.';

-- The connections due for a refresh (oldest first), with Spotify's token.
create function public.music_tastes_to_refresh(batch integer default 50)
returns table (user_id uuid, provider text, account text, refresh_token text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, m.provider, m.account, t.refresh_token
  from public.music_tastes m
  left join private.music_tokens t on t.user_id = m.user_id
  where m.updated_at < now() - interval '7 days'
  order by m.updated_at
  limit least(greatest(coalesce(batch, 50), 1), 200)
$$;

-- The Store's vinyl by the caller's artists, most listened first.
create function private.vinyl_from_my_artists(max_items integer default 24)
returns table (product_id uuid, artist text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id) p.id, a.artist
  from public.music_tastes m
  cross join lateral unnest(m.artists) with ordinality as a (artist, rank)
  join public.products p
    on private.normalize_search(p.details ->> 'Artist') = a.artist
  join public.product_variants v on v.product_id = p.id
  where m.user_id = (select auth.uid())
    and p.status = 'active'
    and v.active
    and lower(v.attributes ->> 'Format') = 'vinyl'
  order by p.id, a.rank
  limit least(greatest(coalesce(max_items, 24), 1), 100)
$$;

create function public.vinyl_from_my_artists(max_items integer default 24)
returns table (product_id uuid, artist text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.vinyl_from_my_artists(max_items) $$;

comment on function public.vinyl_from_my_artists(integer) is
  'The Store''s vinyl by the artists the caller listens to (Spotify or Last.fm).';

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.match_product(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.match_wanted_items() from public, anon, authenticated;
revoke all on function private.forget_music_token() from public, anon, authenticated;

revoke all on function private.import_list_items(uuid, jsonb) from public, anon;
grant execute on function private.import_list_items(uuid, jsonb) to authenticated;
revoke all on function public.import_list_items(uuid, jsonb) from public, anon;
grant execute on function public.import_list_items(uuid, jsonb) to authenticated;

revoke all on function public.save_music_taste(uuid, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.save_music_taste(uuid, text, text, text[], text) to service_role;
revoke all on function public.music_tastes_to_refresh(integer) from public, anon, authenticated;
grant execute on function public.music_tastes_to_refresh(integer) to service_role;

revoke all on function private.vinyl_from_my_artists(integer) from public, anon;
grant execute on function private.vinyl_from_my_artists(integer) to authenticated;
revoke all on function public.vinyl_from_my_artists(integer) from public, anon;
grant execute on function public.vinyl_from_my_artists(integer) to authenticated;
