-- Catalog tools: store search in Arabic and English, and the back office's
-- spreadsheet import.
--
-- 1. Search. `private.normalize_search` folds text the way people type it:
--    lower case, no tashkeel or tatweel, أ إ آ → ا, ى → ي, ة → ه.
--    `private.product_search_text` is that, applied to a product's names,
--    specification values (artist, author, platform, …) and descriptions; a
--    trigram index (pg_trgm, in the `extensions` schema) covers it.
--    `public.search_products` runs as the caller, so Row Level Security
--    applies, returns live products only and ranks exact names first, then
--    names starting with the term, names containing it, products containing
--    every word, then by trigram word similarity. The website, the app and
--    The IDEA Droid call it through `listProducts` in packages/commerce.
-- 2. Import. `public.import_products(items)` upserts up to 500 products by
--    slug in one transaction, for catalog staff (admin role, AAL2). Each
--    item sets only the fields it contains, so blank cells in the sheet
--    never overwrite what is there; `details` keys are merged.

create extension if not exists pg_trgm with schema extensions;

-- ── 1. Search ───────────────────────────────────────────────────────────────

create function private.normalize_search(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(
      -- Tashkeel (fathatan … sukun, Quranic marks), superscript alef, tatweel.
      regexp_replace(lower(coalesce(input, '')), '[ً-ٰٟـ]', '', 'g'),
      'أإآىة',
      'ااايه'
    ),
    '\s+', ' ', 'g'
  ));
$$;

comment on function private.normalize_search(text) is
  'Folds text for search: lower case, Arabic without tashkeel/tatweel, أ إ آ → ا, ى → ي, ة → ه.';

create function private.product_search_text(
  name_ar text,
  name_en text,
  description_ar text,
  description_en text,
  details jsonb
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select private.normalize_search(
    coalesce(name_en, '') || ' ' || coalesce(name_ar, '') || ' '
    || coalesce(
      (select string_agg(d.value, ' ') from jsonb_each_text(
        case when jsonb_typeof(details) = 'object' then details else '{}'::jsonb end
      ) d),
      ''
    ) || ' '
    || coalesce(description_en, '') || ' ' || coalesce(description_ar, '')
  );
$$;

create index products_search_idx on public.products using gin (
  private.product_search_text(name_ar, name_en, description_ar, description_en, details)
  extensions.gin_trgm_ops
);

create function public.search_products(
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
        p.name_ar, p.name_en, p.description_ar, p.description_en, p.details
      ) as doc,
      private.normalize_search(p.name_en) as en,
      private.normalize_search(p.name_ar) as ar
  ) s
  where t.q <> ''
    and p.status = 'active'
    and (search_kind is null or p.kind = search_kind)
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

comment on function public.search_products(text, public.product_kind, text) is
  'Live products matching a search in Arabic or English, best matches first. Runs as the caller (RLS applies).';

revoke all on function private.normalize_search(text) from public;
revoke all on function private.product_search_text(text, text, text, text, jsonb) from public;
grant execute on function private.normalize_search(text) to anon, authenticated, service_role;
grant execute on function private.product_search_text(text, text, text, text, jsonb)
  to anon, authenticated, service_role;

revoke all on function public.search_products(text, public.product_kind, text)
  from public, anon, authenticated, service_role;
grant execute on function public.search_products(text, public.product_kind, text)
  to anon, authenticated, service_role;

-- ── 2. Import ───────────────────────────────────────────────────────────────

create function private.import_products(items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item jsonb;
  target uuid;
  category uuid;
  inserted_count integer := 0;
  updated_count integer := 0;
begin
  -- The same check as the products policies: catalog staff (admins and
  -- superadmins) on an authenticator-app session.
  if not private.has_staff_role('{admin}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 500 then
    raise exception 'Expected an array of at most 500 products'
      using errcode = 'invalid_parameter_value';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or coalesce(item ->> 'slug', '') = ''
      or (item ? 'details' and jsonb_typeof(item -> 'details') is distinct from 'object')
      or (item ? 'images' and jsonb_typeof(item -> 'images') is distinct from 'array')
    then
      raise exception 'Invalid product' using errcode = 'invalid_parameter_value';
    end if;

    category := null;
    if item ? 'category' then
      select c.id into category
      from public.product_categories c
      where c.slug = item ->> 'category';
      if category is null then
        raise exception 'Unknown category %', item ->> 'category'
          using errcode = 'foreign_key_violation';
      end if;
    end if;

    select p.id into target
    from public.products p
    where p.slug = item ->> 'slug'
    for update;

    if target is null then
      insert into public.products (
        slug, kind, status, category_id, name_ar, name_en,
        description_ar, description_en, price, compare_at_price,
        condition, stock_count, images, details
      ) values (
        item ->> 'slug',
        coalesce((item ->> 'kind')::public.product_kind, 'sale'),
        coalesce((item ->> 'status')::public.product_status, 'draft'),
        category,
        item ->> 'name_ar',
        item ->> 'name_en',
        item ->> 'description_ar',
        item ->> 'description_en',
        (item ->> 'price')::bigint,
        (item ->> 'compare_at_price')::bigint,
        coalesce((item ->> 'condition')::public.product_condition, 'new'),
        coalesce((item ->> 'stock_count')::integer, 0),
        array(select jsonb_array_elements_text(item -> 'images')),
        coalesce(item -> 'details', '{}'::jsonb)
      );
      inserted_count := inserted_count + 1;
    else
      update public.products p set
        kind = coalesce((item ->> 'kind')::public.product_kind, p.kind),
        status = coalesce((item ->> 'status')::public.product_status, p.status),
        category_id = case when item ? 'category' then category else p.category_id end,
        name_ar = coalesce(item ->> 'name_ar', p.name_ar),
        name_en = coalesce(item ->> 'name_en', p.name_en),
        description_ar = coalesce(item ->> 'description_ar', p.description_ar),
        description_en = coalesce(item ->> 'description_en', p.description_en),
        price = coalesce((item ->> 'price')::bigint, p.price),
        compare_at_price = coalesce((item ->> 'compare_at_price')::bigint, p.compare_at_price),
        condition = coalesce((item ->> 'condition')::public.product_condition, p.condition),
        stock_count = coalesce((item ->> 'stock_count')::integer, p.stock_count),
        images = case
          when item ? 'images' then array(select jsonb_array_elements_text(item -> 'images'))
          else p.images
        end,
        details = p.details || coalesce(item -> 'details', '{}'::jsonb)
      where p.id = target;
      updated_count := updated_count + 1;
    end if;
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count);
end;
$$;

create function public.import_products(items jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$ select private.import_products($1) $$;

comment on function public.import_products(jsonb) is
  'Upserts up to 500 products by slug (catalog staff only). Fields missing from an item keep their value; details are merged.';

revoke all on function private.import_products(jsonb) from public, anon;
grant execute on function private.import_products(jsonb) to authenticated, service_role;

revoke all on function public.import_products(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.import_products(jsonb) to authenticated;
grant execute on function public.import_products(jsonb) to service_role;
