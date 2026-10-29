-- Catalog, part 1 (master brief section 11): subcategories and the new
-- categories.
--
-- * A category can sit under a top-level one (`parent_id`, one level
--   only): comics and manga, and textbooks, are under Books.
-- * New top-level categories: board games and tabletop (rentable, in Plus
--   too, at the games rate) and trading cards (for sale).
-- * A parent's filter and search include its subcategories; the store
--   lists a parent once it or a subcategory has something to show.
-- Digital codes come later (master brief section 15).

alter table public.product_categories
  add column parent_id uuid references public.product_categories (id) on delete restrict,
  add constraint product_categories_not_own_parent check (parent_id <> id);

create index product_categories_parent_idx on public.product_categories (parent_id);

comment on column public.product_categories.parent_id is
  'The top-level category this one sits under (one level only), or null for a top-level category.';

-- One level: a parent is top-level, and a category with subcategories
-- stays top-level.
create function private.check_category_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and (
    exists (
      select 1 from public.product_categories
      where id = new.parent_id and parent_id is not null
    )
    or exists (
      select 1 from public.product_categories where parent_id = new.id
    )
  ) then
    raise exception 'Subcategories are one level deep' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_category_parent
  before insert or update of parent_id on public.product_categories
  for each row execute function private.check_category_parent();

-- A category and its subcategories, by slug (empty for an unknown slug).
create function private.category_family(category_slug text)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  select c.id from public.product_categories c
  left join public.product_categories p on p.id = c.parent_id
  where c.slug = category_slug or p.slug = category_slug
$$;

-- ── New categories ─────────────────────────────────────────────────────────

insert into public.product_categories (slug, name_ar, name_en, position) values
  ('board-games', 'ألعاب الطاولة', 'Board games', 6),
  ('trading-cards', 'بطاقات التداول', 'Trading cards', 7)
on conflict (slug) do nothing;

insert into public.product_categories (slug, name_ar, name_en, position, parent_id)
select v.slug, v.name_ar, v.name_en, v.position, b.id
from (values
  ('comics-manga', 'القصص المصوّرة والمانغا', 'Comics & manga', 1),
  ('textbooks', 'الكتب الدراسية', 'Textbooks', 2)
) v (slug, name_ar, name_en, position)
cross join public.product_categories b
where b.slug = 'books'
on conflict (slug) do nothing;

-- Board games rent at the games rate; subcategories of Books at the books
-- rate. Finance changes them in Staff.
insert into public.rental_rates (category_id, price, days, late_fee)
select c.id, r.price, r.days, r.late_fee
from public.product_categories c
join public.product_categories source
  on source.slug = case c.slug when 'board-games' then 'games' else 'books' end
join public.rental_rates r on r.category_id = source.id
where c.slug in ('board-games', 'comics-manga', 'textbooks')
on conflict (category_id) do nothing;

-- Board games take the games commission (for categories added later too);
-- subcategories take their parent's.
create or replace function private.default_commission(slug text, pro boolean)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when slug in ('games', 'board-games') then case when pro then 0.08 else 0.10 end
    when slug = 'gear' then case when pro then 0.07 else 0.09 end
    else case when pro then 0.10 else 0.12 end
  end
$$;

update public.commission_rates cr
set standard_rate = private.default_commission('board-games', false),
  pro_rate = private.default_commission('board-games', true)
from public.product_categories c
where cr.category_id = c.id and c.slug = 'board-games';

update public.commission_rates cr
set standard_rate = parent.standard_rate, pro_rate = parent.pro_rate
from public.product_categories c
join public.commission_rates parent on parent.category_id = c.parent_id
where cr.category_id = c.id;

-- ── Listings and search ────────────────────────────────────────────────────

-- The categories a tab lists, in their order: those with active products
-- for sale (or for rent), and the parent of any such subcategory.
create or replace function public.listed_categories(for_rent boolean default false)
returns setof public.product_categories
language sql
stable
security invoker
set search_path = ''
as $$
  with shown as (
    select c.id, c.parent_id from public.product_categories c
    where exists (
      select 1 from public.products p
      where p.category_id = c.id and p.status = 'active'
        and case when for_rent then p.rentable else p.kind = 'sale' end
    )
  )
  select c.* from public.product_categories c
  where c.id in (select id from shown union select parent_id from shown)
  order by c.position, c.name_en;
$$;

comment on function public.listed_categories(boolean) is
  'The categories with active products for sale (default) or for rent, and the parents of such subcategories, in their order.';

-- Search by tab; a category includes its subcategories.
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
    and (
      search_category is null
      or p.category_id in (select private.category_family(search_category))
    )
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
