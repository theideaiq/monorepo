-- Arabic names (the owner's amendment of 30 October 2026 to the 28 October
-- brief, section 23): Arabic copy uses the official Arabic names (ايديا،
-- السوگ، الپلص، الپاس، النادي، الشركاء، الگلوبات), written with پ and گ.
--
-- 1. Search folds the letters people type for these interchangeably, in
--    `private.normalize_search`, the one function used for both the index
--    and the query: ب/پ, ك/ق/گ/ک, ا/أ/إ/آ and ي/ی/ى (with ة → ه and the
--    tashkeel and tatweel it already dropped). So "بلص" finds "پلص",
--    "سوق" and "سوک" find "سوگ", "أيديا" finds "ايديا".
-- 2. The products' search index is rebuilt with it.
-- 3. The plans' Arabic names and features use the Arabic names (the plan
--    names Glow, Shine and Blaze stay in Latin letters).

create or replace function private.normalize_search(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(
      -- Tashkeel (fathatan … sukun, Quranic marks), superscript alef, tatweel.
      regexp_replace(lower(coalesce(input, '')), '[ً-ٰٟـ]', '', 'g'),
      'أإآىیةپقگک',
      'اااييهبككك'
    ),
    '\s+', ' ', 'g'
  ));
$$;

comment on function private.normalize_search(text) is
  'Folds text for search, for both the index and the query: lower case, Arabic without tashkeel/tatweel, أ إ آ → ا, ى ی → ي, ة → ه, پ → ب, ق گ ک → ك.';

-- The expression index holds folded text; fold it again with the new rules.
reindex index public.products_search_idx;

-- ── The plans ──────────────────────────────────────────────────────────────

update public.plans set
  features_ar = array(
    select replace(replace(f, '% Bulbs', '% گلوبات'), 'أسعار Plus', 'أسعار الپلص')
    from unnest(features_ar) with ordinality as x (f, n)
    order by n
  )
where features_ar is not null
  and array_to_string(features_ar, '|') ~ '(Bulbs|Plus)';

update public.plans set name_ar = replace(name_ar, 'Plus ', 'ايديا پلص ')
where name_ar like 'Plus %';
